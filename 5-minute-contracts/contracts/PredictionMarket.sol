// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
=============================================================
                SOMNIA PREDICTION MARKET
=============================================================

Updated Architecture

Flow:
1. startRound()
    -> fetches lock price immediately

2. Somnia callback
    -> lockPrice stored
    -> round becomes LIVE

3. Users bet for 5 minutes

4. requestClosePrice()
    -> round becomes LOCKED

5. Somnia callback
    -> closePrice stored
    -> rewards calculated
    -> round ENDED

=============================================================
*/

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "./interfaces/ISomniaAgents.sol";

contract PredictionMarket is
    Ownable,
    ReentrancyGuard,
    Pausable
{
    // =============================================================
    //                       SOMNIA CONFIG
    // =============================================================

    IAgentRequester public constant PLATFORM =
        IAgentRequester(
            0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776
        );

    uint256 public constant JSON_API_AGENT_ID =
        13174292974160097713;

    uint256 public constant REQUEST_DEPOSIT =
        12e16; // 0.12 STT

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

    uint256 public currentEpoch;

    uint256 public treasuryFee = 300;

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

    mapping(uint256 => bool)
        public pendingRequests;

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

    event RoundLive(
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

    event RequestFailed(
        uint256 indexed requestId,
        ResponseStatus status
    );

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    constructor(
        string memory _marketName,
        string memory _marketSymbol,
        string memory _coinId,
        address _owner,
        address _treasury
    ) Ownable(_owner) {
        marketName = _marketName;

        marketSymbol = _marketSymbol;

        coinId = _coinId;

        treasury = _treasury;

        factory = msg.sender;
    }

    // =============================================================
    //                     START ROUND
    // =============================================================

    function startRound()
        external
        payable
        onlyOwner
    {
        require(
            msg.value >=
                REQUEST_DEPOSIT,
            "Insufficient deposit"
        );

        currentEpoch++;

        Round storage round = rounds[
            currentEpoch
        ];

        round.epoch = currentEpoch;

        round.startTimestamp =
            block.timestamp;

        round.closeTimestamp =
            block.timestamp +
            roundInterval;

        /*
            LOCKED until
            lock price arrives
        */

        round.status = RoundStatus
            .LOCKED;

        string memory url = string
            .concat(
                "https://api.coingecko.com/api/v3/simple/price?ids=",
                coinId,
                "&vs_currencies=usd"
            );

        string memory selector = string
            .concat(coinId, ".usd");

        bytes memory payload = abi
            .encodeWithSelector(
                IJsonApiAgent
                    .fetchUint
                    .selector,
                url,
                selector,
                uint8(8)
            );

        uint256 requestId = PLATFORM
            .createRequest{
            value: REQUEST_DEPOSIT
        }(
            JSON_API_AGENT_ID,
            address(this),
            this.handleResponse
                .selector,
            payload
        );

        requestToEpoch[
            requestId
        ] = currentEpoch;

        requestIsLock[
            requestId
        ] = true;

        pendingRequests[
            requestId
        ] = true;

        emit RoundStarted(
            currentEpoch
        );

        emit LockPriceRequested(
            currentEpoch,
            requestId
        );

        if (
            msg.value >
            REQUEST_DEPOSIT
        ) {
            payable(msg.sender)
                .transfer(
                    msg.value -
                        REQUEST_DEPOSIT
                );
        }
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

        // Lock price is requested during startRound() and the round stays LOCKED
        // until the Somnia callback stores lockPrice. Use lockPrice as the canonical
        // signal that the round is ready to close, instead of relying only on status.
        require(
            round.lockPrice != 0,
            "Round not locked"
        );

        require(
            round.closePrice == 0,
            "Round already closed"
        );

        require(
            msg.value >=
                REQUEST_DEPOSIT,
            "Insufficient deposit"
        );

        /*
            STOP BETTING
        */

        round.status = RoundStatus
            .LOCKED;

        string memory url = string
            .concat(
                "https://api.coingecko.com/api/v3/simple/price?ids=",
                coinId,
                "&vs_currencies=usd"
            );

        string memory selector = string
            .concat(coinId, ".usd");

        bytes memory payload = abi
            .encodeWithSelector(
                IJsonApiAgent
                    .fetchUint
                    .selector,
                url,
                selector,
                uint8(8)
            );

        uint256 requestId = PLATFORM
            .createRequest{
            value: REQUEST_DEPOSIT
        }(
            JSON_API_AGENT_ID,
            address(this),
            this.handleResponse
                .selector,
            payload
        );

        requestToEpoch[
            requestId
        ] = epoch;

        requestIsLock[
            requestId
        ] = false;

        pendingRequests[
            requestId
        ] = true;

        emit ClosePriceRequested(
            epoch,
            requestId
        );

        if (
            msg.value >
            REQUEST_DEPOSIT
        ) {
            payable(msg.sender)
                .transfer(
                    msg.value -
                        REQUEST_DEPOSIT
                );
        }
    }

    // =============================================================
    //                     SOMNIA CALLBACK
    // =============================================================

    function handleResponse(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory
    ) external {
        require(
            msg.sender ==
                address(PLATFORM),
            "Only platform"
        );

        require(
            pendingRequests[
                requestId
            ],
            "Unknown request"
        );

        delete pendingRequests[
            requestId
        ];

        if (
            status !=
            ResponseStatus.Success
        ) {
            emit RequestFailed(
                requestId,
                status
            );

            return;
        }

        uint256 epoch = requestToEpoch[
            requestId
        ];

        Round storage round = rounds[
            epoch
        ];

        uint256 price = abi.decode(
            responses[0].result,
            (uint256)
        );

        // =========================================================
        // LOCK PRICE RESPONSE
        // =========================================================

        if (
            requestIsLock[
                requestId
            ]
        ) {
            round.lockPrice = price;

            /*
                USERS CAN BET NOW
            */

            round.status = RoundStatus
                .LIVE;

            emit RoundLive(
                epoch,
                price
            );
        }

        // =========================================================
        // CLOSE PRICE RESPONSE
        // =========================================================

        else {
            round.closePrice = price;

            round.status = RoundStatus
                .ENDED;

            round.upWon =
                price >
                round.lockPrice;

            _calculateRewards(
                epoch
            );

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
            msg.value >=
                minBetAmount,
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
            block.timestamp <=
                round.closeTimestamp,
            "Round ended"
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
            .totalPool *
            treasuryFee) / 10000;

        round.treasuryAmount =
            treasuryAmount;

        totalTreasury +=
            treasuryAmount;

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
            uint256 epoch =
                epochs[i];

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
                    RoundStatus
                        .ENDED ||
                    round.status ==
                    RoundStatus
                        .CANCELLED,
                "Round not ended"
            );

            uint256 reward;

            if (
                round.status ==
                RoundStatus
                    .CANCELLED
            ) {
                reward = bet.amount;
            } else {
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
        rounds[epoch].status =
            RoundStatus.CANCELLED;
    }

    function claimTreasury()
        external
        onlyOwner
    {
        uint256 amount =
            totalTreasury;

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
        return rounds[
            currentEpoch
        ];
    }

    function getContractBalance()
        external
        view
        returns (uint256)
    {
        return address(this)
            .balance;
    }

    function getRequiredDeposit()
        external
        pure
        returns (uint256)
    {
        return REQUEST_DEPOSIT;
    }

    receive() external payable {}
}
