import hre from "hardhat";
import { getMarket } from "./_common";

async function main(): Promise<void> {
  const market = await getMarket();

  console.log("Network:", hre.network.name, "chainId:", hre.network.config.chainId);
  console.log("Market:", await market.getAddress());

  const bal = await market.getContractBalance();
  console.log("getContractBalance():", bal.toString());
  console.log("as ETH:", hre.ethers.formatEther(bal));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

