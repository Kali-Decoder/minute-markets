import "dotenv/config";
import hre from "hardhat";

import { readJsonIfExists } from "./lib/io";
import { DEPLOYMENT_FACTORY_JSON, DEPLOYMENT_MARKET_JSON } from "./lib/paths";
import { addressOrDefault, requireAddress } from "./lib/validate";

type FactoryDeployment = { factory: string };
type MarketDeployment = { market: string; factory?: string };

const DEFAULT_RESOLVER_ADDRESS = "0xd3899fe302b149e6130b56d6843e04c22b169adf";

async function main(): Promise<void> {
  const [signer] = await hre.ethers.getSigners();

  let factoryAddress =
    process.env.FACTORY_ADDRESS ||
    readJsonIfExists<FactoryDeployment>(DEPLOYMENT_FACTORY_JSON)?.factory;
  if (!factoryAddress && hre.network.name === "hardhat") {
    console.log("No FACTORY_ADDRESS provided on hardhat network; deploying a fresh factory for tests...");

    const treasuryAddress = addressOrDefault(
      hre,
      "TREASURY_ADDRESS",
      process.env.TREASURY_ADDRESS,
      signer.address,
    );

    const resolverAddress = addressOrDefault(
      hre,
      "RESOLVER_ADDRESS",
      process.env.RESOLVER_ADDRESS,
      DEFAULT_RESOLVER_ADDRESS,
    );

    const PredictionMarketFactory = await hre.ethers.getContractFactory("PredictionMarketFactory");
    const factory = await PredictionMarketFactory.deploy(treasuryAddress, resolverAddress);
    await factory.waitForDeployment();
    factoryAddress = await factory.getAddress();
    console.log("✅ Factory deployed:", factoryAddress);
  }

  let resolvedFactoryAddress = requireAddress(hre, "FACTORY_ADDRESS", factoryAddress);

  const marketAddress =
    process.env.MARKET_ADDRESS ||
    readJsonIfExists<MarketDeployment>(DEPLOYMENT_MARKET_JSON)?.market ||
    "";

  console.log("Network:", hre.network.name, "chainId:", hre.network.config.chainId);
  console.log("Signer:", signer.address);
  console.log("Factory:", resolvedFactoryAddress);

  const factoryCode = await hre.ethers.provider.getCode(resolvedFactoryAddress);
  if (factoryCode === "0x") {
    if (hre.network.name === "hardhat") {
      console.log(
        "FACTORY_ADDRESS points to an empty address on hardhat network; deploying a fresh factory for tests...",
      );

      const treasuryAddress = addressOrDefault(
        hre,
        "TREASURY_ADDRESS",
        process.env.TREASURY_ADDRESS,
        signer.address,
      );

      const resolverAddress = addressOrDefault(
        hre,
        "RESOLVER_ADDRESS",
        process.env.RESOLVER_ADDRESS,
        DEFAULT_RESOLVER_ADDRESS,
      );

      const PredictionMarketFactory = await hre.ethers.getContractFactory("PredictionMarketFactory");
      const deployed = await PredictionMarketFactory.deploy(treasuryAddress, resolverAddress);
      await deployed.waitForDeployment();
      resolvedFactoryAddress = await deployed.getAddress();
      console.log("✅ Factory deployed:", resolvedFactoryAddress);
    } else {
      throw new Error(
        `No contract found at FACTORY_ADDRESS=${resolvedFactoryAddress} on network=${hre.network.name}. Deploy first (or use the correct network / FACTORY_ADDRESS).`,
      );
    }
  }

  const factory = await hre.ethers.getContractAt("PredictionMarketFactory", resolvedFactoryAddress);

  const treasury = await factory.treasury();
  const resolver = await factory.resolver();
  const totalMarkets = await factory.totalMarkets();

  console.log("Factory.treasury():", treasury);
  console.log("Factory.resolver():", resolver);
  console.log("Factory.totalMarkets():", totalMarkets.toString());

  let resolvedMarketAddress = marketAddress;
  if (!hre.ethers.isAddress(resolvedMarketAddress)) {
    const markets = await factory.getAllMarkets();
    if (markets.length === 0) {
      if (hre.network.name !== "hardhat") {
        throw new Error(
          "No markets found. Run scripts/deploy/create-market.ts first or set MARKET_ADDRESS.",
        );
      }

      console.log("No markets found on hardhat network; creating a fresh market for tests...");
      const marketName = process.env.MARKET_NAME || "BTC/USD";
      const marketSymbol = process.env.MARKET_SYMBOL || "BTC";
      const coinId = process.env.COIN_ID || "bitcoin";
      const tx = await factory.createMarket(marketName, marketSymbol, coinId);
      await tx.wait();
      const created = await factory.getAllMarkets();
      resolvedMarketAddress = created[created.length - 1]!;
      console.log("✅ Market created:", resolvedMarketAddress);
    } else {
      resolvedMarketAddress = markets[0]!;
    }
  }

  console.log("Market:", resolvedMarketAddress);

  const marketCode = await hre.ethers.provider.getCode(resolvedMarketAddress);
  if (marketCode === "0x") {
    if (hre.network.name === "hardhat") {
      console.log(
        "MARKET_ADDRESS points to an empty address on hardhat network; creating a fresh market for tests...",
      );
      const marketName = process.env.MARKET_NAME || "BTC/USD";
      const marketSymbol = process.env.MARKET_SYMBOL || "BTC";
      const coinId = process.env.COIN_ID || "bitcoin";
      const tx = await factory.createMarket(marketName, marketSymbol, coinId);
      await tx.wait();
      const all = await factory.getAllMarkets();
      resolvedMarketAddress = all[all.length - 1]!;
      console.log("✅ Market created:", resolvedMarketAddress);
    } else {
      throw new Error(
        `No contract found at MARKET_ADDRESS=${resolvedMarketAddress} on network=${hre.network.name}. Create/deploy the market first (or use the correct network / MARKET_ADDRESS).`,
      );
    }
  }

  const market = await hre.ethers.getContractAt("PredictionMarket", resolvedMarketAddress);

  const marketCoinId = await market.coinId();
  const marketResolver = await market.resolver();
  const marketTreasury = await market.treasury();
  const marketOwner = await market.owner();

  console.log("Market.coinId():", marketCoinId);
  console.log("Market.resolver():", marketResolver);
  console.log("Market.treasury():", marketTreasury);
  console.log("Market.owner():", marketOwner);

  // Read-only sanity calls
  const currentEpoch = await market.currentEpoch();
  console.log("Market.currentEpoch():", currentEpoch.toString());

  // Owner-only call sanity: setResolver (set to same value, should succeed)
  console.log("Calling Market.setResolver(marketResolver)...");
  const tx1 = await market.setResolver(marketResolver);
  await tx1.wait();
  console.log("✅ Market.setResolver ok:", tx1.hash);

  // Negative test: handlePriceResponse should revert for non-resolver callers
  console.log("Calling Market.handlePriceResponse(1, 123) as non-resolver (expect revert)...");
  try {
    await (await market.handlePriceResponse(1, 123)).wait();
    throw new Error("Unexpected success: handlePriceResponse should revert for non-resolver");
  } catch (err: any) {
    const message = typeof err?.message === "string" ? err.message : String(err);
    if (!message.toLowerCase().includes("only resolver")) {
      console.log("Got revert (non-matching message):", message);
    } else {
      console.log("✅ Revert confirmed: Only resolver");
    }
  }

  console.log("✅ Function tests complete");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
