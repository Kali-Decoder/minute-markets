import hre from "hardhat";
import { getMarket } from "./_common";
import { requireAddress } from "../lib/validate";

async function main(): Promise<void> {
  const resolver = requireAddress(hre, "RESOLVER_ADDRESS", process.env.RESOLVER_ADDRESS);

  const [signer] = await hre.ethers.getSigners();
  const market = await getMarket();

  console.log("Network:", hre.network.name, "chainId:", hre.network.config.chainId);
  console.log("Signer:", signer.address);
  console.log("Market:", await market.getAddress());
  console.log("Resolver:", resolver);

  const tx = await market.setResolver(resolver);
  await tx.wait();
  console.log("✅ setResolver tx:", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

