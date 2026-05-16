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
  createEveryMs: number; // Ignored in linear mode to prioritize smooth pipeline flow
  lockAfterMs: number;
  closeAfterMs: number;
};

const COINS = [
  { coinId: "bitcoin", symbol: "BTC" },
  { coinId: "ethereum", symbol: "ETH" },
  { coinId: "solana", symbol: "SOL" },
  { coinId: "somnia", symbol: "SOMI" },
] as const;

// Helper utility to pause execution thread smoothly
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MarketService {
  private isRunningInternal = false;
  private busy = false;

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
    this.initClients();
  }

  private log(message: string, context = "SYSTEM", level: "INFO" | "WARN" | "SUCCESS" | "ERROR" = "INFO") {
    const timestamp = new Date().toLocaleString("sv-SE", { timeZoneName: "short" }).replace(" ", " ");
    const icons = { INFO: "ℹ️", WARN: "⚠️", SUCCESS: "✅", ERROR: "🚨" };
    console.log(`[${timestamp}] [${context}] ${icons[level]} ${message}`);
  }

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
    this.isRunningInternal = false;
    this.busy = false;
    this.state.running = false;
    this.state.nextCreateAt = null;
    this.state.nextLockAt = null;
    this.state.nextCloseAt = null;
    this.log("Market Service engine has received structural stop command.", "ENGINE", "WARN");
  }

  async start(options: StartOptions) {
    if (this.isRunningInternal) {
      this.log("Start requested but service loop is active.", "ENGINE", "WARN");
      return;
    }

    this.isRunningInternal = true;
    this.state.running = true;
    this.state.lastError = null;

    this.log("Market automation step-engine ignited successfully.", "ENGINE", "SUCCESS");

    // Sequential Pipeline Execution Loop
    while (this.isRunningInternal) {
      try {
        this.busy = true;
        console.log("\n----------------------------------------------------------------------");
        this.log("Starting production market lifecycle sequence...", "LIFECYCLE", "INFO");

        // Step 1: Deploy Market Contract
        this.state.nextCreateAt = Date.now();
        const { marketAddress, coinId, txHash } = await this.createMarket();
        
        this.state.lastCreatedMarket = {
          address: marketAddress,
          coinId,
          createdAt: Date.now(),
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

        // Step 2: Call startRound() to make it LIVE
        this.log(`Opening betting windows. Executing startRound()...`, `MARKET:${coinId.toUpperCase()}`, "INFO");
        const startHash = await this.startRound(marketAddress);
        this.state.lastActions.startedAt = Date.now();
        this.state.lastActions.startTxHash = startHash;
        this.log(`Round status pushed to LIVE. Tx: ${startHash}`, `MARKET:${coinId.toUpperCase()}`, "SUCCESS");

        const { publicClient } = this.clients();
        const targetEpoch = await publicClient.readContract({ 
          address: marketAddress, 
          abi: PredictionMarketABI, 
          functionName: "currentEpoch" 
        });

        // Step 3: Wait out the Betting Window
        this.state.nextCreateAt = null;
        this.state.nextLockAt = Date.now() + options.lockAfterMs;
        this.log(`Betting window running. Lock price execution scheduled in ${options.lockAfterMs / 60000}m`, "SCHEDULER", "INFO");
        await delay(options.lockAfterMs);

        if (!this.isRunningInternal) break;

        // Step 4: Request Lock Price
        this.log(`Betting timer complete. Requesting lock price from Somnia Agents...`, `MARKET:${coinId.toUpperCase()}`, "INFO");
        const lockHash = await this.requestLockPrice(marketAddress, targetEpoch);
        this.state.lastActions.lockRequestedAt = Date.now();
        this.state.lastActions.lockTxHash = lockHash;
        this.state.nextLockAt = null;
        this.log(`Lock price successfully requested. Tx: ${lockHash}`, `MARKET:${coinId.toUpperCase()}`, "SUCCESS");

        // Step 5: Wait out the Locked Phase Window
        this.state.nextCloseAt = Date.now() + options.closeAfterMs;
        this.log(`Locked window running. Round settlement scheduled in ${options.closeAfterMs / 60000}m`, "SCHEDULER", "INFO");
        await delay(options.closeAfterMs);

        if (!this.isRunningInternal) break;

        // Step 6: Request Close Price & Settle Round
        this.log(`Locked interval completed. Pulling final settlement price...`, `MARKET:${coinId.toUpperCase()}`, "INFO");
        const closeHash = await this.requestClosePrice(marketAddress, targetEpoch);
        this.state.lastActions.closeRequestedAt = Date.now();
        this.state.lastActions.closeTxHash = closeHash;
        this.state.nextCloseAt = null;
        this.log(`Round settled and rewards calculated. Tx: ${closeHash}`, `MARKET:${coinId.toUpperCase()}`, "SUCCESS");

        // Step 7: 1-Minute Grace Hold Break (Completely resolves nonce conflicts)
        const graceDelayMs = 60 * 1000; 
        this.state.nextCreateAt = Date.now() + graceDelayMs;
        this.log(`Ensuring clean transaction completion. Pausing engine for 1 minute...`, "GRACE-HOLD", "WARN");
        console.log("----------------------------------------------------------------------\n");
        await delay(graceDelayMs);

      } catch (e) {
        this.handleError(e, "PIPELINE_CRASH");
        this.log("Waiting 15 seconds before trying next cycle to recover...", "RECOVERY", "WARN");
        await delay(15000); 
      } finally {
        this.busy = false;
      }
    }
  }

  private handleError(err: unknown, context: string) {
    const msg = err instanceof Error ? err.message : String(err);
    this.log(`Operation halted due to error: ${msg}`, context, "ERROR");
    this.state.lastError = msg;
  }

  private async createMarket(): Promise<{ marketAddress: Address; coinId: string; txHash: Hash }> {
    const { publicClient, walletClient, factoryAddress, account } = this.clients();

    const coin = COINS[Math.floor(Math.random() * COINS.length)];
    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const marketName = `${coin.symbol} 5m (${stamp})`;
    const marketSymbol = `${coin.symbol}5M`;

    this.log(`Deploying PredictionMarket instance for tracking ${coin.symbol}...`, "FACTORY", "INFO");

    const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" });

    const txHash = await walletClient.writeContract({
      address: factoryAddress,
      abi: PredictionMarketFactoryABI,
      functionName: "createMarket",
      args: [marketName, marketSymbol, coin.coinId],
      nonce,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    
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
    const { publicClient, walletClient, account } = this.clients();
    const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" });
    
    const txHash = await walletClient.writeContract({
      address: market,
      abi: PredictionMarketABI,
      functionName: "startRound",
      nonce,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }

  private async requestLockPrice(market: Address, epoch: bigint): Promise<Hash> {
    const { publicClient, walletClient, account } = this.clients();
    const deposit = await publicClient.readContract({ address: market, abi: PredictionMarketABI, functionName: "REQUEST_DEPOSIT" });
    const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" });

    const txHash = await walletClient.writeContract({
      address: market,
      abi: PredictionMarketABI,
      functionName: "requestLockPrice",
      args: [epoch],
      value: deposit,
      nonce,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }

  private async requestClosePrice(market: Address, epoch: bigint): Promise<Hash> {
    const { publicClient, walletClient, account } = this.clients();
    const deposit = await publicClient.readContract({ address: market, abi: PredictionMarketABI, functionName: "REQUEST_DEPOSIT" });
    const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" });

    const txHash = await walletClient.writeContract({
      address: market,
      abi: PredictionMarketABI,
      functionName: "requestClosePrice",
      args: [epoch],
      value: deposit,
      nonce,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }
}

const g = global as unknown as { __marketService?: MarketService };
if (!g.__marketService) g.__marketService = new MarketService();
export const marketService = g.__marketService;