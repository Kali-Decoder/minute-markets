/**
 * Sweep accumulated treasury from all epoch prediction pools to the admin wallet.
 *
 * Contract flow (PredictionMarket.sol):
 *   - onlyOwner can call claimTreasury()
 *   - claimTreasury() sends totalTreasury to the pool treasury address
 *   - setTreasury(admin) first when REDIRECT_TO_ADMIN=true
 *
 * Factory / pool ABIs: predictionMarketFactoryAbi.ts + predictionMarketAbi.ts
 * Default factory:     0xFD204c783A78db5142d4b13A5a11B005dc9C16Dc
 *
 * Usage:
 *   DRY_RUN=true npx hardhat run scripts/prediction/sweep-all-treasuries.ts --network somniaTestnet
 *   CONFIRM_SWEEP=yes npx hardhat run scripts/prediction/sweep-all-treasuries.ts --network somniaTestnet
 */
import "dotenv/config";
import hre from "hardhat";
import {
  getAdminWallet,
  getEpochFactory,
  getEpochPoolContract,
  promptYesNo,
  readEpochPoolState,
  resolveFactoryAddress,
  resolvePoolAddresses,
} from "./_common";

type SweepResult =
  | { status: "claimed"; amount: bigint; txHash: string }
  | { status: "skipped"; reason: string }
  | { status: "dry-run"; amount: bigint }
  | { status: "failed"; reason: string };

function envFlag(name: string, fallback = false): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes";
}

async function sweepPoolTreasury(
  poolAddress: string,
  admin: hre.ethers.Wallet,
  redirectToAdmin: boolean,
  dryRun: boolean
): Promise<SweepResult> {
  const state = await readEpochPoolState(poolAddress);

  if (!state) {
    return {
      status: "skipped",
      reason: "not an epoch prediction pool",
    };
  }

  console.log(`\n--- ${state.symbol} | ${state.name} ---`);
  console.log("  pool:", poolAddress);
  console.log("  owner:", state.owner);
  console.log("  treasury:", state.treasury);
  console.log(
    "  totalTreasury:",
    hre.ethers.formatEther(state.totalTreasury),
    "STT"
  );
  console.log(
    "  contractBalance:",
    hre.ethers.formatEther(state.contractBalance),
    "STT"
  );

  if (state.owner.toLowerCase() !== admin.address.toLowerCase()) {
    return {
      status: "skipped",
      reason: `admin is not owner (owner=${state.owner})`,
    };
  }

  if (state.totalTreasury === 0n) {
    return { status: "skipped", reason: "no treasury to claim" };
  }

  if (state.contractBalance < state.totalTreasury) {
    return {
      status: "failed",
      reason: `pool balance ${hre.ethers.formatEther(state.contractBalance)} STT is below tracked treasury ${hre.ethers.formatEther(state.totalTreasury)} STT`,
    };
  }

  const pool = getEpochPoolContract(poolAddress, admin);
  const payoutAddress = redirectToAdmin ? admin.address : state.treasury;

  if (
    redirectToAdmin &&
    state.treasury.toLowerCase() !== admin.address.toLowerCase()
  ) {
    console.log(`  setTreasury ${state.treasury} -> ${admin.address}`);

    if (dryRun) {
      console.log("  dry-run setTreasury(admin)");
    } else {
      const setTx = await pool.setTreasury(admin.address);
      console.log("  setTreasury tx:", setTx.hash);
      await setTx.wait();
    }
  }

  if (dryRun) {
    console.log(
      `  dry-run claimTreasury ${hre.ethers.formatEther(state.totalTreasury)} STT -> ${payoutAddress}`
    );
    return { status: "dry-run", amount: state.totalTreasury };
  }

  const tx = await pool.claimTreasury();
  console.log("  claimTreasury tx:", tx.hash);
  const receipt = await tx.wait();

  const after = await readEpochPoolState(poolAddress);
  console.log(
    "  claimed:",
    hre.ethers.formatEther(state.totalTreasury),
    "STT ->",
    payoutAddress,
    "| remaining treasury:",
    after ? `${hre.ethers.formatEther(after.totalTreasury)} STT` : "—",
    "| block:",
    receipt?.blockNumber
  );

  return {
    status: "claimed",
    amount: state.totalTreasury,
    txHash: tx.hash,
  };
}

