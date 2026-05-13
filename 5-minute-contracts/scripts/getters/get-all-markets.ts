import "dotenv/config";
import hre from "hardhat";

import { readJsonIfExists } from "../lib/io";
import { DEPLOYMENT_FACTORY_JSON } from "../lib/paths";
import { requireAddress } from "../lib/validate";

type FactoryDeployment = { factory: string; network?: string; chainId?: number };

async function main(): Promise<void> {
  const deployment = readJsonIfExists<FactoryDeployment>(DEPLOYMENT_FACTORY_JSON);
  const factoryAddress = process.env.FACTORY_ADDRESS || deployment?.factory;

  const resolvedFactoryAddress = requireAddress(hre, "FACTORY_ADDRESS", factoryAddress);

  console.log("Network:", hre.network.name, "chainId:", hre.network.config.chainId);
  console.log("Factory:", resolvedFactoryAddress);
  if (
    deployment?.chainId != null &&
    hre.network.config.chainId != null &&
    deployment.chainId !== hre.network.config.chainId
  ) {
    console.log(
      `⚠️  deployments/factory.json is for chainId=${deployment.chainId} (${deployment.network ?? "unknown"}). Run with --network matching that chain.`,
    );
  }

  const code = await hre.ethers.provider.getCode(resolvedFactoryAddress);
  if (code === "0x") {
    throw new Error(
      `No contract found at FACTORY_ADDRESS=${resolvedFactoryAddress} on network=${hre.network.name}. Did you forget --network (or FACTORY_ADDRESS)?`,
    );
  }

  const factory = await hre.ethers.getContractAt("PredictionMarketFactory", resolvedFactoryAddress);
  const markets = await factory.getAllMarkets();

  console.log("Total markets:", markets.length);
  for (const [index, market] of markets.entries()) {
    console.log(`#${index}:`, market);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
