import hre from "hardhat";

import {
  getMarket,
} from "./_common";

async function main() {
  // ============================================================
  // SIGNER
  // ============================================================

  const [signer] =
    await hre.ethers.getSigners();

  // ============================================================
  // MARKET
  // ============================================================

  const market =
    await getMarket();

  const marketAddress =
    await market.getAddress();

  // ============================================================
  // NETWORK INFO
  // ============================================================

  console.log(
    "\n=== CLAIM TREASURY ===\n"
  );

  console.log(
    "Network:",
    hre.network.name
  );

  console.log(
    "Chain ID:",
    hre.network.config.chainId
  );

  console.log(
    "Signer:",
    signer.address
  );

  console.log(
    "Market:",
    marketAddress
  );

  // ============================================================
  // TREASURY INFO BEFORE
  // ============================================================

  const treasury =
    await market.treasury();

  const totalTreasuryBefore =
    await market.totalTreasury();

  console.log(
    "\n=== TREASURY BEFORE CLAIM ===\n"
  );

  console.log({
    treasury,

    totalTreasury:
      hre.ethers.formatEther(
        totalTreasuryBefore
      ) + " STT",
  });

  // ============================================================
  // CLAIM TREASURY
  // ============================================================

  console.log(
    "\n📡 Claiming treasury fees..."
  );

  const tx =
    await market.claimTreasury();

  console.log(
    "Transaction:",
    tx.hash
  );

  const receipt =
    await tx.wait();

  console.log(
    "Confirmed in block:",
    receipt?.blockNumber
  );

  // ============================================================
  // TREASURY INFO AFTER
  // ============================================================

  const totalTreasuryAfter =
    await market.totalTreasury();

  console.log(
    "\n✅ Treasury Claimed"
  );

  console.log(
    "\n=== TREASURY AFTER CLAIM ===\n"
  );

  console.log({
    remainingTreasury:
      hre.ethers.formatEther(
        totalTreasuryAfter
      ) + " STT",
  });

  console.log("\n");
}

main().catch((error) => {
  console.error(error);

  process.exitCode = 1;
});