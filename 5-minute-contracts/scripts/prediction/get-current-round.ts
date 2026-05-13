import hre from "hardhat";

import {
  getMarket,
} from "./_common";

async function main() {
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
    "\n=== CURRENT ROUND ===\n"
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

  // ============================================================
  // CURRENT EPOCH
  // ============================================================

  const currentEpoch =
    await market.currentEpoch();

  console.log(
    "\nCurrent Epoch:",
    currentEpoch.toString()
  );

  // ============================================================
  // CURRENT ROUND
  // ============================================================

  const round =
    await market.getCurrentRound();

  // ============================================================
  // STATUS MAP
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
  // DISPLAY ROUND
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
  // FORMATTED PRICES
  // ============================================================

  if (
    round.lockPrice > 0
  ) {
    console.log(
      "\nLock Price:"
    );

    console.log(
      "$" +
        (
          Number(
            round.lockPrice
          ) / 1e8
        ).toFixed(2)
    );
  }

  if (
    round.closePrice > 0
  ) {
    console.log(
      "\nClose Price:"
    );

    console.log(
      "$" +
        (
          Number(
            round.closePrice
          ) / 1e8
        ).toFixed(2)
    );
  }

  // ============================================================
  // ROUND TIMERS
  // ============================================================

  const now =
    Math.floor(
      Date.now() / 1000
    );

  console.log(
    "\n=== TIMERS ===\n"
  );

  console.log({
    currentTimestamp:
      now,

    secondsUntilLock:
      Number(
        round.lockTimestamp
      ) - now,

    secondsUntilClose:
      Number(
        round.closeTimestamp
      ) - now,
  });

  console.log("\n");
}

main().catch((error) => {
  console.error(error);

  process.exitCode = 1;
});