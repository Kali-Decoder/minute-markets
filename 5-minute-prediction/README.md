# MinuteMarkets — AI Powered 5-Minute Prediction Market

A decentralized AI-powered prediction market built on Somnia where users predict whether an asset price will go **UP** or **DOWN** within 5-minute rounds.

Built using:

- ⚡ Somnia Network
- 🤖 Somnia AI Agents
- 📈 Oracle-based settlement
- 💰 Automated reward distribution
- 🎮 Gamified trading experience

---

# Overview

MinuteMarkets is inspired by prediction markets like PancakeSwap Prediction but enhanced with:

- AI-powered sentiment analysis
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

---

## AI-Powered Somnia Agents

### Sentiment Analysis Agent

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

### Whale Activity Agent

Tracks:

- Large buys/sells
- Exchange inflows
- Whale wallets
- Smart money activity

---

### Market Summary Agent

Provides AI-generated market summaries:

```text
BTC momentum remains bullish due to ETF inflows and whale accumulation.
```

---

### Risk Analysis Agent

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
│   Oracle    │
│  Settlement │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Somnia AI   │
│   Agents    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Payouts &  │
│   Rewards   │
└─────────────┘
```

---

# Prediction Flow

## 1. Betting Phase

Duration: 4 minutes

Users can:

- Predict UP or DOWN
- Place bets
- View AI insights
- Track live odds

---

## 2. Lock Phase

Duration: 1 minute

- Betting disabled
- Lock price recorded
- Awaiting final settlement

---

## 3. Settlement Phase

Oracle fetches closing price.

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
- BNB/USD

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

Functions:

```solidity
betUp()
betDown()
startRound()
lockRound()
endRound()
claim()
refund()
```

---

### OracleManager.sol

Handles oracle integrations.

Supported Oracles:

- Chainlink
- Pyth
- RedStone

Responsibilities:

- Price fetching
- Freshness validation
- Oracle failover

---

### Treasury.sol

Manages:

- Platform fees
- Revenue distribution
- Buybacks
- Staking rewards

---

### AIInsightAgent.sol

Integrates Somnia Agents.

Provides:

- Sentiment analysis
- Whale tracking
- AI summaries
- Risk analysis

---

# Somnia Agents Integration

MinuteMarkets uses Somnia Agents for:

| Agent | Purpose |
|---|---|
| LLM Inference | AI market analysis |
| JSON API Request | External market data |
| Website Parsing | News & social extraction |

---

# Oracle Architecture

## Settlement Oracle

Used for final round settlement.

Requirements:

- Decentralized
- Manipulation-resistant
- High reliability

Primary Options:

- Chainlink
- Pyth

---

## Live Market Feed

Used for frontend charts only.

Sources:

- Binance
- TradingView
- CoinMarketCap

---

# Revenue Model

## Platform Fee

Example:

```text
3% fee per prediction round
```

Distribution:

| Allocation | Percentage |
|---|---|
| Treasury | 40% |
| Buybacks | 30% |
| Referrals | 10% |
| Staking Rewards | 20% |

---

# Gamification

## Features

- Daily streaks
- XP system
- NFT achievements
- Leaderboards
- Referral rewards
- Prediction ranks

---

# Security

## Oracle Protection

- Stale price checks
- Multiple oracle validation
- Max deviation protection

---

## Smart Contract Security

- Reentrancy guards
- Emergency pause
- Timelocks
- Multi-sig treasury

---

## Anti-Manipulation

- Betting cooldowns
- Max bet limits
- AI anomaly detection

---

# Future Roadmap

## Phase 1

- Core prediction markets
- Oracle integration
- AI sentiment engine

---

## Phase 2

- Leaderboards
- Streak rewards
- Advanced analytics

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
| Backend | Node.js / NestJS |
| AI Layer | Somnia Agents |
| Charts | TradingView |
| Database | PostgreSQL |
| Wallets | Wagmi + RainbowKit |
| Indexing | The Graph |

---

# Project Structure

```bash
somnia-predict/
├── apps/
│   ├── web/
│   └── backend/
│
├── contracts/
│   ├── PredictionMarket.sol
│   ├── OracleManager.sol
│   ├── Treasury.sol
│   └── interfaces/
│
├── agents/
│   ├── sentiment-agent/
│   ├── whale-tracker-agent/
│   ├── risk-analysis-agent/
│   └── market-summary-agent/
│
├── scripts/
├── docs/
└── README.md
```

---

# Vision

MinuteMarkets aims to become the next generation AI-powered prediction market by combining:

- Prediction trading
- AI intelligence
- Gamification
- Social finance
- Real-time analytics
- Ultra-fast blockchain infrastructure

Built for the future of decentralized speculative markets on Somnia 🚀# 5-minute-somnia
