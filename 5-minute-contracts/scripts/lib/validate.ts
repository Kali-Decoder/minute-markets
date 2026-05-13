import type hre from "hardhat";

export function requireAddress(
  hardhat: typeof hre,
  name: string,
  value: string | undefined,
): string {
  if (!value) throw new Error(`${name} is required`);
  if (!hardhat.ethers.isAddress(value)) throw new Error(`Invalid ${name}: ${value}`);
  return value;
}

export function addressOrDefault(
  hardhat: typeof hre,
  name: string,
  value: string | undefined,
  fallback: string,
): string {
  const resolved = value ?? fallback;
  if (!hardhat.ethers.isAddress(resolved)) throw new Error(`Invalid ${name}: ${resolved}`);
  return resolved;
}

