import hre from "hardhat";
import { getMarket, requireUint } from "./_common";

async function main(): Promise<void> {
  // fee is in basis points where 300 = 3%. Contract enforces max 1000.
  const feeBps = requireUint("TREASURY_FEE_BPS", process.env.TREASURY_FEE_BPS);

  const [signer] = await hre.ethers.getSigners();
  const market = await getMarket();

  console.log("Network:", hre.network.name, "chainId:", hre.network.config.chainId);
  console.log("Signer:", signer.address);
  console.log("Market:", await market.getAddress());
  console.log("TREASURY_FEE_BPS:", feeBps.toString());

  const tx = await market.setTreasuryFee(feeBps);
  await tx.wait();
  console.log("✅ setTreasuryFee tx:", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

