# Somnia Predict — AI Powered 5-Minute Prediction Market

A decentralized AI-powered prediction market built on Somnia where users predict whether an asset price will go **UP** or **DOWN** within 5-minute rounds.

Built using:

- ⚡ Somnia Network
- 🤖 Somnia AI Agents
- 📈 AI-based market settlement
- 💰 Automated reward distribution
- 🎮 Gamified trading experience

---

# Overview

Somnia Predict is inspired by prediction markets like PancakeSwap Prediction but enhanced with:

- AI-powered settlement
- Whale tracking
- Smart risk analysis
- Real-time prediction insights
- Ultra-fast execution on Somnia

Users simply:

1. Select a market
2. Predict UP or DOWN
3. Place a bet
4. Wait for round settlement
5. Claim rewards if correct

---

# Features

## Core Prediction Engine

- 5-minute rolling prediction rounds
- Multiple asset markets
- Automated payouts
- Real-time odds
- Dynamic reward multipliers
- Treasury fee system
- Refund support
- Market factory architecture

---

# AI-Powered Somnia Agents

## Sentiment Analysis Agent

Analyzes:

- Twitter/X
- Crypto news
- Market trends
- Social sentiment

Returns:

```json
{
  "market": "BTC",
  "sentiment": "Bullish",
  "confidence": 82
}
```

---

## Whale Activity Agent

Tracks:

- Large buys/sells
- Exchange inflows
- Whale wallets
- Smart money activity

---

## Market Summary Agent

Provides AI-generated market summaries:

```text
BTC momentum remains bullish due to ETF inflows and whale accumulation.
```

---

## Risk Analysis Agent

Warns users about:

- High volatility
- Potential manipulation
- Extreme market movements

---

# How It Works

```text
┌─────────────┐
│   Users     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Prediction  │
│   Market    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Somnia AI   │
│   Platform  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Validators  │
│ Consensus   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ CoinGecko   │
│ Price Data  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Settlement  │
│ & Rewards   │
└─────────────┘
```

---

# Prediction Flow

## 1. Betting Phase

Duration: 5 minutes

Users can:

- Predict UP or DOWN
- Place bets
- View AI insights
- Track live odds

---

## 2. Lock Phase

- Betting disabled
- Lock price requested using Somnia Agents
- Validators reach consensus

---

## 3. Settlement Phase

Somnia validators fetch the closing price.

Rules:

```text
Close Price > Lock Price → UP Wins
Close Price < Lock Price → DOWN Wins
Equal → House Wins
```

Rewards are automatically calculated.

---

# Supported Markets

Initial Markets:

- BTC/USD
- ETH/USD
- SOMNIA/USD
- SOL/USD

Future Markets:

- Meme Coins
- AI Tokens
- Community-created markets
- Custom prediction rooms

---

# Smart Contract Architecture

## Contracts

### PredictionMarket.sol

Core prediction engine.

Responsibilities:

- Manage rounds
- Store predictions
- Calculate rewards
- Handle claims
- Integrate Somnia AI Agents

Functions:

```solidity
betUp()
betDown()
startRound()
requestLockPrice()
requestClosePrice()
handleResponse()
claim()
claimTreasury()
cancelRound()
```

---

### PredictionMarketFactory.sol

Factory contract for deploying new prediction markets.

Responsibilities:

- Create new markets
- Store deployed market info
- Treasury management
- Market management

Functions:

```solidity
createMarket()
getAllMarkets()
getMarketInfo()
updateMarketStatus()
```

---

# Somnia Agents Integration

Somnia Predict uses Somnia Agents for:

| Agent | Purpose |
|---|---|
| JSON API Request | Fetch live crypto prices |
| LLM Inference | AI market analysis |
| Website Parsing | News & social extraction |

---

# AI Settlement Flow

## Lock Price Request

```text
PredictionMarket
      │
      ▼
Somnia Platform
      │
      ▼
Validators Fetch CoinGecko Price
      │
      ▼
Consensus Reached
      │
      ▼
handleResponse()
      │
      ▼
lockPrice Stored
```

---

## Close Price Request

```text
PredictionMarket
      │
      ▼
Somnia Platform
      │
      ▼
Validators Fetch Latest Price
      │
      ▼
Consensus Reached
      │
      ▼
handleResponse()
      │
      ▼
closePrice Stored
      │
      ▼
Rewards Calculated
```

---

# Reward Calculation

## Winning Logic

```text
UP Wins:
closePrice > lockPrice

DOWN Wins:
closePrice < lockPrice
```

---

## Reward Formula

```text
Reward Pool =
Total Pool - Treasury Fee
```

Example:

```text
Total Pool = 100 STT
Treasury Fee = 3%
Reward Pool = 97 STT
```

---

# Market Lifecycle

## 1. Create Market

Owner deploys new market:

```bash
npx hardhat run scripts/deploy/create-market.ts --network somniaTestnet
```

---

## 2. Start Round

```bash
npx hardhat run scripts/prediction/start-round.ts --network somniaTestnet
```

---

## 3. Place Bets

### UP Bet

```bash
EPOCH=1 BET_AMOUNT_ETH=0.1 \
npx hardhat run scripts/prediction/bet-up.ts --network somniaTestnet
```

### DOWN Bet

```bash
EPOCH=1 BET_AMOUNT_ETH=0.1 \
npx hardhat run scripts/prediction/bet-down.ts --network somniaTestnet
```

---

## 4. Request Lock Price

```bash
EPOCH=1 REQUEST_VALUE_ETH=0.12 \
npx hardhat run scripts/prediction/request-lock-price.ts --network somniaTestnet
```

---

## 5. Request Close Price

```bash
EPOCH=1 REQUEST_VALUE_ETH=0.12 \
npx hardhat run scripts/prediction/request-close-price.ts --network somniaTestnet
```

---

## 6. Claim Rewards

```bash
EPOCH=1 \
npx hardhat run scripts/prediction/claim.ts --network somniaTestnet
```

---

# Project Structure

```bash
5-minute-somnia/
├── contracts/
│   ├── PredictionMarket.sol
│   ├── PredictionMarketFactory.sol
│   └── interfaces/
│
├── scripts/
│   ├── deploy/
│   └── prediction/
│
├── deployments/
│
├── test/
│
├── hardhat.config.ts
└── README.md
```

---

# Security

## Smart Contract Security

- Reentrancy guards
- Owner-only controls
- Refund mechanisms
- Emergency cancellation
- Treasury protection

---

## AI Protection

- Validator consensus
- Decentralized execution
- Request verification
- Price integrity checks

---

# Future Roadmap

## Phase 1

- Core prediction markets
- Somnia Agent integration
- Multi-market support

---

## Phase 2

- AI sentiment dashboards
- Whale tracking
- Leaderboards

---

## Phase 3

- AI auto-predict vaults
- Social prediction rooms
- Copy prediction system

---

## Phase 4

- Cross-chain prediction markets
- AI vs Human battles
- Prediction NFTs

---

# Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js |
| Smart Contracts | Solidity |
| Backend | Node.js |
| AI Layer | Somnia Agents |
| Charts | TradingView |
| Wallets | Wagmi + RainbowKit |
| Indexing | The Graph |

---

# Vision

Somnia Predict aims to become the next generation AI-powered prediction market by combining:

- Prediction trading
- AI intelligence
- Gamification
- Social finance
- Real-time analytics
- Ultra-fast blockchain infrastructure

Built for the future of decentralized speculative markets on Somnia 🚀