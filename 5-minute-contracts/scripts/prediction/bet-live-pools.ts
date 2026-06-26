/**
 * Live market bot betting script
 *
 * Flow (per bot):
 *   1. Admin wallet sends BOT_FUND_STT (default 6 STT) to bot wallet
 *   2. Bot places random UP or DOWN bet with random amount (1–5 STT)
 *   3. Bot sweeps remaining STT back to admin wallet
 *
 * Usage:
 *   npx hardhat run scripts/prediction/bet-live-pools.ts --network somniaTestnet
 */
import "dotenv/config";
import hre from "hardhat";
import { resolvePathFromRoot } from "../lib/io";
import {
  BetAccount,
  LiveMarket,
  ROUND_STATUS_LABEL,
  fundBotFromAdmin,
  getAdminWallet,
  getLiveMarket,
  loadBetAccounts,
  parseEtherEnv,
  promptMarketAddress,
  sweepBotToAdmin,
} from "./_common";

const BOT_FUND_STT = "6";
const MIN_BET_STT = 1;
const MAX_BET_STT = 5;

function randomSide(): "up" | "down" {
  return Math.random() < 0.5 ? "up" : "down";
}

function randomBetAmount(minBetAmount: bigint): bigint {
  const stt =
    MIN_BET_STT + Math.floor(Math.random() * (MAX_BET_STT - MIN_BET_STT + 1));
  const amount = hre.ethers.parseEther(stt.toString());
  return amount >= minBetAmount ? amount : minBetAmount;
}

async function placeRandomBet(
  market: LiveMarket,
  bot: hre.ethers.Wallet,
  betAmount: bigint,
  side: "up" | "down",
  dryRun: boolean
) {
  if (dryRun) {
    console.log(
      `  [2/3] dry-run ${side.toUpperCase()} bet ${hre.ethers.formatEther(betAmount)} STT`
    );
    return;
  }

  const contract = await hre.ethers.getContractAt(
    "PredictionMarket",
    market.address,
    bot
  );

  const tx =
    side === "up"
      ? await contract.betUp(market.epoch, { value: betAmount })
      : await contract.betDown(market.epoch, { value: betAmount });

  console.log(
    `  [2/3] ${side.toUpperCase()} bet ${hre.ethers.formatEther(betAmount)} STT (${tx.hash})`
  );
  await tx.wait();
}

async function runBotOnLiveMarket(
  market: LiveMarket,
  account: BetAccount,
  admin: hre.ethers.Wallet,
  fundAmount: bigint,
  dryRun: boolean
) {
  const bot = new hre.ethers.Wallet(account.privateKey, hre.ethers.provider);
  const betAmount = randomBetAmount(market.minBetAmount);
  const side = randomSide();

  console.log(`\n--- Bot ${bot.address} ---`);

  const contract = await hre.ethers.getContractAt(
    "PredictionMarket",
    market.address,
    bot
  );

  const existingBet = await contract.getUserBet(market.epoch, bot.address);
  if (existingBet.amount > 0n) {
    console.log("  skip: already bet on this epoch");
    return { status: "skipped" as const, reason: "already bet" };
  }

  await fundBotFromAdmin(admin, bot.address, fundAmount, dryRun);

  if (!dryRun) {
    const balance = await hre.ethers.provider.getBalance(bot.address);
    if (balance < betAmount) {
      console.log("  skip: bot balance too low after funding");
      await sweepBotToAdmin(bot, admin.address, dryRun);
      return { status: "skipped" as const, reason: "insufficient balance" };
    }
  }

  try {
    await placeRandomBet(market, bot, betAmount, side, dryRun);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  bet failed: ${message}`);
    await sweepBotToAdmin(bot, admin.address, dryRun);
    return { status: "failed" as const, reason: message };
  }

  await sweepBotToAdmin(bot, admin.address, dryRun);

  return { status: "success" as const, side, betAmount };
}

async function main() {
  const marketAddress = await promptMarketAddress();

  const accountsPath = resolvePathFromRoot(
    process.env.ACCOUNTS_JSON_PATH ?? "bet-accounts.json"
  );
  const maxAccounts = Number(process.env.MAX_ACCOUNTS ?? "50");
  const dryRun = process.env.DRY_RUN === "true";
  const fundAmount = parseEtherEnv(
    "BOT_FUND_STT",
    process.env.BOT_FUND_STT ?? BOT_FUND_STT,
    BOT_FUND_STT
  );

  const admin = await getAdminWallet();
  const accounts = loadBetAccounts(accountsPath, maxAccounts);
  const market = await getLiveMarket(marketAddress);

  const totalFunding = fundAmount * BigInt(accounts.length);
  const adminBalance = await hre.ethers.provider.getBalance(admin.address);

  console.log("\n=== LIVE MARKET BOT BETTING ===\n");
  console.log("Procedure: admin fund -> random UP/DOWN bet -> sweep back to admin\n");
  console.log("Network:", hre.network.name);
  console.log("Admin wallet:", admin.address);
  console.log("Admin balance:", hre.ethers.formatEther(adminBalance), "STT");
  console.log("Live market:", market.address);
  console.log("Market name:", market.name);
  console.log("Symbol:", market.symbol);
  console.log("Epoch:", market.epoch.toString());
  console.log("Status:", ROUND_STATUS_LABEL["0"]);
  console.log(
    "Lock in:",
    Number(market.lockTimestamp) - Math.floor(Date.now() / 1000),
    "seconds"
  );
  console.log("Bet amount: random", MIN_BET_STT, "-", MAX_BET_STT, "STT");
  console.log("Fund per bot:", hre.ethers.formatEther(fundAmount), "STT");
  console.log("Bots:", accounts.length);
  console.log("Total funding:", hre.ethers.formatEther(totalFunding), "STT (+ gas)");
  console.log("Dry run:", dryRun);

  if (!dryRun && adminBalance < totalFunding) {
    throw new Error(
      `Admin needs at least ${hre.ethers.formatEther(totalFunding)} STT for ${accounts.length} bots`
    );
  }

  let placed = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`\nStarting bots on ${market.symbol}...\n`);

  for (const account of accounts) {
    try {
      const result = await runBotOnLiveMarket(
        market,
        account,
        admin,
        fundAmount,
        dryRun
      );

      if (result.status === "success") {
        placed++;
      } else if (result.status === "skipped") {
        skipped++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`  fail ${account.address}: ${message}`);
    }
  }

  const updated = await (
    await hre.ethers.getContractAt("PredictionMarket", market.address)
  ).getRound(market.epoch);

  const finalAdminBalance = await hre.ethers.provider.getBalance(admin.address);

  console.log("\n=== SUMMARY ===\n");
  console.log({
    market: market.address,
    epoch: market.epoch.toString(),
    betsPlaced: placed,
    skipped,
    failed,
    adminBalanceAfter: hre.ethers.formatEther(finalAdminBalance),
    pools: {
      total: hre.ethers.formatEther(updated.totalPool),
      up: hre.ethers.formatEther(updated.upPool),
      down: hre.ethers.formatEther(updated.downPool),
    },
  });
  console.log("\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
