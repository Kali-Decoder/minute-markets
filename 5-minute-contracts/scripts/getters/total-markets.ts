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
  // NETWORK INFO
  // ============================================================

  console.log(
    "\n=== FACTORY INFO ===\n"
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

  // ============================================================
  // VALIDATE CONTRACT
  // ============================================================

  const code =
    await hre.ethers.provider.getCode(
      factoryAddress
    );

  if (code === "0x") {
    throw new Error(
      `No contract found at ${factoryAddress}`
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
  // FETCH DATA
  // ============================================================

  const treasury =
    await factory.treasury();

  const totalMarkets =
    await factory.totalMarkets();

  const markets =
    await factory.getAllMarkets();

  // ============================================================
  // DISPLAY
  // ============================================================

  console.log("\nTreasury:");
  console.log(treasury);

  console.log("\nTotal Markets:");
  console.log(
    totalMarkets.toString()
  );

  console.log("\nMarkets:");

  for (
    let i = 0;
    i < markets.length;
    i++
  ) {
    console.log(
      `#${i + 1}: ${markets[i]}`
    );
  }

  console.log("\n");
}

main().catch((error) => {
  console.error(error);

  process.exitCode = 1;
});