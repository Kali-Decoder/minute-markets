import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-ethers";
import "dotenv/config";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const config = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "paris",
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      metadata: {
        bytecodeHash: "ipfs",
      },
    },
  },
  networks: {
    somniaTestnet: {
      url: process.env.SOMNIA_TESTNET_RPC_URL || "https://dream-rpc.somnia.network/",
      accounts: [PRIVATE_KEY],
      chainId: 50312,
    },
    somniaMainnet: {
      url: process.env.SOMNIA_MAINNET_RPC_URL || "https://api.infra.mainnet.somnia.network/",
      accounts: [PRIVATE_KEY],
      chainId: 5031,
    },
  },
  sourcify: {
    enabled: false,
  },
  etherscan: {
    enabled: true,
    apiKey: {
      somniaMainnet: ETHERSCAN_API_KEY,
      somniaTestnet: ETHERSCAN_API_KEY,
    },
    customChains: [
      {
        network: "somniaMainnet",
        chainId: 5031,
        urls: {
          apiURL: "https://explorer.somnia.network/api",
          browserURL: "https://explorer.somnia.network",
        },
      },
      {
        network: "somniaTestnet",
        chainId: 50312,
        urls: {
          apiURL: "https://shannon-explorer.somnia.network/api",
          browserURL: "https://shannon-explorer.somnia.network",
        },
      },
    ],
  },
};

export default config as HardhatUserConfig;
