/**
 * Bot claim script for PredictionMarket pools
 *
 * Flow (per bot with claimable rewards):
 *   1. Admin wallet sends 1 STT to bot wallet (gas)
 *   2. Bot claims all claimable epochs on the market
 *   3. Bot sweeps all remaining STT back to admin wallet
 *
 * Usage:
 *   npx hardhat run scripts/prediction/claim-live-pools.ts --network somniaTestnet
 */
import "dotenv/config";
import hre from "hardhat";
import { resolvePathFromRoot } from "../lib/io";
import {
  BetAccount,
  fundBotFromAdmin,
  getAdminWallet,
  getClaimableEpochsForUser,
  getMarketSummary,
  loadBetAccounts,
  parseEtherEnv,
  promptMarketAddress,
  sweepBotToAdmin,
} from "./_common";

const BOT_FUND_STT = "1";

async function runBotClaim(
  marketAddress: string,
  account: BetAccount,
  admin: hre.ethers.Wallet,
  fundAmount: bigint,
  dryRun: boolean
) {
  const bot = new hre.ethers.Wallet(account.privateKey, hre.ethers.provider);

  console.log(`\n--- Bot ${bot.address} ---`);

  const claimableEpochs = await getClaimableEpochsForUser(
    marketAddress,
    bot.address
  );

  if (claimableEpochs.length === 0) {
    console.log("  skip: nothing to claim");
    return { status: "skipped" as const, reason: "nothing to claim" };
  }

  const totalReward = claimableEpochs.reduce(
    (sum, item) => sum + item.reward,
    0n
  );
  const epochs = claimableEpochs.map((item) => item.epoch);

  console.log(
    "  claimable epochs:",
    epochs.map((epoch) => epoch.toString()).join(", ")
  );
  console.log(
    "  estimated reward:",
    hre.ethers.formatEther(totalReward),
    "STT"
  );

  // Step 1: admin funds bot for gas
  await fundBotFromAdmin(admin, bot.address, fundAmount, dryRun);

  if (dryRun) {
    console.log(
      `  [2/3] dry-run claim epochs [${epochs.map((e) => e.toString()).join(", ")}]`
    );
    await sweepBotToAdmin(bot, admin.address, dryRun);
    return {
      status: "dry-run" as const,
      epochs,
      estimatedReward: totalReward,
    };
  }

  const contract = await hre.ethers.getContractAt(
    "PredictionMarket",
    marketAddress,
    bot
  );

  try {
    const tx = await contract.claim(epochs);
    console.log(`  [2/3] claim tx (${tx.hash})`);
    await tx.wait();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  claim failed: ${message}`);
    await sweepBotToAdmin(bot, admin.address, dryRun);
    return { status: "failed" as const, reason: message };
  }

  // Step 3: sweep all STT back to admin
  await sweepBotToAdmin(bot, admin.address, dryRun);

  return {
    status: "success" as const,
    epochs,
    estimatedReward: totalReward,
  };
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
  const market = await getMarketSummary(marketAddress);

  const botsWithClaims: { address: string; epochs: string[]; reward: string }[] =
    [];

  for (const account of accounts) {
    const claimable = await getClaimableEpochsForUser(
      marketAddress,
      account.address
    );
    if (claimable.length > 0) {
      const reward = claimable.reduce((sum, item) => sum + item.reward, 0n);
      botsWithClaims.push({
        address: account.address,
        epochs: claimable.map((item) => item.epoch.toString()),
        reward: hre.ethers.formatEther(reward),
      });
    }
  }

  const totalFunding = fundAmount * BigInt(botsWithClaims.length);
  const adminBalance = await hre.ethers.provider.getBalance(admin.address);

  console.log("\n=== BOT CLAIM REWARDS ===\n");
  console.log("Procedure: admin fund 1 STT -> claim -> sweep back to admin\n");
  console.log("Network:", hre.network.name);
  console.log("Admin wallet:", admin.address);
  console.log("Admin balance:", hre.ethers.formatEther(adminBalance), "STT");
  console.log("Market:", market.address);
  console.log("Market name:", market.name);
  console.log("Symbol:", market.symbol);
  console.log("Current epoch:", market.currentEpoch.toString());
  console.log("Bots loaded:", accounts.length);
  console.log("Bots with claims:", botsWithClaims.length);
  console.log("Fund per claiming bot:", hre.ethers.formatEther(fundAmount), "STT");
  console.log(
    "Total funding needed:",
    hre.ethers.formatEther(totalFunding),
    "STT (+ gas)"
  );
  console.log("Dry run:", dryRun);

  if (botsWithClaims.length === 0) {
    console.log("\nNo claimable rewards found for any bot on this market.\n");
    return;
  }

  console.log("\nClaimable bots preview:");
  for (const bot of botsWithClaims.slice(0, 5)) {
    console.log(`  ${bot.address} | epochs: ${bot.epochs.join(", ")} | ~${bot.reward} STT`);
  }
  if (botsWithClaims.length > 5) {
    console.log(`  ... and ${botsWithClaims.length - 5} more`);
  }

  if (!dryRun && adminBalance < totalFunding) {
    throw new Error(
      `Admin needs at least ${hre.ethers.formatEther(totalFunding)} STT for ${botsWithClaims.length} claiming bots`
    );
  }

  let claimed = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`\nProcessing claims on ${market.symbol}...\n`);

  for (const account of accounts) {
    try {
      const result = await runBotClaim(
        marketAddress,
        account,
        admin,
        fundAmount,
        dryRun
      );

      if (result.status === "success" || result.status === "dry-run") {
        claimed++;
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

  const finalAdminBalance = await hre.ethers.provider.getBalance(admin.address);

  console.log("\n=== SUMMARY ===\n");
  console.log({
    market: market.address,
    claimed,
    skipped,
    failed,
    adminBalanceAfter: hre.ethers.formatEther(finalAdminBalance),
  });
  console.log("\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
