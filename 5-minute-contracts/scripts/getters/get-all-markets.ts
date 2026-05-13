import "dotenv/config";
import hre from "hardhat";

async function main() {
  // ============================================================
  // FACTORY ADDRESS
  // ============================================================

  const factoryAddress =
    process.env.FACTORY_ADDRESS!;

  if (!factoryAddress) {
    throw new Error(
      "FACTORY_ADDRESS missing in .env"
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

  console.log(
    "\n=== ALL PREDICTION MARKETS ===\n"
  );

  console.log(
    "Network:",
    hre.network.name
  );

  console.log(
    "Factory:",
    factoryAddress
  );

  // ============================================================
  // GET ALL MARKETS
  // ============================================================

  const markets =
    await factory.getAllMarkets();

  console.log(
    "\nTotal Markets:",
    markets.length
  );

  // ============================================================
  // LOOP MARKETS
  // ============================================================

  for (
    let i = 0;
    i < markets.length;
    i++
  ) {
    const marketAddress =
      markets[i];

    const info =
      await factory.getMarketInfo(
        marketAddress
      );

    console.log(
      `\n#${i + 1}`
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

      active:
        info.active,
    });
  }

  console.log("\n");
}

main().catch((error) => {
  console.error(error);

  process.exitCode = 1;
});