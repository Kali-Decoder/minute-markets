import "dotenv/config";
import hre from "hardhat";

async function main() {
  // ============================================================
  // ENV
  // ============================================================

  const factoryAddress =
    process.env.FACTORY_ADDRESS!;

  const marketAddress =
    process.env.MARKET_ADDRESS!;

  if (!factoryAddress) {
    throw new Error(
      "FACTORY_ADDRESS missing in .env"
    );
  }

  if (!marketAddress) {
    throw new Error(
      "MARKET_ADDRESS missing in .env"
    );
  }

  // ============================================================
  // NETWORK INFO
  // ============================================================

  console.log(
    "\n=== MARKET INFO ===\n"
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
    "Factory:",
    factoryAddress
  );

  console.log(
    "Market:",
    marketAddress
  );

  // ============================================================
  // VALIDATE CONTRACTS
  // ============================================================

  const factoryCode =
    await hre.ethers.provider.getCode(
      factoryAddress
    );

  if (factoryCode === "0x") {
    throw new Error(
      `No factory contract at ${factoryAddress}`
    );
  }

  const marketCode =
    await hre.ethers.provider.getCode(
      marketAddress
    );

  if (marketCode === "0x") {
    throw new Error(
      `No market contract at ${marketAddress}`
    );
  }

  // ============================================================
  // FACTORY INSTANCE
  // ============================================================

  const factory =
    await hre.ethers.getContractAt(
      "PredictionMarketFactory",
      factoryAddress
    );

  // ============================================================
  // MARKET INFO
  // ============================================================

  const info =
    await factory.getMarketInfo(
      marketAddress
    );

  console.log(
    "\n=== FACTORY MARKET INFO ===\n"
  );

  console.log({
    marketAddress:
      info.marketAddress,

    marketName:
      info.marketName,

    marketSymbol:
      info.marketSymbol,

    coinId:
      info.coinId,

    creator:
      info.creator,

    createdAt:
      info.createdAt.toString(),

    active:
      info.active,
  });

  // ============================================================
  // MARKET CONTRACT
  // ============================================================

  const market =
    await hre.ethers.getContractAt(
      "PredictionMarket",
      marketAddress
    );

  // ============================================================
  // FETCH MARKET DETAILS
  // ============================================================

  const currentEpoch =
    await market.currentEpoch();

  const treasury =
    await market.treasury();

  const treasuryFee =
    await market.treasuryFee();

  const minBetAmount =
    await market.minBetAmount();

  const roundInterval =
    await market.roundInterval();

  const totalTreasury =
    await market.totalTreasury();

  // ============================================================
  // DISPLAY
  // ============================================================

  console.log(
    "\n=== MARKET CONTRACT INFO ===\n"
  );

  console.log({
    currentEpoch:
      currentEpoch.toString(),

    treasury,

    treasuryFee:
      treasuryFee.toString(),

    minBetAmount:
      hre.ethers.formatEther(
        minBetAmount
      ) + " STT",

    roundInterval:
      roundInterval.toString() +
      " seconds",

    totalTreasury:
      hre.ethers.formatEther(
        totalTreasury
      ) + " STT",
  });

  console.log("\n");
}

main().catch((error) => {
  console.error(error);

  process.exitCode = 1;
});