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
