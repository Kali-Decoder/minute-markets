// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
=============================================================
            SOMNIA PREDICTION MARKET FACTORY
=============================================================

Features:
- Owner-only market creation
- Direct market deployment
- Somnia AI Resolver integration
- Market tracking
- Treasury management
- Active/inactive market management

=============================================================
*/

import "@openzeppelin/contracts/access/Ownable.sol";

import "./PredictionMarket.sol";

contract PredictionMarketFactory is
    Ownable(msg.sender)
{
    // =============================================================
    //                           STRUCTS
    // =============================================================

    struct MarketInfo {
        address marketAddress;

        string marketName;

        string marketSymbol;

        string coinId;

        address resolver;

        address creator;

        uint256 createdAt;

        bool active;
    }

    // =============================================================
    //                           STORAGE
    // =============================================================

    // Treasury wallet
    address public treasury;

    // AI Resolver contract
    address public resolver;

    // All deployed markets
    address[] public allMarkets;

    // Market info
    mapping(address => MarketInfo)
        public markets;

    // =============================================================
    //                           EVENTS
    // =============================================================

    event MarketCreated(
        address indexed market,
        string marketName,
        string marketSymbol,
        string coinId
    );

    event MarketStatusUpdated(
        address indexed market,
        bool active
    );

    event TreasuryUpdated(
        address treasury
    );

    event ResolverUpdated(
        address resolver
    );

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    constructor(
        address _treasury,
        address _resolver
    ) {
        require(
            _treasury != address(0),
            "Invalid treasury"
        );

        require(
            _resolver != address(0),
            "Invalid resolver"
        );

        treasury = _treasury;

        resolver = _resolver;
    }

    // =============================================================
    //                     CREATE MARKET
    // =============================================================

    /*
        ONLY OWNER CAN CREATE MARKETS

        Example:
        createMarket(
            "BTC/USD",
            "BTC",
            "bitcoin"
        );
    */

    function createMarket(
        string memory _marketName,
        string memory _marketSymbol,
        string memory _coinId
    )
        external
        onlyOwner
        returns (address)
    {
        require(
            bytes(_marketName).length >
                0,
            "Invalid market name"
        );

        require(
            bytes(_marketSymbol)
                .length > 0,
            "Invalid symbol"
        );

        require(
            bytes(_coinId).length > 0,
            "Invalid coin id"
        );

        // =========================================================
        // DEPLOY NEW MARKET
        // =========================================================

        PredictionMarket market = new PredictionMarket(
                _marketName,
                _marketSymbol,
                _coinId,
                owner(),
                treasury,
                resolver
            );

        address marketAddress = address(
            market
        );

        // =========================================================
        // STORE MARKET INFO
        // =========================================================

        markets[
            marketAddress
        ] = MarketInfo({
            marketAddress: marketAddress,
            marketName: _marketName,
            marketSymbol: _marketSymbol,
            coinId: _coinId,
            resolver: resolver,
            creator: owner(),
            createdAt: block.timestamp,
            active: true
        });

        allMarkets.push(marketAddress);

        emit MarketCreated(
            marketAddress,
            _marketName,
            _marketSymbol,
            _coinId
        );

        return marketAddress;
    }

    // =============================================================
    //                     UPDATE MARKET STATUS
    // =============================================================

    function updateMarketStatus(
        address market,
        bool active
    ) external onlyOwner {
        require(
            markets[market]
                .marketAddress !=
                address(0),
            "Market not found"
        );

        markets[market].active = active;

        emit MarketStatusUpdated(
            market,
            active
        );
    }

    // =============================================================
    //                     UPDATE TREASURY
    // =============================================================

    function setTreasury(
        address _treasury
    ) external onlyOwner {
        require(
            _treasury != address(0),
            "Invalid treasury"
        );

        treasury = _treasury;

        emit TreasuryUpdated(
            _treasury
        );
    }

    // =============================================================
    //                     UPDATE RESOLVER
    // =============================================================

    function setResolver(
        address _resolver
    ) external onlyOwner {
        require(
            _resolver != address(0),
            "Invalid resolver"
        );

        resolver = _resolver;

        emit ResolverUpdated(
            _resolver
        );
    }

    // =============================================================
    //                     GETTER FUNCTIONS
    // =============================================================

    function getAllMarkets()
        external
        view
        returns (address[] memory)
    {
        return allMarkets;
    }

    function totalMarkets()
        external
        view
        returns (uint256)
    {
        return allMarkets.length;
    }

    function getMarketInfo(
        address market
    )
        external
        view
        returns (MarketInfo memory)
    {
        return markets[market];
    }

    function isMarketActive(
        address market
    )
        external
        view
        returns (bool)
    {
        return markets[market].active;
    }
}