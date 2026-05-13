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
    "\n=== MARKET BALANCE ===\n"
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
  // FETCH BALANCES
  // ============================================================

  const contractBalance =
    await market.getContractBalance();

  const totalTreasury =
    await market.totalTreasury();

  const currentEpoch =
    await market.currentEpoch();

  // ============================================================
  // DISPLAY
  // ============================================================

  console.log(
    "\n=== CONTRACT FUNDS ===\n"
  );

  console.log({
    contractBalance:
      hre.ethers.formatEther(
        contractBalance
      ) + " STT",

    totalTreasury:
      hre.ethers.formatEther(
        totalTreasury
      ) + " STT",

    currentEpoch:
      currentEpoch.toString(),
  });

  // ============================================================
  // CURRENT ROUND
  // ============================================================

  if (currentEpoch > 0) {
    const round =
      await market.getRound(
        currentEpoch
      );

    console.log(
      "\n=== CURRENT ROUND POOLS ===\n"
    );

    console.log({
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
  }

  console.log("\n");
}

main().catch((error) => {
  console.error(error);

  process.exitCode = 1;
});