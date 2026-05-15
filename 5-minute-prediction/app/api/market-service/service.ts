import { createPublicClient, createWalletClient, decodeEventLog, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Address, Hash } from "viem";
import { somniaTestnet } from "@/app/config/chains";
import { PredictionMarketFactoryABI } from "@/app/config/predictionMarketFactoryAbi";
import { PredictionMarketABI } from "@/app/config/predictionMarketAbi";
import { getPredictionMarketFactoryAddress } from "@/app/config/predictionAddresses";

type ServiceState = {
  running: boolean;
  lastError: string | null;
  nextCreateAt: number | null;
  nextLockAt: number | null;
  nextCloseAt: number | null;
  lastCreatedMarket?: {
    address: Address;
    coinId: string;
    createdAt: number;
    txHash: Hash;
  };
  lastActions?: {
    startedAt: number | null;
    lockRequestedAt: number | null;
    closeRequestedAt: number | null;
    startTxHash: Hash | null;
    lockTxHash: Hash | null;
    closeTxHash: Hash | null;
  };
};

type StartOptions = {
  createEveryMs: number; // Interval between completely new market setups
  lockAfterMs: number;   // 5 minutes betting window (Time between startRound and requestLockPrice)
  closeAfterMs: number;  // 5 minutes locking window (Time between requestLockPrice and requestClosePrice)
};

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

const COINS = [
  { coinId: "bitcoin", symbol: "BTC" },
  { coinId: "ethereum", symbol: "ETH" },
  { coinId: "solana", symbol: "SOL" },
  { coinId: "somnia", symbol: "SOMI" },
] as const;

