import hre from "hardhat";

import {
  getMarket,
  requireUint,
} from "./_common";

async function main() {
  // ============================================================
  // ENV
  // ============================================================

  const epoch =
    requireUint(
      "EPOCH",
      process.env.EPOCH
    );

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
    "\n=== CANCEL ROUND ===\n"
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

  console.log(
    "Epoch:",
    epoch.toString()
  );

  // ============================================================
  // ROUND INFO BEFORE
  // ============================================================

  const round =
    await market.getRound(
      epoch
    );

  console.log(
    "\n=== ROUND BEFORE CANCEL ===\n"
  );

  console.log({
    status:
      round.status.toString(),

    totalPool:
      hre.ethers.formatEther(
        round.totalPool
      ) + " STT",

    upPool:
      hre.ethers.formatEther(
        round.upPool
      ) + " STT",

    downPool:
      hre.ethers.formatEther(
        round.downPool
      ) + " STT",
  });

  // ============================================================
  // CANCEL ROUND
  // ============================================================

  console.log(
    "\n📡 Cancelling round..."
  );

  const tx =
    await market.cancelRound(
      epoch
    );

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
  // UPDATED ROUND
  // ============================================================

  const updatedRound =
    await market.getRound(
      epoch
    );

  console.log(
    "\n✅ Round Cancelled"
  );

  console.log(
    "\n=== ROUND AFTER CANCEL ===\n"
  );

  console.log({
    status:
      updatedRound.status.toString(),

    totalPool:
      hre.ethers.formatEther(
        updatedRound.totalPool
      ) + " STT",
  });

  console.log(
    "\nUsers can now claim refunds.\n"
  );
}

main().catch((error) => {
  console.error(error);

  process.exitCode = 1;
});