import "dotenv/config";
import hre from "hardhat";

// ============================================================
// RESOLVE MARKET ADDRESS
// ============================================================

export async function resolveMarketAddress(): Promise<string> {
  const marketAddress =
    process.env.MARKET_ADDRESS;

  if (!marketAddress) {
    throw new Error(
      "MARKET_ADDRESS missing in .env"
    );
  }

  // validate contract exists
  const code =
    await hre.ethers.provider.getCode(
      marketAddress
    );

  if (code === "0x") {
    throw new Error(
      `No contract found at ${marketAddress}`
    );
  }

  return marketAddress;
}

// ============================================================
// GET MARKET CONTRACT
// ============================================================

export async function getMarket() {
  const marketAddress =
    await resolveMarketAddress();

  return hre.ethers.getContractAt(
    "PredictionMarket",
    marketAddress
  );
}

// ============================================================
// REQUIRE UINT
// ============================================================

export function requireUint(
  name: string,
  value?: string
): bigint {
  if (!value) {
    throw new Error(
      `${name} is required`
    );
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(
      `Invalid ${name}: ${value}`
    );
  }

  return BigInt(value);
}

// ============================================================
// PARSE ETHER ENV
// ============================================================

export function parseEtherEnv(
  name: string,
  value: string | undefined,
  fallbackEth: string
): bigint {
  const raw =
    value ?? fallbackEth;

  try {
    return hre.ethers.parseEther(
      raw
    );
  } catch {
    throw new Error(
      `Invalid ${name}: ${raw}`
    );
  }
}