export class MarketService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private timeouts: ReturnType<typeof setTimeout>[] = [];
  private busy = false;

  private state: ServiceState = {
    running: false,
    lastError: null,
    nextCreateAt: null,
    nextLockAt: null,
    nextCloseAt: null,
    lastActions: {
      startedAt: null,
      lockRequestedAt: null,
      closeRequestedAt: null,
      startTxHash: null,
      lockTxHash: null,
      closeTxHash: null,
    },
  };

  getState(): ServiceState {
    return { ...this.state };
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    for (const t of this.timeouts) clearTimeout(t);
    this.timeouts = [];
    this.busy = false;
    this.state.running = false;
    this.state.nextCreateAt = null;
    this.state.nextLockAt = null;
    this.state.nextCloseAt = null;
    this.state.lastActions = {
      startedAt: null,
      lockRequestedAt: null,
      closeRequestedAt: null,
      startTxHash: null,
      lockTxHash: null,
      closeTxHash: null,
    };
  }

  start(options: StartOptions) {
    if (this.state.running) return;

    this.state.running = true;
    this.state.lastError = null;
    this.state.nextCreateAt = Date.now() + options.createEveryMs;
    this.state.nextLockAt = null;
    this.state.nextCloseAt = null;

    const tick = async () => {
      if (!this.state.running) return;
      if (this.busy) return;
      if (!this.state.nextCreateAt) return;
      if (Date.now() < this.state.nextCreateAt) return;

      this.busy = true;
      try {
        // 1. Create a fresh Prediction Market Contract Deployment
        const { marketAddress, coinId, txHash } = await this.createMarket();
        const now = Date.now();
        this.state.lastCreatedMarket = {
          address: marketAddress,
          coinId,
          createdAt: now,
          txHash,
        };
        this.state.lastActions = {
          startedAt: null,
          lockRequestedAt: null,
          closeRequestedAt: null,
          startTxHash: null,
          lockTxHash: null,
          closeTxHash: null,
        };

        // 2. Call startRound() immediately to push status to LIVE so users can bet
        const startHash = await this.startRound(marketAddress);
        this.state.lastActions.startedAt = Date.now();
        this.state.lastActions.startTxHash = startHash;

        // 3. Schedule requestLockPrice() after 5 minutes (lockAfterMs)
        this.state.nextLockAt = Date.now() + options.lockAfterMs;
        this.timeouts.push(
          setTimeout(async () => {
            try {
              if (!this.state.running) return;
              
              const lockHash = await this.requestLockPrice(marketAddress);
              this.state.lastActions!.lockRequestedAt = Date.now();
              this.state.lastActions!.lockTxHash = lockHash;
              this.state.nextLockAt = null;

              // 4. Schedule requestClosePrice() 5 minutes after locking (closeAfterMs)
              this.state.nextCloseAt = Date.now() + options.closeAfterMs;
              this.timeouts.push(
                setTimeout(async () => {
                  try {
                    if (!this.state.running) return;

                    const closeHash = await this.requestClosePrice(marketAddress);
                    this.state.lastActions!.closeRequestedAt = Date.now();
                    this.state.lastActions!.closeTxHash = closeHash;
                    this.state.nextCloseAt = null;
                  } catch (closeErr) {
                    this.state.lastError = closeErr instanceof Error ? closeErr.message : String(closeErr);
                  }
                }, options.closeAfterMs)
              );

            } catch (lockErr) {
              this.state.lastError = lockErr instanceof Error ? lockErr.message : String(lockErr);
            }
          }, options.lockAfterMs)
        );

      } catch (e) {
        this.state.lastError = e instanceof Error ? e.message : String(e);
      } finally {
        this.state.nextCreateAt = Date.now() + options.createEveryMs;
        this.busy = false;
      }
    };

    this.intervalId = setInterval(() => void tick(), 2_000);
    void tick();
  }

  private clients() {
    const rpcUrl = process.env.NEXT_PUBLIC_SOMNIA_RPC_URL || "https://dream-rpc.somnia.network/";
    const pk = getEnv("MARKET_SERVICE_ADMIN_PRIVATE_KEY");
    const account = privateKeyToAccount(pk as `0x${string}`);

    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: http(rpcUrl),
    });

    const walletClient = createWalletClient({
      chain: somniaTestnet,
      transport: http(rpcUrl),
      account,
    });

    const factoryAddress = getPredictionMarketFactoryAddress(somniaTestnet.id);
    if (!factoryAddress) throw new Error("Factory address not configured for Somnia testnet.");

    return { publicClient, walletClient, account, factoryAddress };
  }

  private async createMarket(): Promise<{ marketAddress: Address; coinId: string; txHash: Hash }> {
    const { publicClient, walletClient, factoryAddress } = this.clients();

    const coin = pickRandom(COINS);
    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const marketName = `${coin.symbol} 5m (${stamp})`;
    const marketSymbol = `${coin.symbol}5M`;

    const txHash = await walletClient.writeContract({
      address: factoryAddress,
      abi: PredictionMarketFactoryABI,
      functionName: "createMarket",
      args: [marketName, marketSymbol, coin.coinId],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const log = receipt.logs.find((l) => l.address.toLowerCase() === factoryAddress.toLowerCase());
    if (!log) throw new Error("MarketCreated log not found.");

    const decoded = decodeEventLog({
      abi: PredictionMarketFactoryABI,
      data: log.data,
      topics: log.topics,
    });

    if (decoded.eventName !== "MarketCreated") throw new Error("Unexpected event while decoding createMarket tx.");
    const marketAddress = (decoded.args as { market: Address }).market;
    return { marketAddress, coinId: coin.coinId, txHash };
  }

  private async startRound(market: Address): Promise<Hash> {
    const { publicClient, walletClient } = this.clients();

    // The old contract's startRound() does not take payment value or call an oracle
    const txHash = await walletClient.writeContract({
      address: market,
      abi: PredictionMarketABI,
      functionName: "startRound",
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }

  private async requestLockPrice(market: Address): Promise<Hash> {
    const { publicClient, walletClient } = this.clients();
    
    const epoch = await publicClient.readContract({
      address: market,
      abi: PredictionMarketABI,
      functionName: "currentEpoch",
    });
    
    const deposit = await publicClient.readContract({
      address: market,
      abi: PredictionMarketABI,
      functionName: "REQUEST_DEPOSIT",
    });

    // Calls requestLockPrice(uint256) matching the old contract layout
    const txHash = await walletClient.writeContract({
      address: market,
      abi: PredictionMarketABI,
      functionName: "requestLockPrice",
      args: [epoch],
      value: deposit,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }

  private async requestClosePrice(market: Address): Promise<Hash> {
    const { publicClient, walletClient } = this.clients();
    
    const epoch = await publicClient.readContract({
      address: market,
      abi: PredictionMarketABI,
      functionName: "currentEpoch",
    });
    
    const deposit = await publicClient.readContract({
      address: market,
      abi: PredictionMarketABI,
      functionName: "REQUEST_DEPOSIT",
    });

    // Calls requestClosePrice(uint256) matching the old contract layout
    const txHash = await walletClient.writeContract({
      address: market,
      abi: PredictionMarketABI,
      functionName: "requestClosePrice",
      args: [epoch],
      value: deposit,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }
}

export function getMarketServiceSingleton() {
  const g = globalThis as unknown as { __marketService?: MarketService };
  if (!g.__marketService) g.__marketService = new MarketService();
  return g.__marketService;
}