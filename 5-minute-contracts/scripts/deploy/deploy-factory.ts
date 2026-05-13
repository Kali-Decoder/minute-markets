import "dotenv/config";
import hre from "hardhat";

import { writeJson } from "../lib/io";
import { DEPLOYMENT_FACTORY_JSON } from "../lib/paths";

const DEFAULT_RESOLVER_ADDRESS = "0xd3899fe302b149e6130b56d6843e04c22b169adf";

async function main(): Promise<void> {
  const [deployer] = await hre.ethers.getSigners();

  const treasuryAddress =deployer.address ;


  const resolverAddress = DEFAULT_RESOLVER_ADDRESS; 
  console.log("Network:", hre.network.name, "chainId:", hre.network.config.chainId);
  console.log("Deployer:", deployer.address);
  console.log("Treasury:", treasuryAddress);
  console.log("Resolver:", resolverAddress);

  const PredictionMarketFactory = await hre.ethers.getContractFactory("PredictionMarketFactory");
  const factory = await PredictionMarketFactory.deploy(treasuryAddress, resolverAddress);
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log("✅ Factory deployed:", factoryAddress);

  writeJson(DEPLOYMENT_FACTORY_JSON, {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    factory: factoryAddress,
    owner: deployer.address,
    treasury: treasuryAddress,
    resolver: resolverAddress,
    deployedAt: new Date().toISOString(),
  });

  console.log("📁 Saved:", DEPLOYMENT_FACTORY_JSON);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

