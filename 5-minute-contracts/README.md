# 5-Minute Contracts (Somnia)

Hardhat project for the 5-minute prediction market contracts.

## Env

Create `./.env`:

```bash
PRIVATE_KEY=...
SOMNIA_TESTNET_RPC_URL=...
SOMNIA_MAINNET_RPC_URL=...
TREASURY_ADDRESS=...            # optional (defaults to deployer)
RESOLVER_ADDRESS=0xd3899fe302b149e6130b56d6843e04c22b169adf
```

## Deploy

Deploy the factory (writes `deployments/factory.json`):

```bash
npx hardhat run scripts/deploy/deploy-factory.ts --network somniaTestnet
```

Create a market (writes `deployments/market.json`):

```bash
MARKET_NAME="BTC/USD" MARKET_SYMBOL="BTC" COIN_ID="bitcoin" \
  npx hardhat run scripts/deploy/create-market.ts --network somniaTestnet
```

Local dev (single in-memory run):

```bash
npx hardhat run scripts/deploy/deploy-and-create-market.ts
```

## Function tests

Sanity-check reads/writes against the deployed factory/market:

```bash
npx hardhat run scripts/test-functions.ts --network somniaTestnet
```

## Live pool betting (50 accounts)

Generate 50 test wallets (writes `bet-accounts.json`):

```bash
npx hardhat run scripts/prediction/generate-bet-accounts.ts
```

Fund each bot from the admin wallet (`PRIVATE_KEY` in `.env`), place random UP/DOWN bets (1–5 STT each), then sweep remaining STT back to admin.

Provide the **live market address** when prompted in the terminal:

```bash
npx hardhat run scripts/prediction/bet-live-pools.ts --network somniaTestnet
```

Optional env:

- `ACCOUNTS_JSON_PATH=./bet-accounts.json`
- `MAX_ACCOUNTS=50`
- `BOT_FUND_STT=6` — STT sent from admin to each bot before betting
- `DRY_RUN=true` — preview without sending transactions

## Bot claim rewards

Claim rewards for all bot wallets that have unclaimed winnings on a market.
Prompts for market address in the terminal:

```bash
npx hardhat run scripts/prediction/claim-live-pools.ts --network somniaTestnet
```

Per bot with claimable rewards:
1. Admin sends **1 STT** to bot (gas)
2. Bot claims all claimable epochs
3. Bot sweeps remaining STT back to admin

Optional env:

- `ACCOUNTS_JSON_PATH=./bet-accounts.json`
- `MAX_ACCOUNTS=50`
- `BOT_FUND_STT=1`
- `DRY_RUN=true`

