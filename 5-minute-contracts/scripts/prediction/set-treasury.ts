import hre from "hardhat";
import { getMarket } from "./_common";
import { requireAddress } from "../lib/validate";

async function main(): Promise<void> {
  const treasury = requireAddress(hre, "TREASURY_ADDRESS", process.env.TREASURY_ADDRESS);

  const [signer] = await hre.ethers.getSigners();
  const market = await getMarket();

  console.log("Network:", hre.network.name, "chainId:", hre.network.config.chainId);
  console.log("Signer:", signer.address);
  console.log("Market:", await market.getAddress());
  console.log("Treasury:", treasury);

  const tx = await market.setTreasury(treasury);
  await tx.wait();
  console.log("✅ setTreasury tx:", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

