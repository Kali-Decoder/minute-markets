import hre from "hardhat";

import {
  getMarket,
  parseEtherEnv,
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

  const value =
    parseEtherEnv(
      "BET_AMOUNT_ETH",
      process.env.BET_AMOUNT_ETH,
      "0.01"
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
    "\n=== PLACE UP BET ===\n"
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

  console.log(
    "Bet Amount:",
    hre.ethers.formatEther(
      value
    ),
    "STT"
  );

  // ============================================================
  // ROUND INFO
  // ============================================================

  const round =
    await market.getRound(
      epoch
    );

  console.log(
    "\n=== ROUND STATUS ===\n"
  );

  console.log({
    status:
      round.status.toString(),

    totalPool:
      hre.ethers.formatEther(
        round.totalPool
      ),

    upPool:
      hre.ethers.formatEther(
        round.upPool
      ),

    downPool:
      hre.ethers.formatEther(
        round.downPool
      ),
  });

  // ============================================================
  // PLACE BET
  // ============================================================

  console.log(
    "\n📡 Placing UP bet..."
  );

  const tx =
    await market.betUp(epoch, {
      value,
    });

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
  // UPDATED ROUND INFO
  // ============================================================

  const updatedRound =
    await market.getRound(
      epoch
    );

  console.log(
    "\n✅ UP Bet Placed"
  );

  console.log(
    "\n=== UPDATED POOLS ===\n"
  );

  console.log({
    totalPool:
      hre.ethers.formatEther(
        updatedRound.totalPool
      ),

    upPool:
      hre.ethers.formatEther(
        updatedRound.upPool
      ),

    downPool:
      hre.ethers.formatEther(
        updatedRound.downPool
      ),
  });

  console.log("\n");
}

main().catch((error) => {
  console.error(error);

  process.exitCode = 1;
});