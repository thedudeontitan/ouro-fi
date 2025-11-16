/**
 * Utility functions for retrieving Algorand Standard Asset (ASA) token balances
 * Supports both direct API calls and SDK integration
 */

import algosdk from 'algosdk';
import { ASSET_IDS, NETWORK_CONFIG, getNetworkConfig } from '../services/algorand/modern-wallet';

// Types for API responses
export interface AlgoAccountAsset {
  'asset-id': number;
  amount: number;
  'is-frozen': boolean;
  'opted-in-at-round'?: number;
}

export interface AlgoAccountInfo {
  address: string;
  amount: number; // ALGO balance in microAlgos
  assets?: AlgoAccountAsset[];
  'min-balance': number;
  round: number;
  status: string;
}

export interface AssetInfo {
  index: number;
  params: {
    creator: string;
    decimals: number;
    name?: string;
    'unit-name'?: string;
    total: number;
    url?: string;
  };
}

export interface TokenBalance {
  assetId: number;
  balance: number;
  decimals: number;
  name?: string;
  symbol?: string;
  formattedBalance: string;
}

/**
 * Get account information using direct REST API call
 * @param address - Algorand account address
 * @param network - Network to query (defaults to current network config)
 * @returns Promise with account information
 */
export async function getAccountInfoAPI(
  address: string,
  network?: 'testnet' | 'mainnet' | 'localnet'
): Promise<AlgoAccountInfo> {
  const config = network ? NETWORK_CONFIG[network] : getNetworkConfig();
  const url = `${config.algodServer}/v2/accounts/${address}`;

  console.log(`🔍 Fetching account info for ${address} from ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch account info: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data as AlgoAccountInfo;
}

/**
 * Get asset information for a specific ASA
 * @param assetId - The asset ID to query
 * @param network - Network to query
 * @returns Promise with asset information
 */
export async function getAssetInfoAPI(
  assetId: number,
  network?: 'testnet' | 'mainnet' | 'localnet'
): Promise<AssetInfo> {
  const config = network ? NETWORK_CONFIG[network] : getNetworkConfig();
  const url = `${config.algodServer}/v2/assets/${assetId}`;

  console.log(`📊 Fetching asset info for ID ${assetId} from ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch asset info: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data as AssetInfo;
}

/**
 * Get all token balances for an account
 * @param address - Algorand account address
 * @param includeZero - Whether to include assets with zero balance
 * @returns Promise with array of token balances
 */
export async function getAllTokenBalances(
  address: string,
  includeZero: boolean = false
): Promise<TokenBalance[]> {
  const accountInfo = await getAccountInfoAPI(address);
  const assets = accountInfo.assets || [];

  console.log(`💰 Found ${assets.length} assets for account ${address}`);

  const balances: TokenBalance[] = [];

  // Add native ALGO balance
  balances.push({
    assetId: 0, // ALGO uses ID 0
    balance: accountInfo.amount,
    decimals: 6,
    name: 'Algorand',
    symbol: 'ALGO',
    formattedBalance: (accountInfo.amount / 1_000_000).toFixed(6) + ' ALGO'
  });

  // Process ASAs
  for (const asset of assets) {
    if (!includeZero && asset.amount === 0) continue;

    try {
      const assetInfo = await getAssetInfoAPI(asset['asset-id']);
      const decimals = assetInfo.params.decimals;
      const adjustedBalance = asset.amount / Math.pow(10, decimals);

      balances.push({
        assetId: asset['asset-id'],
        balance: asset.amount,
        decimals,
        name: assetInfo.params.name,
        symbol: assetInfo.params['unit-name'],
        formattedBalance: adjustedBalance.toFixed(decimals === 6 ? 2 : Math.min(decimals, 8)) +
                         (assetInfo.params['unit-name'] ? ` ${assetInfo.params['unit-name']}` : '')
      });
    } catch (error) {
      console.warn(`⚠️ Failed to get asset info for ID ${asset['asset-id']}:`, error);

      // Add with basic info if asset details fail
      balances.push({
        assetId: asset['asset-id'],
        balance: asset.amount,
        decimals: 0, // Unknown decimals
        formattedBalance: `${asset.amount} (Asset ${asset['asset-id']})`
      });
    }
  }

  return balances;
}

/**
 * Get balance for a specific token
 * @param address - Algorand account address
 * @param assetId - Asset ID (0 for ALGO, or ASA ID)
 * @returns Promise with token balance info
 */
export async function getTokenBalance(
  address: string,
  assetId: number
): Promise<TokenBalance | null> {
  const accountInfo = await getAccountInfoAPI(address);

  // Handle native ALGO
  if (assetId === 0) {
    return {
      assetId: 0,
      balance: accountInfo.amount,
      decimals: 6,
      name: 'Algorand',
      symbol: 'ALGO',
      formattedBalance: (accountInfo.amount / 1_000_000).toFixed(6) + ' ALGO'
    };
  }

  // Find the ASA
  const asset = accountInfo.assets?.find(a => a['asset-id'] === assetId);
  if (!asset) {
    console.log(`❌ Asset ${assetId} not found in account (not opted in or zero balance)`);
    return null;
  }

  try {
    const assetInfo = await getAssetInfoAPI(assetId);
    const decimals = assetInfo.params.decimals;
    const adjustedBalance = asset.amount / Math.pow(10, decimals);

    return {
      assetId,
      balance: asset.amount,
      decimals,
      name: assetInfo.params.name,
      symbol: assetInfo.params['unit-name'],
      formattedBalance: adjustedBalance.toFixed(decimals === 6 ? 2 : Math.min(decimals, 8)) +
                       (assetInfo.params['unit-name'] ? ` ${assetInfo.params['unit-name']}` : '')
    };
  } catch (error) {
    console.error(`❌ Failed to get asset info for ID ${assetId}:`, error);
    return {
      assetId,
      balance: asset.amount,
      decimals: 0,
      formattedBalance: `${asset.amount} (Asset ${assetId})`
    };
  }
}

/**
 * Get USDC balance specifically (convenience function)
 * @param address - Algorand account address
 * @returns Promise with USDC balance
 */
export async function getUSDCBalance(address: string): Promise<TokenBalance | null> {
  return getTokenBalance(address, ASSET_IDS.USDC);
}

/**
 * Check if an account has opted into a specific ASA
 * @param address - Algorand account address
 * @param assetId - Asset ID to check
 * @returns Promise with boolean indicating opt-in status
 */
export async function isOptedIntoAsset(
  address: string,
  assetId: number
): Promise<boolean> {
  try {
    const accountInfo = await getAccountInfoAPI(address);
    return accountInfo.assets?.some(asset => asset['asset-id'] === assetId) || false;
  } catch (error) {
    console.error(`❌ Failed to check opt-in status for asset ${assetId}:`, error);
    return false;
  }
}

/**
 * Format balance with proper decimals and currency symbol
 * @param balance - Raw balance amount
 * @param decimals - Number of decimal places for the asset
 * @param symbol - Optional currency symbol
 * @returns Formatted balance string
 */
export function formatTokenBalance(
  balance: number,
  decimals: number,
  symbol?: string
): string {
  const adjustedBalance = balance / Math.pow(10, decimals);
  const formatted = adjustedBalance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals === 6 ? 2 : Math.min(decimals, 8)
  });

  return symbol ? `${formatted} ${symbol}` : formatted;
}

