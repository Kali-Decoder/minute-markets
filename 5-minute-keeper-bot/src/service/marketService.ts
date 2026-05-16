import { createPublicClient, createWalletClient, decodeEventLog, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Address, Hash } from "viem";
import { 
  somniaTestnet, 
  PredictionMarketFactoryABI, 
  PredictionMarketABI, 
  getPredictionMarketFactoryAddress 
} from "../config/chains";

export type ServiceState = {
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
  createEveryMs: number;
  lockAfterMs: number;
  closeAfterMs: number;
};

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

  // FIXED: Single instance client placeholders to persist transaction state and nonces
  private cachedPublicClient: any = null;
  private cachedWalletClient: any = null;
  private cachedAccount: any = null;
  private factoryAddress: Address | null = null;

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

  constructor() {
    // FIXED: Initialize cryptographic and web3 communication configurations safely upon boot
    this.initClients();
  }

  // Standardized administrative logger
  private log(message: string, context = "SYSTEM", level: "INFO" | "WARN" | "SUCCESS" | "ERROR" = "INFO") {
    const timestamp = new Date().toLocaleString("sv-SE", { timeZoneName: "short" }).replace(" ", " ");
    const icons = { INFO: "ℹ️", WARN: "⚠️", SUCCESS: "✅", ERROR: "🚨" };
    console.log(`[${timestamp}] [${context}] ${icons[level]} ${message}`);
  }

  // FIXED: Consolidated client generator logic to persist nonce states throughout class lifecycles
  private initClients() {
    try {
      const rpcUrl = process.env.SOMNIA_RPC_URL || "https://dream-rpc.somnia.network/";
      const pk = process.env.MARKET_SERVICE_ADMIN_PRIVATE_KEY;
      if (!pk) throw new Error("Missing MARKET_SERVICE_ADMIN_PRIVATE_KEY env variable.");
      
      this.cachedAccount = privateKeyToAccount(pk as `0x${string}`);
      this.cachedPublicClient = createPublicClient({ chain: somniaTestnet, transport: http(rpcUrl) });
      this.cachedWalletClient = createWalletClient({ 
        chain: somniaTestnet, 
        transport: http(rpcUrl), 
        account: this.cachedAccount 
      });
      this.factoryAddress = getPredictionMarketFactoryAddress(somniaTestnet.id);
    } catch (err) {
      this.handleError(err, "INITIALIZATION");
    }
  }

  private clients() {
    if (!this.cachedWalletClient || !this.cachedPublicClient || !this.factoryAddress) {
      this.initClients();
    }
    return { 
      publicClient: this.cachedPublicClient, 
      walletClient: this.cachedWalletClient, 
      account: this.cachedAccount, 
      factoryAddress: this.factoryAddress! 
    };
  }

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
    this.log("Market Service has been manually stopped.", "ENGINE", "WARN");
  }

  start(options: StartOptions) {
    if (this.state.running) {
      this.log("Start requested but service is already running.", "ENGINE", "WARN");
      return;
    }

    this.state.running = true;
    this.state.lastError = null;
    this.state.nextCreateAt = Date.now() + options.createEveryMs;
    this.state.nextLockAt = null;
    this.state.nextCloseAt = null;

    this.log(`Market automation engine successfully ignited. Cycles run every ${options.createEveryMs / 60000} minutes.`, "ENGINE", "SUCCESS");

    const tick = async () => {
      if (!this.state.running) return;
      if (this.busy) return;
      if (!this.state.nextCreateAt) return;
      if (Date.now() < this.state.nextCreateAt) return;

      this.busy = true;
      try {
        console.log("\n----------------------------------------------------------------------");
        this.log("Initiating new lifecycle block step...", "LIFECYCLE", "INFO");
        
        // 1. Deploy Market Contract
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

        // 2. Call startRound() to open betting (LIVE status 0)
        this.log(`Opening user betting allocations. Executing startRound()...`, `MARKET:${coinId.toUpperCase()}`, "INFO");
        const startHash = await this.startRound(marketAddress);
        this.state.lastActions.startedAt = Date.now();
        this.state.lastActions.startTxHash = startHash;
        this.log(`Round status pushed to LIVE. Tx: ${startHash}`, `MARKET:${coinId.toUpperCase()}`, "SUCCESS");

        // 3. Schedule Lock Price Request
        this.state.nextLockAt = Date.now() + options.lockAfterMs;
        this.log(`Betting window ticking. Lock price execution scheduled in ${options.lockAfterMs / 60000}m`, "SCHEDULER", "INFO");
        
        this.timeouts.push(
          setTimeout(async () => {
            try {
              if (!this.state.running) return;
              
              this.log(`Betting timer complete. Requesting lock price from Somnia Agents...`, `MARKET:${coinId.toUpperCase()}`, "INFO");
              const lockHash = await this.requestLockPrice(marketAddress);
              this.state.lastActions!.lockRequestedAt = Date.now();
              this.state.lastActions!.lockTxHash = lockHash;
              this.state.nextLockAt = null;
              this.log(`Lock price successfully requested. Tx: ${lockHash}`, `MARKET:${coinId.toUpperCase()}`, "SUCCESS");

              // 4. Schedule Close Price Request
              this.state.nextCloseAt = Date.now() + options.closeAfterMs;
              this.log(`Locked window ticking. Round settlement scheduled in ${options.closeAfterMs / 60000}m`, "SCHEDULER", "INFO");
              
              this.timeouts.push(
                setTimeout(async () => {
                  try {
                    if (!this.state.running) return;

                    this.log(`Locked interval completed. Pulling final settlement price...`, `MARKET:${coinId.toUpperCase()}`, "INFO");
                    const closeHash = await this.requestClosePrice(marketAddress);
                    this.state.lastActions!.closeRequestedAt = Date.now();
                    this.state.lastActions!.closeTxHash = closeHash;
                    this.state.nextCloseAt = null;
                    this.log(`Round settled and rewards calculated. Tx: ${closeHash}`, `MARKET:${coinId.toUpperCase()}`, "SUCCESS");
                    console.log("----------------------------------------------------------------------\n");
                  } catch (closeErr) {
                    this.handleError(closeErr, `MARKET:${coinId.toUpperCase()}`);
                  }
                }, options.closeAfterMs)
              );

            } catch (lockErr) {
              this.handleError(lockErr, `MARKET:${coinId.toUpperCase()}`);
            }
          }, options.lockAfterMs)
        );

      } catch (e) {
        this.handleError(e, "LIFECYCLE");
      } finally {
        this.state.nextCreateAt = Date.now() + options.createEveryMs;
        this.busy = false;
      }
    };

    this.intervalId = setInterval(() => void tick(), 2_000);
    void tick();
  }

  private handleError(err: unknown, context: string) {
    const msg = err instanceof Error ? err.message : String(err);
    this.log(`Operation halted due to error: ${msg}`, context, "ERROR");
    this.state.lastError = msg;
  }

  private async createMarket(): Promise<{ marketAddress: Address; coinId: string; txHash: Hash }> {
    const { publicClient, walletClient, factoryAddress } = this.clients();

    const coin = COINS[Math.floor(Math.random() * COINS.length)];
    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const marketName = `${coin.symbol} 5m (${stamp})`;
    const marketSymbol = `${coin.symbol}5M`;

    this.log(`Deploying PredictionMarket instance for tracking ${coin.symbol}...`, "FACTORY", "INFO");

    const txHash = await walletClient.writeContract({
      address: factoryAddress,
      abi: PredictionMarketFactoryABI,
      functionName: "createMarket",
      args: [marketName, marketSymbol, coin.coinId],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    
    // FIXED: Explicitly typed 'l' as an object shape containing an address property string
    // to strictly prevent the "implicitly has an 'any' type" compiler crash.
    const log = receipt.logs.find((l: { address: string }) => 
      l.address.toLowerCase() === factoryAddress.toLowerCase()
    );
    if (!log) throw new Error("MarketCreated log not found.");

    const decoded = decodeEventLog({
      abi: PredictionMarketFactoryABI,
      data: log.data,
      topics: log.topics,
    });

    if (decoded.eventName !== "MarketCreated") throw new Error("Unexpected event structure matching transaction.");
    const marketAddress = (decoded.args as { market: Address }).market;
    
    this.log(`New market successfully deployed at ${marketAddress}. Tx: ${txHash}`, "FACTORY", "SUCCESS");
    return { marketAddress, coinId: coin.coinId, txHash };
  }

  private async startRound(market: Address): Promise<Hash> {
    const { publicClient, walletClient } = this.clients();
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
    const epoch = await publicClient.readContract({ address: market, abi: PredictionMarketABI, functionName: "currentEpoch" });
    const deposit = await publicClient.readContract({ address: market, abi: PredictionMarketABI, functionName: "REQUEST_DEPOSIT" });

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
    const epoch = await publicClient.readContract({ address: market, abi: PredictionMarketABI, functionName: "currentEpoch" });
    const deposit = await publicClient.readContract({ address: market, abi: PredictionMarketABI, functionName: "REQUEST_DEPOSIT" });

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

const g = global as unknown as { __marketService?: MarketService };
if (!g.__marketService) g.__marketService = new MarketService();
export const marketService = g.__marketService;