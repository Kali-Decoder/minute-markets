import hre from "hardhat";
import { getMarket, requireUint } from "./_common";

async function main(): Promise<void> {
  const intervalSeconds = requireUint("ROUND_INTERVAL_SECONDS", process.env.ROUND_INTERVAL_SECONDS);

  const [signer] = await hre.ethers.getSigners();
  const market = await getMarket();

  console.log("Network:", hre.network.name, "chainId:", hre.network.config.chainId);
  console.log("Signer:", signer.address);
  console.log("Market:", await market.getAddress());
  console.log("ROUND_INTERVAL_SECONDS:", intervalSeconds.toString());

  const tx = await market.setRoundInterval(intervalSeconds);
  await tx.wait();
  console.log("✅ setRoundInterval tx:", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

