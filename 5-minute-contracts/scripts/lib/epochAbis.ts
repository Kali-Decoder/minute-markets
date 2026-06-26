/**
 * Epoch 5-min UP/DOWN market ABIs (from 5-minute-prediction/app/config).
 * Factory: predictionMarketFactoryAbi.ts + predictionAddresses.ts
 * Pool:    predictionMarketAbi.ts (matches contracts/PredictionMarket.sol)
 */

export const EPOCH_FACTORY_ADDRESS =
  "0xFD204c783A78db5142d4b13A5a11B005dc9C16Dc";

export const EPOCH_FACTORY_ABI = [
  "function getAllMarkets() view returns (address[])",
  "function totalMarkets() view returns (uint256)",
  "function treasury() view returns (address)",
  "function owner() view returns (address)",
  "function getMarketInfo(address market) view returns (tuple(address marketAddress,string marketName,string marketSymbol,string coinId,address creator,uint256 createdAt,bool active))",
  "function isMarketActive(address market) view returns (bool)",
] as const;

export const EPOCH_POOL_READ_ABI = [
  "function owner() view returns (address)",
  "function treasury() view returns (address)",
  "function totalTreasury() view returns (uint256)",
  "function getContractBalance() view returns (uint256)",
  "function marketName() view returns (string)",
  "function marketSymbol() view returns (string)",
  "function coinId() view returns (string)",
  "function currentEpoch() view returns (uint256)",
] as const;

export const EPOCH_POOL_SWEEP_ABI = [
  "function owner() view returns (address)",
  "function treasury() view returns (address)",
  "function totalTreasury() view returns (uint256)",
  "function getContractBalance() view returns (uint256)",
  "function marketName() view returns (string)",
  "function setTreasury(address _treasury)",
  "function claimTreasury()",
] as const;
