import hre from "hardhat";
import { getMarket, requireUint } from "./_common";

function parseEpochs(): bigint[] {
  if (process.env.EPOCHS) {
    const parts = process.env.EPOCHS.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) throw new Error("EPOCHS is empty");
    return parts.map((p) => requireUint("EPOCHS item", p));
  }
  return [requireUint("EPOCH", process.env.EPOCH)];
}

async function main(): Promise<void> {
  const epochs = parseEpochs();

  const [signer] = await hre.ethers.getSigners();
  const market = await getMarket();

  console.log("Network:", hre.network.name, "chainId:", hre.network.config.chainId);
  console.log("Signer:", signer.address);
  console.log("Market:", await market.getAddress());
  console.log("Epochs:", epochs.map((e) => e.toString()).join(", "));

  const tx = await market.claim(epochs);
  await tx.wait();
  console.log("✅ claim tx:", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

