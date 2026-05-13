import hre from "hardhat";
import { getMarket, parseEtherEnv, requireUint } from "./_common";

async function main(): Promise<void> {
  const epoch = requireUint("EPOCH", process.env.EPOCH);
  const value = parseEtherEnv("REQUEST_VALUE_ETH", process.env.REQUEST_VALUE_ETH, "0");

  const [signer] = await hre.ethers.getSigners();
  const market = await getMarket();

  console.log("Network:", hre.network.name, "chainId:", hre.network.config.chainId);
  console.log("Signer:", signer.address);
  console.log("Market:", await market.getAddress());
  console.log("Epoch:", epoch.toString());
  console.log("Value:", hre.ethers.formatEther(value));

  const tx = await market.requestLockPrice(epoch, { value });
  await tx.wait();
  console.log("✅ requestLockPrice tx:", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

