import "dotenv/config";
import hre from "hardhat";
import { resolvePathFromRoot, writeJson } from "../lib/io";

type BetAccount = {
  address: string;
  privateKey: string;
};

async function main() {
  const count = Number(process.env.ACCOUNT_COUNT ?? "50");
  const outputPath = resolvePathFromRoot(
    process.env.ACCOUNTS_JSON_PATH ?? "bet-accounts.json"
  );

  if (!Number.isInteger(count) || count < 1) {
    throw new Error("ACCOUNT_COUNT must be a positive integer");
  }

  const accounts: BetAccount[] = [];

  for (let i = 0; i < count; i++) {
    const wallet = hre.ethers.Wallet.createRandom();
    accounts.push({
      address: wallet.address,
      privateKey: wallet.privateKey,
    });
  }

  writeJson(outputPath, accounts);

  console.log(`\nGenerated ${count} bet accounts`);
  console.log(`Saved to: ${outputPath}`);
  console.log("\nFund each wallet with STT before running bet-live-pools.ts");
  console.log("Example addresses:\n");

  for (const account of accounts.slice(0, 5)) {
    console.log(`- ${account.address}`);
  }

  if (accounts.length > 5) {
    console.log(`... and ${accounts.length - 5} more`);
  }

  console.log("\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
