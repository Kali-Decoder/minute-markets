import hre from "hardhat";
import { getMarket, parseEtherEnv } from "./_common";

async function main(): Promise<void> {
  const minBet = parseEtherEnv("MIN_BET_ETH", process.env.MIN_BET_ETH, "0.01");

  const [signer] = await hre.ethers.getSigners();
  const market = await getMarket();

  console.log("Network:", hre.network.name, "chainId:", hre.network.config.chainId);
  console.log("Signer:", signer.address);
  console.log("Market:", await market.getAddress());
  console.log("MIN_BET_ETH:", hre.ethers.formatEther(minBet));

  const tx = await market.setMinBetAmount(minBet);
  await tx.wait();
  console.log("✅ setMinBetAmount tx:", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

