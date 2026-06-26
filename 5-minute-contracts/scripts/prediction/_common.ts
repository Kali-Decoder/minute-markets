import "dotenv/config";
import * as readline from "readline";
import hre from "hardhat";
import { readJsonIfExists } from "../lib/io";
import { DEPLOYMENT_FACTORY_JSON } from "../lib/paths";

export type BetAccount = {
  address: string;
  privateKey: string;
};

export type LiveMarket = {
  address: string;
  name: string;
  symbol: string;
  coinId: string;
  epoch: bigint;
  lockTimestamp: bigint;
  minBetAmount: bigint;
  upPool: bigint;
  downPool: bigint;
  totalPool: bigint;
};

export type ClaimableEpoch = {
  epoch: bigint;
  reward: bigint;
  status: string;
};

export const POSITION = {
  UP: 0n,
  DOWN: 1n,
} as const;

export const ROUND_STATUS = {
  LIVE: 0n,
  LOCKED: 1n,
  ENDED: 2n,
  CANCELLED: 3n,
} as const;

export const ROUND_STATUS_LABEL: Record<string, string> = {
  "0": "LIVE",
  "1": "LOCKED",
  "2": "ENDED",
  "3": "CANCELLED",
};

export function promptMarketAddress(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question("\nEnter live market pool address: ", (answer) => {
      rl.close();
      const address = answer.trim();
      if (!hre.ethers.isAddress(address)) {
        reject(new Error(`Invalid market address: ${address}`));
        return;
      }
      resolve(address);
    });
  });
}

export async function getAdminWallet() {
  const privateKey = process.env.PRIVATE_KEY?.trim();
  if (!privateKey) {
    throw new Error("PRIVATE_KEY missing in .env (admin wallet)");
  }

  return new hre.ethers.Wallet(privateKey, hre.ethers.provider);
}

export async function fundBotFromAdmin(
  admin: hre.ethers.Wallet,
  botAddress: string,
  fundAmount: bigint,
  dryRun: boolean,
  stepLabel = "[1/3]"
) {
  if (dryRun) {
    console.log(
      `  ${stepLabel} dry-run admin -> bot ${hre.ethers.formatEther(fundAmount)} STT`
    );
    return;
  }

  const tx = await admin.sendTransaction({ to: botAddress, value: fundAmount });
  console.log(
    `  ${stepLabel} admin -> bot ${hre.ethers.formatEther(fundAmount)} STT (${tx.hash})`
  );
  await tx.wait();
}

export async function sweepBotToAdmin(
  bot: hre.ethers.Wallet,
  adminAddress: string,
  dryRun: boolean,
  stepLabel = "[3/3]"
) {
  const balance = await bot.provider.getBalance(bot.address);
  if (balance === 0n) {
    return;
  }

  const feeData = await bot.provider.getFeeData();
  const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
  const gasLimit = await bot.estimateGas({ to: adminAddress, value: 1n });
  const gasCost = (gasLimit * gasPrice * 120n) / 100n;

  if (balance <= gasCost) {
    console.log(
      `  ${stepLabel} skip sweep (only ${hre.ethers.formatEther(balance)} STT left, not enough for gas)`
    );
    return;
  }

  const sweepAmount = balance - gasCost;

  if (dryRun) {
    console.log(
      `  ${stepLabel} dry-run bot -> admin ${hre.ethers.formatEther(sweepAmount)} STT`
    );
    return;
  }

  const tx = await bot.sendTransaction({
    to: adminAddress,
    value: sweepAmount,
    gasLimit,
  });
  console.log(
    `  ${stepLabel} bot -> admin ${hre.ethers.formatEther(sweepAmount)} STT (${tx.hash})`
  );
  await tx.wait();
}

export async function assertMarketExists(marketAddress: string) {
  if (!hre.ethers.isAddress(marketAddress)) {
    throw new Error(`Invalid market address: ${marketAddress}`);
  }

  const code = await hre.ethers.provider.getCode(marketAddress);
  if (code === "0x") {
    throw new Error(`No contract found at ${marketAddress}`);
  }
}

export async function resolveMarketAddress(): Promise<string> {
  const marketAddress = process.env.MARKET_ADDRESS;

  if (!marketAddress) {
    throw new Error("MARKET_ADDRESS missing in .env");
  }

  await assertMarketExists(marketAddress);
  return marketAddress;
}
export async function resolveFactoryAddress(): Promise<string> {
  const fromEnv = process.env.FACTORY_ADDRESS?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const deployment = readJsonIfExists<{ factory?: string }>(
    DEPLOYMENT_FACTORY_JSON
  );

  if (deployment?.factory) {
    return deployment.factory;
  }

  throw new Error(
    "FACTORY_ADDRESS missing in .env and deployments/factory.json"
  );
}