async function main() {
  const dryRun = envFlag("DRY_RUN");
  const redirectToAdmin = envFlag("REDIRECT_TO_ADMIN", true);
  const confirmSweep = envFlag("CONFIRM_SWEEP");

  const admin = await getAdminWallet();
  const factoryAddress = await resolveFactoryAddress();
  const factory = await getEpochFactory();
  const poolAddresses = await resolvePoolAddresses();

  const [factoryOwner, factoryTreasury, totalMarkets] = await Promise.all([
    factory.owner(),
    factory.treasury(),
    factory.totalMarkets(),
  ]);

  const previews = [];
  for (const address of poolAddresses) {
    previews.push({
      address,
      state: await readEpochPoolState(address),
    });
  }

  const claimable = previews.filter(
    (item) =>
      item.state &&
      item.state.owner.toLowerCase() === admin.address.toLowerCase() &&
      item.state.totalTreasury > 0n
  );

  const totalClaimable = claimable.reduce(
    (sum, item) => sum + (item.state?.totalTreasury ?? 0n),
    0n
  );

  console.log("\n=== SWEEP EPOCH POOL TREASURIES ===\n");
  console.log("Network:", hre.network.name);
  console.log("Factory:", factoryAddress);
  console.log("Factory owner:", factoryOwner);
  console.log("Factory treasury:", factoryTreasury);
  console.log("totalMarkets():", totalMarkets.toString());
  console.log("Admin wallet:", admin.address);
  console.log("Pools found:", poolAddresses.length);
  console.log("Readable pools:", previews.filter((p) => p.state).length);
  console.log("Pools with claimable treasury:", claimable.length);
  console.log(
    "Total claimable treasury:",
    hre.ethers.formatEther(totalClaimable),
    "STT"
  );
  console.log("Redirect treasury to admin:", redirectToAdmin);
  console.log("Dry run:", dryRun);
  console.log(
    "\nNote: claimTreasury() only withdraws accumulated protocol fees (totalTreasury)."
  );

  if (claimable.length > 0) {
    console.log("\nClaimable pools preview:");
    for (const item of claimable.slice(0, 10)) {
      console.log(
        `  ${item.state!.symbol} | ${item.address} | ${hre.ethers.formatEther(item.state!.totalTreasury)} STT`
      );
    }
    if (claimable.length > 10) {
      console.log(`  ... and ${claimable.length - 10} more`);
    }
  }

  if (poolAddresses.length === 0) {
    console.log("\nNo pools found.\n");
    return;
  }

  if (!dryRun && !confirmSweep) {
    const confirmed = await promptYesNo(
      `\nClaim treasury from ${claimable.length} pool(s) to ${admin.address}?`
    );
    if (!confirmed) {
      console.log("\nSweep cancelled.\n");
      return;
    }
  }

  let claimed = 0;
  let skipped = 0;
  let failed = 0;
  let dryRunCount = 0;
  let totalClaimed = 0n;

  console.log("\nProcessing pools...\n");

  for (const poolAddress of poolAddresses) {
    try {
      const result = await sweepPoolTreasury(
        poolAddress,
        admin,
        redirectToAdmin,
        dryRun
      );

      if (result.status === "claimed") {
        claimed++;
        totalClaimed += result.amount;
      } else if (result.status === "dry-run") {
        dryRunCount++;
        totalClaimed += result.amount;
      } else if (result.status === "skipped") {
        skipped++;
        console.log(`  skip ${poolAddress}: ${result.reason}`);
      } else {
        failed++;
        console.log(`  fail ${poolAddress}: ${result.reason}`);
      }
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`  fail ${poolAddress}: ${message}`);
    }
  }

  const adminBalance = await hre.ethers.provider.getBalance(admin.address);

  console.log("\n=== SUMMARY ===\n");
  console.log({
    pools: poolAddresses.length,
    claimed,
    dryRun: dryRunCount,
    skipped,
    failed,
    totalTreasuryProcessed: `${hre.ethers.formatEther(totalClaimed)} STT`,
    adminBalanceAfter: `${hre.ethers.formatEther(adminBalance)} STT`,
  });
  console.log("\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
