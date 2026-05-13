import "dotenv/config";
import hre from "hardhat";

async function main() {
  // ============================================================
  // ENV
  // ============================================================

  const factoryAddress =
    process.env.FACTORY_ADDRESS!;

  const marketName =
    process.env.MARKET_NAME ||
    "BTC/USD";

  const marketSymbol =
    process.env.MARKET_SYMBOL ||
    "BTC";

  const coinId =
    process.env.COIN_ID ||
    "bitcoin";

  // ============================================================
  // FACTORY
  // ============================================================

  const factory =
    await hre.ethers.getContractAt(
      "PredictionMarketFactory",
      factoryAddress
    );

  console.log(
    "\n📡 Creating Prediction Market...\n"
  );

  // ============================================================
  // CREATE MARKET
  // ============================================================

  const tx =
    await factory.createMarket(
      marketName,
      marketSymbol,
      coinId
    );

  console.log(
    "Transaction Hash:",
    tx.hash
  );

  const receipt = await tx.wait();

  console.log(
    "Confirmed in block:",
    receipt?.blockNumber
  );

  // ============================================================
  // GET MARKET ADDRESS
  // ============================================================

  const markets =
    await factory.getAllMarkets();

  const marketAddress =
    markets[markets.length - 1];

  console.log(
    "\n✅ Market Created Successfully"
  );

  console.log(
    "Market Address:",
    marketAddress
  );

  console.log(
    "\nMarket Details:"
  );

  console.log({
    marketName,
    marketSymbol,
    coinId,
  });
}

main().catch((error) => {
  console.error(error);

  process.exitCode = 1;
});