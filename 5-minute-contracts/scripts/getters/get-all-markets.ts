import "dotenv/config";
import hre from "hardhat";
import {
  getEpochFactory,
  readEpochPoolState,
  resolveFactoryAddress,
} from "../prediction/_common";

async function main() {
  const factoryAddress = await resolveFactoryAddress();
  const factory = await getEpochFactory();

  const [markets, owner, treasury, totalMarkets] = await Promise.all([
    factory.getAllMarkets(),
    factory.owner(),
    factory.treasury(),
    factory.totalMarkets(),
  ]);

  console.log("\n=== ALL PREDICTION MARKETS ===\n");
  console.log("Network:", hre.network.name);
  console.log("Factory:", factoryAddress);
  console.log("Factory owner:", owner);
  console.log("Factory treasury:", treasury);
  console.log("totalMarkets():", totalMarkets.toString());
  console.log("getAllMarkets():", markets.length);

  if (markets.length === 0) {
    console.log("\nNo markets found.\n");
    return;
  }

  for (let i = 0; i < markets.length; i++) {
    const marketAddress = markets[i];

    let factoryInfo: Record<string, unknown> = {};
    try {
      const info = await factory.getMarketInfo(marketAddress);
      factoryInfo = {
        marketName: info.marketName,
        marketSymbol: info.marketSymbol,
        coinId: info.coinId,
        creator: info.creator,
        createdAt: info.createdAt.toString(),
        active: info.active,
      };
    } catch {
      factoryInfo = { factoryInfo: "unavailable" };
    }

    const state = await readEpochPoolState(marketAddress);

    console.log(`\n#${i + 1}`);
    if (!state) {
      console.log({ marketAddress, ...factoryInfo, note: "could not read pool" });
      continue;
    }

    console.log({
      marketAddress: state.address,
      marketName: state.name,
      marketSymbol: state.symbol,
      coinId: state.coinId,
      owner: state.owner,
      treasury: state.treasury,
      currentEpoch: state.currentEpoch?.toString() ?? "—",
      totalTreasury: `${hre.ethers.formatEther(state.totalTreasury)} STT`,
      balance: `${hre.ethers.formatEther(state.contractBalance)} STT`,
      ...factoryInfo,
    });
  }

  console.log("\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
