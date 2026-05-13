import hre from "hardhat";
import { getMarket } from "./_common";

async function main(): Promise<void> {
  const [signer] = await hre.ethers.getSigners();
  const market = await getMarket();

  console.log("Network:", hre.network.name, "chainId:", hre.network.config.chainId);
  console.log("Signer:", signer.address);
  console.log("Market:", await market.getAddress());

  const tx = await market.pause();
  await tx.wait();
  console.log("✅ pause tx:", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

