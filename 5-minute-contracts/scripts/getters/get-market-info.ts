import "dotenv/config";
import hre from "hardhat";

import { readJsonIfExists } from "../lib/io";
import { DEPLOYMENT_FACTORY_JSON, DEPLOYMENT_MARKET_JSON } from "../lib/paths";
import { requireAddress } from "../lib/validate";

type FactoryDeployment = { factory: string; network?: string; chainId?: number };
type MarketDeployment = { market: string; network?: string; chainId?: number };

async function main(): Promise<void> {
  const factoryDeployment = readJsonIfExists<FactoryDeployment>(DEPLOYMENT_FACTORY_JSON);
  const marketDeployment = readJsonIfExists<MarketDeployment>(DEPLOYMENT_MARKET_JSON);

  const factoryAddress = process.env.FACTORY_ADDRESS || factoryDeployment?.factory;
  const resolvedFactoryAddress = requireAddress(hre, "FACTORY_ADDRESS", factoryAddress);

  const marketAddress = process.env.MARKET_ADDRESS || marketDeployment?.market;
  const resolvedMarketAddress = requireAddress(hre, "MARKET_ADDRESS", marketAddress);

  console.log("Network:", hre.network.name, "chainId:", hre.network.config.chainId);
  console.log("Factory:", resolvedFactoryAddress);
  console.log("Market:", resolvedMarketAddress);
  const deploymentChainId = factoryDeployment?.chainId ?? marketDeployment?.chainId;
  const deploymentNetwork = factoryDeployment?.network ?? marketDeployment?.network;
  if (
    deploymentChainId != null &&
    hre.network.config.chainId != null &&
    deploymentChainId !== hre.network.config.chainId
  ) {
    console.log(
      `⚠️  deployments/*.json is for chainId=${deploymentChainId} (${deploymentNetwork ?? "unknown"}). Run with --network matching that chain.`,
    );
  }

  const code = await hre.ethers.provider.getCode(resolvedFactoryAddress);
  if (code === "0x") {
    throw new Error(
      `No contract found at FACTORY_ADDRESS=${resolvedFactoryAddress} on network=${hre.network.name}. Did you forget --network (or FACTORY_ADDRESS)?`,
    );
  }

  const factory = await hre.ethers.getContractAt("PredictionMarketFactory", resolvedFactoryAddress);
  const info = await factory.getMarketInfo(resolvedMarketAddress);

  console.log("getMarketInfo():");
  console.log(" marketAddress:", info.marketAddress);
  console.log(" marketName:", info.marketName);
  console.log(" marketSymbol:", info.marketSymbol);
  console.log(" coinId:", info.coinId);
  console.log(" resolver:", info.resolver);
  console.log(" creator:", info.creator);
  console.log(" createdAt:", info.createdAt.toString());
  console.log(" active:", info.active);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
