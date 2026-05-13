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
    "\n=== ROUND INFO ===\n"
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
    "Market:",
    marketAddress
  );

  console.log(
    "Epoch:",
    epoch.toString()
  );

  // ============================================================
  // FETCH ROUND
  // ============================================================

  const round =
    await market.getRound(
      epoch
    );

  // ============================================================
  // FORMAT STATUS
  // ============================================================

  const statusMap: Record<
    string,
    string
  > = {
    "0": "LIVE",
    "1": "LOCKED",
    "2": "ENDED",
    "3": "CANCELLED",
  };

  // ============================================================
  // DISPLAY
  // ============================================================

  console.log(
    "\n=== ROUND DETAILS ===\n"
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

    lockPrice:
      round.lockPrice.toString(),

    closePrice:
      round.closePrice.toString(),

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

    rewardAmount:
      hre.ethers.formatEther(
        round.rewardAmount
      ) + " STT",

    treasuryAmount:
      hre.ethers.formatEther(
        round.treasuryAmount
      ) + " STT",

    upWon:
      round.upWon,

    status:
      statusMap[
        round.status.toString()
      ] ??
      round.status.toString(),
  });

  // ============================================================
  // PRICE FORMATTING
  // ============================================================

  if (
    round.lockPrice > 0
  ) {
    console.log(
      "\nLock Price:"
    );

    console.log(
      Number(
        round.lockPrice
      ) / 1e8
    );
  }

  if (
    round.closePrice > 0
  ) {
    console.log(
      "\nClose Price:"
    );

    console.log(
      Number(
        round.closePrice
      ) / 1e8
    );
  }

  console.log("\n");
}

main().catch((error) => {
  console.error(error);

  process.exitCode = 1;
});