/**
 * SDK-based account info (alternative to REST API)
 * @param algodClient - Initialized Algod client
 * @param address - Account address
 * @returns Account information
 */
export async function getAccountInfoSDK(
  algodClient: algosdk.Algodv2,
  address: string
): Promise<any> {
  try {
    const accountInfo = await algodClient.accountInformation(address).do();
    console.log(`🔍 SDK: Fetched account info for ${address}`);
    return accountInfo;
  } catch (error) {
    console.error(`❌ SDK: Failed to fetch account info for ${address}:`, error);
    throw error;
  }
}

// Export commonly used asset IDs for convenience
export const COMMON_TESTNET_ASSETS = {
  USDC: 10458941,
  USDT: 21364625, // Example testnet USDT
  ALGO: 0, // Native ALGO
} as const;

/**
 * Utility function to log all account balances (for debugging)
 * @param address - Account address to inspect
 */
export async function logAccountBalances(address: string): Promise<void> {
  console.log(`\n💰 === ACCOUNT BALANCES FOR ${address} ===`);

  try {
    const balances = await getAllTokenBalances(address, true);

    balances.forEach((balance, index) => {
      console.log(`${index + 1}. ${balance.formattedBalance} (Asset ID: ${balance.assetId})`);
    });

    console.log(`💰 === END BALANCES ===\n`);
  } catch (error) {
    console.error(`❌ Failed to fetch balances:`, error);
  }
}