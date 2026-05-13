import hre from "hardhat";
import { getMarket, requireUint } from "./_common";

async function main(): Promise<void> {
  const epoch = requireUint("EPOCH", process.env.EPOCH);
  const market = await getMarket();

  console.log("Network:", hre.network.name, "chainId:", hre.network.config.chainId);
  console.log("Market:", await market.getAddress());
  console.log("Epoch:", epoch.toString());

  const round = await market.getRound(epoch);
  console.log("getRound():");
  console.log(" epoch:", round.epoch.toString());
  console.log(" startTimestamp:", round.startTimestamp.toString());
  console.log(" lockTimestamp:", round.lockTimestamp.toString());
  console.log(" closeTimestamp:", round.closeTimestamp.toString());
  console.log(" lockPrice:", round.lockPrice.toString());
  console.log(" closePrice:", round.closePrice.toString());
  console.log(" totalPool:", round.totalPool.toString());
  console.log(" upPool:", round.upPool.toString());
  console.log(" downPool:", round.downPool.toString());
  console.log(" rewardAmount:", round.rewardAmount.toString());
  console.log(" treasuryAmount:", round.treasuryAmount.toString());
  console.log(" upWon:", round.upWon);
  console.log(" status:", round.status.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

