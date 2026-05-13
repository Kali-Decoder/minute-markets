import hre from "hardhat";
import { getMarket, requireUint } from "./_common";
import { requireAddress } from "../lib/validate";

async function main(): Promise<void> {
  const epoch = requireUint("EPOCH", process.env.EPOCH);
  const user = requireAddress(hre, "USER_ADDRESS", process.env.USER_ADDRESS);

  const market = await getMarket();

  console.log("Network:", hre.network.name, "chainId:", hre.network.config.chainId);
  console.log("Market:", await market.getAddress());
  console.log("Epoch:", epoch.toString());
  console.log("User:", user);

  const bet = await market.getUserBet(epoch, user);
  console.log("getUserBet():");
  console.log(" position:", bet.position.toString());
  console.log(" amount:", bet.amount.toString());
  console.log(" claimed:", bet.claimed);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

