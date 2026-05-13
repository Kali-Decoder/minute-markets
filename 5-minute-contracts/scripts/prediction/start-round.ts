import hre from "hardhat";
import { getMarket } from "./_common";

async function main(): Promise<void> {
  const [signer] = await hre.ethers.getSigners();
  const market = await getMarket();

  console.log("Network:", hre.network.name, "chainId:", hre.network.config.chainId);
  console.log("Signer:", signer.address);
  console.log("Market:", await market.getAddress());

  const tx = await market.startRound();
  await tx.wait();
  console.log("✅ startRound tx:", tx.hash);

  const currentEpoch = await market.currentEpoch();
  console.log("currentEpoch:", currentEpoch.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