export async function getMarket(marketAddress?: string) {
  const address = marketAddress ?? (await resolveMarketAddress());
  return hre.ethers.getContractAt("PredictionMarket", address);
}

export function loadBetAccounts(
  filePath: string,
  maxAccounts = 50
): BetAccount[] {
  const accounts = readJsonIfExists<BetAccount[]>(filePath);

  if (!accounts?.length) {
    throw new Error(
      `No accounts found at ${filePath}. Run scripts/prediction/generate-bet-accounts.ts first.`
    );
  }

  if (accounts.length < maxAccounts) {
    throw new Error(
      `Expected at least ${maxAccounts} accounts, found ${accounts.length} in ${filePath}`
    );
  }

  return accounts.slice(0, maxAccounts);
}

export async function getLiveMarket(marketAddress: string): Promise<LiveMarket> {
  await assertMarketExists(marketAddress);

  const market = await getMarket(marketAddress);
  const round = await market.getCurrentRound();
  const paused = await market.paused();
  const now = BigInt(Math.floor(Date.now() / 1000));

  if (paused) {
    throw new Error("Market is paused");
  }

  if (round.epoch === 0n) {
    throw new Error("No round started yet. Start a round before betting.");
  }

  if (round.status !== ROUND_STATUS.LIVE) {
    const label =
      ROUND_STATUS_LABEL[round.status.toString()] ??
      round.status.toString();
    throw new Error(`Round is not LIVE (current status: ${label})`);
  }

  if (now >= round.lockTimestamp) {
    throw new Error("Round is locked for betting");
  }

  const [name, symbol, coinId, minBetAmount] = await Promise.all([
    market.marketName(),
    market.marketSymbol(),
    market.coinId(),
    market.minBetAmount(),
  ]);

  return {
    address: marketAddress,
    name,
    symbol,
    coinId,
    epoch: round.epoch,
    lockTimestamp: round.lockTimestamp,
    minBetAmount,
    upPool: round.upPool,
    downPool: round.downPool,
    totalPool: round.totalPool,
  };
}

export function requireUint(name: string, value?: string): bigint {
  if (!value) {
    throw new Error(`${name} is required`);
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid ${name}: ${value}`);
  }

  return BigInt(value);
}

export function parseEtherEnv(
  name: string,
  value: string | undefined,
  fallbackEth: string
): bigint {
  const raw = value ?? fallbackEth;

  try {
    return hre.ethers.parseEther(raw);
  } catch {
    throw new Error(`Invalid ${name}: ${raw}`);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function computeClaimReward(
  round: {
    status: bigint;
    upWon: boolean;
    rewardAmount: bigint;
    upPool: bigint;
    downPool: bigint;
  },
  bet: {
    position: bigint;
    amount: bigint;
    claimed: boolean;
  }
): bigint | null {
  if (bet.amount === 0n || bet.claimed) {
    return null;
  }

  if (
    round.status !== ROUND_STATUS.ENDED &&
    round.status !== ROUND_STATUS.CANCELLED
  ) {
    return null;
  }

  if (round.status === ROUND_STATUS.CANCELLED) {
    return bet.amount;
  }

  const won =
    (round.upWon && bet.position === POSITION.UP) ||
    (!round.upWon && bet.position === POSITION.DOWN);

  if (!won) {
    return null;
  }

  const winnerPool = round.upWon ? round.upPool : round.downPool;
  if (winnerPool === 0n) {
    return null;
  }

  return (bet.amount * round.rewardAmount) / winnerPool;
}

export async function getClaimableEpochsForUser(
  marketAddress: string,
  userAddress: string
): Promise<ClaimableEpoch[]> {
  const market = await getMarket(marketAddress);
  const currentEpoch = await market.currentEpoch();
  const claimable: ClaimableEpoch[] = [];

  for (let epoch = 1n; epoch <= currentEpoch; epoch++) {
    const [bet, round] = await Promise.all([
      market.getUserBet(epoch, userAddress),
      market.getRound(epoch),
    ]);

    const reward = computeClaimReward(round, bet);
    if (reward && reward > 0n) {
      claimable.push({
        epoch,
        reward,
        status:
          ROUND_STATUS_LABEL[round.status.toString()] ??
          round.status.toString(),
      });
    }
  }

  return claimable;
}

export async function getMarketSummary(marketAddress: string) {
  await assertMarketExists(marketAddress);
  const market = await getMarket(marketAddress);

  const [name, symbol, coinId, currentEpoch] = await Promise.all([
    market.marketName(),
    market.marketSymbol(),
    market.coinId(),
    market.currentEpoch(),
  ]);

  return {
    address: marketAddress,
    name,
    symbol,
    coinId,
    currentEpoch,
  };
}
