import "dotenv/config";
import hre from "hardhat";

import { readJsonIfExists } from "../lib/io";
import { DEPLOYMENT_MARKET_JSON } from "../lib/paths";
import { requireAddress } from "../lib/validate";

type MarketDeployment = { market: string; network?: string; chainId?: number };

export async function resolveMarketAddress(): Promise<string> {
  const deployment = readJsonIfExists<MarketDeployment>(DEPLOYMENT_MARKET_JSON);
  const marketAddress = process.env.MARKET_ADDRESS || deployment?.market;
  const resolved = requireAddress(hre, "MARKET_ADDRESS", marketAddress);

  if (
    deployment?.chainId != null &&
    hre.network.config.chainId != null &&
    deployment.chainId !== hre.network.config.chainId
  ) {
    // eslint-disable-next-line no-console
    console.log(
      `⚠️  deployments/market.json is for chainId=${deployment.chainId} (${deployment.network ?? "unknown"}). Run with --network matching that chain.`,
    );
  }

  const code = await hre.ethers.provider.getCode(resolved);
  if (code === "0x") {
    throw new Error(
      `No contract found at MARKET_ADDRESS=${resolved} on network=${hre.network.name}. Did you forget --network (or MARKET_ADDRESS)?`,
    );
  }

  return resolved;
}

export async function getMarket() {
  const marketAddress = await resolveMarketAddress();
  return hre.ethers.getContractAt("PredictionMarket", marketAddress);
}

export function requireUint(name: string, value: string | undefined): bigint {
  if (!value) throw new Error(`${name} is required`);
  if (!/^\d+$/.test(value)) throw new Error(`Invalid ${name}: ${value}`);
  return BigInt(value);
}

export function parseEtherEnv(name: string, value: string | undefined, fallbackEth: string): bigint {
  const raw = value ?? fallbackEth;
  return hre.ethers.parseEther(raw);
}

