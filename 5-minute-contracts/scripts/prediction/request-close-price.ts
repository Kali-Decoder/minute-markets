import hre from "hardhat";

import {
  getMarket,
  parseEtherEnv,
  requireUint,
} from "./_common";

async function main() {
  // ============================================================
  // ENV
  // ============================================================

  const epoch =
    requireUint(
      "EPOCH",
      process.env.EPOCH
    );

  const value =
    parseEtherEnv(
      "REQUEST_VALUE_ETH",
      process.env.REQUEST_VALUE_ETH,
      "0.12"
    );

  // ============================================================
  // SIGNER
  // ============================================================

  const [signer] =
    await hre.ethers.getSigners();

  // ============================================================
  // MARKET
  // ============================================================

  const market =
    await getMarket();

  const marketAddress =
    await market.getAddress();

  // ============================================================
  // NETWORK INFO
  // ============================================================

  console.log(
    "\n=== REQUEST CLOSE PRICE ===\n"
  );

  console.log(
    "Network:",
    hre.network.name
  );

  console.log(
    "Chain ID:",
    hre.network.config.chainId
  );

  console.log(
    "Signer:",
    signer.address
  );

  console.log(
    "Market:",
    marketAddress
  );

  console.log(
    "Epoch:",
    epoch.toString()
  );

  console.log(
    "Request Deposit:",
    hre.ethers.formatEther(
      value
    ),
    "STT"
  );

  // ============================================================
  // ROUND INFO
  // ============================================================

  const round =
    await market.getRound(
      epoch
    );

  console.log(
    "\n=== ROUND INFO ===\n"
  );

  console.log({
    status:
      round.status.toString(),

    lockPrice:
      round.lockPrice.toString(),

    totalPool:
      hre.ethers.formatEther(
        round.totalPool
      ),

    upPool:
      hre.ethers.formatEther(
        round.upPool
      ),

    downPool:
      hre.ethers.formatEther(
        round.downPool
      ),
  });

  // ============================================================
  // REQUEST CLOSE PRICE
  // ============================================================

  console.log(
    "\n📡 Requesting close price from Somnia Agents..."
  );

  const tx =
    await market.requestClosePrice(
      epoch,
      {
        value,
      }
    );

  console.log(
    "Transaction:",
    tx.hash
  );

  const receipt =
    await tx.wait();

  console.log(
    "Confirmed in block:",
    receipt?.blockNumber
  );

  // ============================================================
  // PARSE EVENTS MANUALLY
  // ============================================================

  console.log(
    "\n✅ Close Price Request Sent"
  );

  const iface =
    market.interface;

  for (const log of receipt.logs) {
    try {
      const parsed =
        iface.parseLog(log);

      if (
        parsed?.name ===
        "ClosePriceRequested"
      ) {
        console.log({
          epoch:
            parsed.args[0].toString(),

          requestId:
            parsed.args[1].toString(),
        });
      }
    } catch {}
  }

  // ============================================================
  // WAITING MESSAGE
  // ============================================================

  console.log(
    "\n⏳ Waiting for Somnia validator consensus..."
  );

  console.log(
    "The platform will automatically call handleResponse()"
  );

  console.log(
    "After consensus, the round will become ENDED.\n"
  );
}

main().catch((error) => {
  console.error(error);

  process.exitCode = 1;
});