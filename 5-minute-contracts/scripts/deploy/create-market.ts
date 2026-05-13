import "dotenv/config";
import hre from "hardhat";

import { writeJson } from "../lib/io";
import { DEPLOYMENT_MARKET_JSON } from "../lib/paths";
import { requireAddress } from "../lib/validate";

async function main(): Promise<void> {
  // Required env
  const factoryAddress = requireAddress(hre, "FACTORY_ADDRESS", process.env.FACTORY_ADDRESS);

  // Optional env (defaults provided)
  const marketName = process.env.MARKET_NAME || "BTC/USD";
  const marketSymbol = process.env.MARKET_SYMBOL || "BTC";
  const coinId = process.env.COIN_ID || "bitcoin";

  const [signer] = await hre.ethers.getSigners();

  console.log("Network:", hre.network.name, "chainId:", hre.network.config.chainId);
  console.log("Signer:", signer.address);
  console.log("Factory:", factoryAddress);
  console.log("Creating market:", { marketName, marketSymbol, coinId });

  const code = await hre.ethers.provider.getCode(factoryAddress);
  if (code === "0x") {
    throw new Error(
      `No contract found at FACTORY_ADDRESS=${factoryAddress} on network=${hre.network.name}. Deploy first (or use the correct network / FACTORY_ADDRESS).`,
    );
  }

  const factory = await hre.ethers.getContractAt("PredictionMarketFactory", factoryAddress);
  const before = await factory.totalMarkets();
  const tx = await factory.createMarket(marketName, marketSymbol, coinId);
  const receipt = await tx.wait();
  const after = await factory.totalMarkets();

  if (after !== before + 1n) {
    throw new Error(`Unexpected totalMarkets change: before=${before} after=${after}`);
  }

  const markets = await factory.getAllMarkets();
  const marketAddress = markets[markets.length - 1] || "";
  if (!hre.ethers.isAddress(marketAddress)) throw new Error("Market address not found after createMarket()");

  console.log("✅ Market created:", marketAddress);

  writeJson(DEPLOYMENT_MARKET_JSON, {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    factory: factoryAddress,
    market: marketAddress,
    marketName,
    marketSymbol,
    coinId,
    createdAt: new Date().toISOString(),
    txHash: (receipt as any)?.hash ?? (receipt as any)?.transactionHash,
  });

  console.log("📁 Saved:", DEPLOYMENT_MARKET_JSON);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
