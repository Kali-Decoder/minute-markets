import hre from "hardhat";

import { getMarket } from "./_common";

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
    "\n=== START ROUND ===\n"
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
  // CURRENT EPOCH BEFORE
  // ============================================================

  const beforeEpoch =
    await market.currentEpoch();

  console.log(
    "\nCurrent Epoch Before:",
    beforeEpoch.toString()
  );

  // ============================================================
  // START ROUND
  // ============================================================

  console.log(
    "\n📡 Starting round..."
  );

  const tx =
    await market.startRound();

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
  // CURRENT EPOCH AFTER
  // ============================================================

  const currentEpoch =
    await market.currentEpoch();

  console.log(
    "\n✅ Round Started"
  );

  console.log(
    "Current Epoch:",
    currentEpoch.toString()
  );

  // ============================================================
  // ROUND INFO
  // ============================================================

  const round =
    await market.getRound(
      currentEpoch
    );

  console.log(
    "\n=== ROUND INFO ===\n"
  );

  console.log({
    epoch:
      round.epoch.toString(),

    startTimestamp:
      round.startTimestamp.toString(),

    lockTimestamp:
      round.lockTimestamp.toString(),

    closeTimestamp:
      round.closeTimestamp.toString(),

    status:
      round.status.toString(),
  });

  console.log("\n");
}

main().catch((error) => {
  console.error(error);

  process.exitCode = 1;
});