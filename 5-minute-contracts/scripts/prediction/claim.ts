import hre from "hardhat";

import {
  getMarket,
  requireUint,
} from "./_common";

// ============================================================
// PARSE EPOCHS
// ============================================================

function parseEpochs(): bigint[] {
  // multiple epochs
  if (process.env.EPOCHS) {
    const parts =
      process.env.EPOCHS
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    if (parts.length === 0) {
      throw new Error(
        "EPOCHS is empty"
      );
    }

    return parts.map((p) =>
      requireUint(
        "EPOCHS item",
        p
      )
    );
  }

  // single epoch fallback
  return [
    requireUint(
      "EPOCH",
      process.env.EPOCH
    ),
  ];
}

async function main() {
  // ============================================================
  // EPOCHS
  // ============================================================

  const epochs =
    parseEpochs();

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
    "\n=== CLAIM REWARDS ===\n"
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
    "Epochs:",
    epochs
      .map((e) =>
        e.toString()
      )
      .join(", ")
  );

  // ============================================================
  // CHECK CLAIMABLE
  // ============================================================

  console.log(
    "\n=== CLAIM STATUS ===\n"
  );

  for (const epoch of epochs) {
    try {
      const claimable =
        await market.claimable(
          epoch,
          signer.address
        );

      const refundable =
        await market.refundable(
          epoch,
          signer.address
        );

      console.log({
        epoch:
          epoch.toString(),

        claimable,

        refundable,
      });
    } catch (err) {
      console.log(
        `Unable to fetch status for epoch ${epoch}`
      );
    }
  }

  // ============================================================
  // CLAIM
  // ============================================================

  console.log(
    "\n📡 Claiming rewards..."
  );

  const tx =
    await market.claim(
      epochs
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
  // SUCCESS
  // ============================================================

  console.log(
    "\n✅ Rewards Claimed Successfully"
  );

  console.log(
    "Claim Transaction:",
    tx.hash
  );

  console.log("\n");
}

main().catch((error) => {
  console.error(error);

  process.exitCode = 1;
});