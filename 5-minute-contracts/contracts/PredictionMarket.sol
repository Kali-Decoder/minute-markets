// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
=============================================================
                SOMNIA PREDICTION MARKET
=============================================================

Features:
- 5 minute prediction rounds
- UP / DOWN betting
- AI Resolver Integration
- Somnia Agents settlement
- Automatic lock/close price resolution
- Treasury fee
- Reward claiming
- Cancelled round refunds

=============================================================
*/

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IPriceResolver {
    function requestPrice(
        string calldata coinId
    ) external payable returns (uint256);
}

contract PredictionMarket is
    Ownable,
    ReentrancyGuard,
    Pausable
{
    // =============================================================
    //                           ENUMS
    // =============================================================

    enum Position {
        UP,
        DOWN
    }

    enum RoundStatus {
        LIVE,
        LOCKED,
        ENDED,
        CANCELLED
    }

    // =============================================================
    //                           STRUCTS
    // =============================================================

    struct Round {
        uint256 epoch;

        uint256 startTimestamp;
        uint256 lockTimestamp;
        uint256 closeTimestamp;

        uint256 lockPrice;
        uint256 closePrice;

        uint256 totalPool;
        uint256 upPool;
        uint256 downPool;

        uint256 rewardAmount;
        uint256 treasuryAmount;

        bool upWon;

        RoundStatus status;
    }

    struct BetInfo {
        Position position;
        uint256 amount;
        bool claimed;
    }

    // =============================================================
    //                           STORAGE
    // =============================================================

    string public marketName;

    string public marketSymbol;

    string public coinId;

    address public treasury;

    address public factory;

    address public resolver;

    uint256 public currentEpoch;

    uint256 public treasuryFee = 300; // 3%

    uint256 public minBetAmount =
        0.01 ether;

    uint256 public roundInterval =
        5 minutes;

    uint256 public totalTreasury;

    // =============================================================
    //                     REQUEST TRACKING
    // =============================================================

    mapping(uint256 => uint256)
        public requestToEpoch;

    mapping(uint256 => bool)
        public requestIsLock;

    // =============================================================
    //                           STORAGE
    // =============================================================

    mapping(uint256 => Round) public rounds;

    mapping(uint256 => mapping(address => BetInfo))
        public ledger;

    // =============================================================
    //                           EVENTS
    // =============================================================

    event RoundStarted(
        uint256 indexed epoch
    );

    event LockPriceRequested(
        uint256 indexed epoch,
        uint256 requestId
    );

    event ClosePriceRequested(
        uint256 indexed epoch,
        uint256 requestId
    );

    event RoundLocked(
        uint256 indexed epoch,
        uint256 lockPrice
    );

    event RoundEnded(
        uint256 indexed epoch,
        uint256 closePrice,
        bool upWon
    );

    event BetPlaced(
        address indexed user,
        uint256 indexed epoch,
        Position position,
        uint256 amount
    );

    event RewardsClaimed(
        address indexed user,
        uint256 amount
    );

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    constructor(
        string memory _marketName,
        string memory _marketSymbol,
        string memory _coinId,
        address _owner,
        address _treasury,
        address _resolver
    ) Ownable(_owner) {
        marketName = _marketName;
        marketSymbol = _marketSymbol;
        coinId = _coinId;
        treasury = _treasury;
        resolver = _resolver;
        factory = msg.sender;
    }

    // =============================================================
    //                     ROUND MANAGEMENT
    // =============================================================

    function startRound()
        external
        onlyOwner
    {
        currentEpoch++;

        Round storage round = rounds[
            currentEpoch
        ];

        round.epoch = currentEpoch;

        round.startTimestamp = block.timestamp;

        round.lockTimestamp =
            block.timestamp +
            roundInterval;

        round.closeTimestamp =
            block.timestamp +
            (roundInterval * 2);

        round.status = RoundStatus.LIVE;

        emit RoundStarted(currentEpoch);
    }

    // =============================================================
    //                 REQUEST LOCK PRICE
    // =============================================================

    function requestLockPrice(
        uint256 epoch
    ) external payable onlyOwner {
        Round storage round = rounds[
            epoch
        ];

        require(
            round.status ==
                RoundStatus.LIVE,
            "Round not live"
        );

        uint256 requestId = IPriceResolver(
            resolver
        ).requestPrice{value: msg.value}(
                coinId
            );

        requestToEpoch[
            requestId
        ] = epoch;

        requestIsLock[
            requestId
        ] = true;

        emit LockPriceRequested(
            epoch,
            requestId
        );
    }

    // =============================================================
    //                 REQUEST CLOSE PRICE
    // =============================================================

    function requestClosePrice(
        uint256 epoch
    ) external payable onlyOwner {
        Round storage round = rounds[
            epoch
        ];

        require(
            round.status ==
                RoundStatus.LOCKED,
            "Round not locked"
        );

        uint256 requestId = IPriceResolver(
            resolver
        ).requestPrice{value: msg.value}(
                coinId
            );

        requestToEpoch[
            requestId
        ] = epoch;

        requestIsLock[
            requestId
        ] = false;

        emit ClosePriceRequested(
            epoch,
            requestId
        );
    }

    // =============================================================
    //                  HANDLE AI RESPONSE
    // =============================================================

    /*
        Resolver backend calls this
        after Somnia Agent consensus
    */

    function handlePriceResponse(
        uint256 requestId,
        uint256 price
    ) external {
        require(
            msg.sender == resolver,
            "Only resolver"
        );

        uint256 epoch = requestToEpoch[
            requestId
        ];

        Round storage round = rounds[
            epoch
        ];

        // =========================================================
        // LOCK PRICE
        // =========================================================

        if (
            requestIsLock[requestId]
        ) {
            round.lockPrice = price;

            round.status = RoundStatus
                .LOCKED;

            emit RoundLocked(
                epoch,
                price
            );
        }

        // =========================================================
        // CLOSE PRICE
        // =========================================================

        else {
            round.closePrice = price;

            round.status = RoundStatus
                .ENDED;

            if (
                price > round.lockPrice
            ) {
                round.upWon = true;
            } else {
                round.upWon = false;
            }

            _calculateRewards(epoch);

            emit RoundEnded(
                epoch,
                price,
                round.upWon
            );
        }

        delete requestToEpoch[
            requestId
        ];

        delete requestIsLock[
            requestId
        ];
    }

    // =============================================================
    //                           BETTING
    // =============================================================

    function betUp(uint256 epoch)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        _bet(epoch, Position.UP);
    }

    function betDown(uint256 epoch)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        _bet(epoch, Position.DOWN);
    }

    function _bet(
        uint256 epoch,
        Position position
    ) internal {
        require(
            msg.value >= minBetAmount,
            "Bet too low"
        );

        Round storage round = rounds[
            epoch
        ];

        require(
            round.status ==
                RoundStatus.LIVE,
            "Round not live"
        );

        require(
            block.timestamp <
                round.lockTimestamp,
            "Round locked"
        );

        BetInfo storage bet = ledger[
            epoch
        ][msg.sender];

        require(
            bet.amount == 0,
            "Already bet"
        );

        bet.position = position;

        bet.amount = msg.value;

        round.totalPool += msg.value;

        if (position == Position.UP) {
            round.upPool += msg.value;
        } else {
            round.downPool += msg.value;
        }

        emit BetPlaced(
            msg.sender,
            epoch,
            position,
            msg.value
        );
    }

    // =============================================================
    //                    REWARD CALCULATION
    // =============================================================

    function _calculateRewards(
        uint256 epoch
    ) internal {
        Round storage round = rounds[
            epoch
        ];

        uint256 treasuryAmount = (round
            .totalPool * treasuryFee) /
            10000;

        round.treasuryAmount = treasuryAmount;

        totalTreasury += treasuryAmount;

        round.rewardAmount =
            round.totalPool -
            treasuryAmount;
    }

    // =============================================================
    //                            CLAIM
    // =============================================================

    function claim(
        uint256[] calldata epochs
    ) external nonReentrant {
        uint256 totalClaim;

        for (
            uint256 i = 0;
            i < epochs.length;
            i++
        ) {
            uint256 epoch = epochs[i];

            Round memory round = rounds[
                epoch
            ];

            BetInfo storage bet = ledger[
                epoch
            ][msg.sender];

            require(
                !bet.claimed,
                "Already claimed"
            );

            require(
                round.status ==
                    RoundStatus.ENDED ||
                    round.status ==
                    RoundStatus.CANCELLED,
                "Round not ended"
            );

            uint256 reward;

            // =====================================================
            // CANCELLED ROUND
            // =====================================================

            if (
                round.status ==
                RoundStatus.CANCELLED
            ) {
                reward = bet.amount;
            }

            // =====================================================
            // WINNING REWARD
            // =====================================================

            else {
                bool won;

                if (
                    round.upWon &&
                    bet.position ==
                    Position.UP
                ) {
                    won = true;
                }

                if (
                    !round.upWon &&
                    bet.position ==
                    Position.DOWN
                ) {
                    won = true;
                }

                if (won) {
                    uint256 winnerPool = round
                        .upWon
                        ? round.upPool
                        : round.downPool;

                    reward =
                        (bet.amount *
                            round
                                .rewardAmount) /
                        winnerPool;
                }
            }

            bet.claimed = true;

            totalClaim += reward;
        }

        require(
            totalClaim > 0,
            "No rewards"
        );

        payable(msg.sender).transfer(
            totalClaim
        );

        emit RewardsClaimed(
            msg.sender,
            totalClaim
        );
    }

    // =============================================================
    //                         ADMIN
    // =============================================================

    function cancelRound(
        uint256 epoch
    ) external onlyOwner {
        rounds[epoch].status = RoundStatus
            .CANCELLED;
    }

    function claimTreasury()
        external
        onlyOwner
    {
        uint256 amount = totalTreasury;

        totalTreasury = 0;

        payable(treasury).transfer(
            amount
        );
    }

    function setTreasuryFee(
        uint256 _fee
    ) external onlyOwner {
        require(
            _fee <= 1000,
            "Max 10%"
        );

        treasuryFee = _fee;
    }

    function setMinBetAmount(
        uint256 _amount
    ) external onlyOwner {
        minBetAmount = _amount;
    }

    function setResolver(
        address _resolver
    ) external onlyOwner {
        resolver = _resolver;
    }

    function setTreasury(
        address _treasury
    ) external onlyOwner {
        treasury = _treasury;
    }

    function setRoundInterval(
        uint256 _interval
    ) external onlyOwner {
        roundInterval = _interval;
    }

    function pause()
        external
        onlyOwner
    {
        _pause();
    }

    function unpause()
        external
        onlyOwner
    {
        _unpause();
    }

    // =============================================================
    //                         GETTERS
    // =============================================================

    function getRound(
        uint256 epoch
    )
        external
        view
        returns (Round memory)
    {
        return rounds[epoch];
    }

    function getUserBet(
        uint256 epoch,
        address user
    )
        external
        view
        returns (BetInfo memory)
    {
        return ledger[epoch][user];
    }

    function getCurrentRound()
        external
        view
        returns (Round memory)
    {
        return rounds[currentEpoch];
    }

    function getContractBalance()
        external
        view
        returns (uint256)
    {
        return address(this).balance;
    }

    receive() external payable {}
}