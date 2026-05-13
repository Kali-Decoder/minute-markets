import "dotenv/config";
import hre from "hardhat";

import { writeJson } from "../lib/io";
import { DEPLOYMENT_FACTORY_JSON } from "../lib/paths";

async function main() {
  // ============================================================
  // SIGNER
  // ============================================================

  const [deployer] =
    await hre.ethers.getSigners();

  // ============================================================
  // TREASURY
  // ============================================================

  const treasuryAddress =
    process.env.TREASURY_ADDRESS ||
    deployer.address;

  console.log(
    "\n=== DEPLOYING FACTORY ===\n"
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
    "Deployer:",
    deployer.address
  );

  console.log(
    "Treasury:",
    treasuryAddress
  );

  // ============================================================
  // DEPLOY FACTORY
  // ============================================================

  const Factory =
    await hre.ethers.getContractFactory(
      "PredictionMarketFactory"
    );

  const factory =
    await Factory.deploy(
      treasuryAddress
    );

  await factory.waitForDeployment();

  const factoryAddress =
    await factory.getAddress();

  // ============================================================
  // SUCCESS
  // ============================================================

  console.log(
    "\n✅ Factory Deployed Successfully"
  );

  console.log(
    "Factory Address:",
    factoryAddress
  );

  // ============================================================
  // SAVE DEPLOYMENT
  // ============================================================

  writeJson(
    DEPLOYMENT_FACTORY_JSON,
    {
      network:
        hre.network.name,

      chainId:
        hre.network.config
          .chainId,

      factory:
        factoryAddress,

      owner:
        deployer.address,

      treasury:
        treasuryAddress,

      deployedAt:
        new Date().toISOString(),
    }
  );

  console.log(
    "\n📁 Saved:"
  );

  console.log(
    DEPLOYMENT_FACTORY_JSON
  );
}

main().catch((error) => {
  console.error(error);

  process.exitCode = 1;
});