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

  const user =
    process.env.USER_ADDRESS;

  if (!user) {
    throw new Error(
      "USER_ADDRESS missing in .env"
    );
  }

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
    "\n=== USER BET INFO ===\n"
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

  console.log(
    "User:",
    user
  );

  // ============================================================
  // FETCH BET
  // ============================================================

  const bet =
    await market.getUserBet(
      epoch,
      user
    );

  // ============================================================
  // POSITION MAP
  // ============================================================

  const positionMap: Record<
    string,
    string
  > = {
    "0": "NONE",
    "1": "UP",
    "2": "DOWN",
  };

  // ============================================================
  // ROUND INFO
  // ============================================================

  const round =
    await market.getRound(
      epoch
    );

  // ============================================================
  // CLAIM STATUS
  // ============================================================

  let claimable =
    false;

  let refundable =
    false;

  try {
    claimable =
      await market.claimable(
        epoch,
        user
      );

    refundable =
      await market.refundable(
        epoch,
        user
      );
  } catch {}

  // ============================================================
  // DISPLAY
  // ============================================================

  console.log(
    "\n=== BET DETAILS ===\n"
  );

  console.log({
    position:
      positionMap[
        bet.position.toString()
      ] ??
      bet.position.toString(),

    amount:
      hre.ethers.formatEther(
        bet.amount
      ) + " STT",

    claimed:
      bet.claimed,

    claimable,

    refundable,
  });

  // ============================================================
  // ROUND RESULT
  // ============================================================

  if (
    round.status.toString() ===
    "2"
  ) {
    console.log(
      "\n=== ROUND RESULT ===\n"
    );

    const won =
      (round.upWon &&
        bet.position.toString() ===
          "1") ||
      (!round.upWon &&
        bet.position.toString() ===
          "2");

    console.log({
      upWon:
        round.upWon,

      userWon:
        won,
    });
  }

  console.log("\n");
}

main().catch((error) => {
  console.error(error);

  process.exitCode = 1;
});