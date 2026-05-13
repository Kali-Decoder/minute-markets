import hre from "hardhat";
import { getMarket, requireUint } from "./_common";

async function main(): Promise<void> {
  const epoch = requireUint("EPOCH", process.env.EPOCH);

  const [signer] = await hre.ethers.getSigners();
  const market = await getMarket();

  console.log("Network:", hre.network.name, "chainId:", hre.network.config.chainId);
  console.log("Signer:", signer.address);
  console.log("Market:", await market.getAddress());
  console.log("Epoch:", epoch.toString());

  const tx = await market.cancelRound(epoch);
  await tx.wait();
  console.log("✅ cancelRound tx:", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

