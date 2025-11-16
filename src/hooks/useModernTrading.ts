/**
 * Modern perpetual trading hook using @txnlab/use-wallet-react
 */

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import * as algosdk from 'algosdk';
import { CONTRACT_IDS, ASSET_IDS, handleWalletError } from '../services/algorand/modern-wallet';

export interface Position {
  id: number;
  trader: string;
  symbol: string;
  size: number;
  entryPrice: number;
  margin: number;
  leverage: number;
  isLong: boolean;
  timestamp: number;
  liquidationPrice: number;
  unrealizedPnL: number;
}

export interface OrderParams {
  symbol: string;
  size: number;
  leverage: number;
  isLong: boolean;
  marginAmount: number;
}

export interface UseModernTradingReturn {
  // Positions
  positions: Position[];
  isLoadingPositions: boolean;
  refreshPositions: () => Promise<void>;

  // Trading actions
  openPosition: (params: OrderParams) => Promise<{ txId: string; positionId: number }>;
  closePosition: (positionId: number) => Promise<{ txId: string; pnl: number }>;

  // Market data
  marketPrices: { [symbol: string]: number };
  fundingRates: { [symbol: string]: number };

  // Portfolio metrics
  totalPortfolioValue: number;
  totalUnrealizedPnL: number;
  marginUsed: number;
  availableMargin: number;

  // State
  isTrading: boolean;

  // Error handling
  error: string | null;
  clearError: () => void;
}

export function useModernTrading(_symbols: string[] = ['ETHUSD', 'BTCUSD', 'SOLUSD', 'ALGOUSD']): UseModernTradingReturn {
  const {
    activeAddress,
    algodClient,
    transactionSigner,
    activeWallet
  } = useWallet();

  const isActive = Boolean(activeWallet && activeAddress);

  // State
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [marketPrices, setMarketPrices] = useState<{ [symbol: string]: number }>({});
  const [fundingRates, setFundingRates] = useState<{ [symbol: string]: number }>({});
  const [isTrading, setIsTrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load positions when account changes
  useEffect(() => {
    if (isActive && activeAddress) {
      refreshPositions();
      refreshMarketData();
    } else {
      setPositions([]);
    }
  }, [isActive, activeAddress]);

  // Refresh market data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (isActive) {
        refreshMarketData();
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isActive]);

  // Get real positions from smart contract (currently empty for fresh accounts)
  const getRealPositions = useCallback(async (_address: string): Promise<Position[]> => {
    if (!algodClient) return [];

    try {
      // TODO: Query smart contract for actual positions
      // For now return empty array until contracts are deployed
      return [];
    } catch (error) {
      console.error('Failed to fetch positions:', error);
      return [];
    }
  }, [algodClient]);

  const getMockPrices = useCallback(() => {
    return {
      'ETHUSD': 410000000000, // $4100 with 8 decimals
      'BTCUSD': 6400000000000, // $64000 with 8 decimals
      'SOLUSD': 20000000000, // $200 with 8 decimals
      'ALGOUSD': 25000000, // $0.25 with 8 decimals
    };
  }, []);

  const getMockFundingRates = useCallback(() => {
    return {
      'ETHUSD': 28, // 0.0028%
      'BTCUSD': -15, // -0.0015%
      'SOLUSD': 45, // 0.0045%
      'ALGOUSD': 10, // 0.001%
    };
  }, []);

  // Refresh positions
  const refreshPositions = useCallback(async () => {
    if (!activeAddress) return;

    setIsLoadingPositions(true);
    setError(null);

    try {
      // Get real positions from smart contract (empty until contracts are deployed)
      const realPositions = await getRealPositions(activeAddress);
      setPositions(realPositions);
    } catch (err) {
      setError(handleWalletError(err));
    } finally {
      setIsLoadingPositions(false);
    }
  }, [activeAddress, getRealPositions]);

  // Refresh market data
  const refreshMarketData = useCallback(async () => {
    try {
      // TODO: Replace with actual price oracle calls
      const prices = getMockPrices();
      const funding = getMockFundingRates();

      setMarketPrices(prices);
      setFundingRates(funding);
    } catch (err) {
      console.warn('Failed to refresh market data:', err);
    }
  }, [getMockPrices, getMockFundingRates]);

  // Open position
  const openPosition = useCallback(async (params: OrderParams): Promise<{ txId: string; positionId: number }> => {
    if (!activeAddress || !algodClient || !transactionSigner) {
      throw new Error('Wallet not connected');
    }

    setIsTrading(true);
    setError(null);

    try {
      const suggestedParams = await algodClient.getTransactionParams().do();

      // Create margin payment transaction
      const marginPayment = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: algosdk.getApplicationAddress(CONTRACT_IDS.PERPETUAL_DEX),
        amount: params.marginAmount,
        assetIndex: ASSET_IDS.USDC,
        suggestedParams,
      });

      // Create open position application call
      const openPositionCall = algosdk.makeApplicationCallTxnFromObject({
        sender: activeAddress,
        appIndex: CONTRACT_IDS.PERPETUAL_DEX,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          new TextEncoder().encode('open_position'),
          new TextEncoder().encode(params.symbol),
          algosdk.encodeUint64(params.size),
          algosdk.encodeUint64(params.leverage),
          new Uint8Array([params.isLong ? 1 : 0]),
        ],
        foreignApps: [CONTRACT_IDS.PRICE_ORACLE],
        foreignAssets: [ASSET_IDS.USDC],
        suggestedParams,
      });

      // Group transactions
      const txnGroup = [marginPayment, openPositionCall];
      algosdk.assignGroupID(txnGroup);

      // Sign and send transactions
      const signedTxns = await transactionSigner(txnGroup, Array.from({ length: txnGroup.length }, (_, i) => i));

      const txId = await algodClient.sendRawTransaction(signedTxns).do();

      // For demo purposes, return mock values
      const positionId = Math.floor(Math.random() * 1000000);

      // Refresh positions after successful trade
      await refreshPositions();

      return { txId: txId.txid, positionId };
    } catch (err) {
      const errorMessage = handleWalletError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsTrading(false);
    }
  }, [activeAddress, algodClient, transactionSigner, refreshPositions]);

  // Close position
  const closePosition = useCallback(async (positionId: number): Promise<{ txId: string; pnl: number }> => {
    if (!activeAddress || !algodClient || !transactionSigner) {
      throw new Error('Wallet not connected');
    }

    setIsTrading(true);
    setError(null);

    try {
      const suggestedParams = await algodClient.getTransactionParams().do();

      // Create close position application call
      const closePositionCall = algosdk.makeApplicationCallTxnFromObject({
        sender: activeAddress,
        appIndex: CONTRACT_IDS.PERPETUAL_DEX,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          new TextEncoder().encode('close_position'),
          algosdk.encodeUint64(positionId),
        ],
        foreignApps: [CONTRACT_IDS.PRICE_ORACLE],
        foreignAssets: [ASSET_IDS.USDC],
        suggestedParams,
      });

      // Sign and send transaction
      const signedTxn = await transactionSigner([closePositionCall], [0]);

      const result = await algodClient.sendRawTransaction(signedTxn).do();

      // For demo purposes, return mock PnL
      const pnl = Math.floor(Math.random() * 20000000) - 10000000; // Random PnL between -$10 and +$10

      // Refresh positions after successful close
      await refreshPositions();

      return { txId: result.txid, pnl };
    } catch (err) {
      const errorMessage = handleWalletError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsTrading(false);
    }
  }, [activeAddress, algodClient, transactionSigner, refreshPositions]);

  // Calculate portfolio metrics
  const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
  const marginUsed = positions.reduce((sum, pos) => sum + pos.margin, 0);

  // For available margin, we'd need to get USDC balance from the wallet
  const availableMargin = 1000000000; // Mock 1000 USDC

  const totalPortfolioValue = availableMargin + totalUnrealizedPnL;

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Positions
    positions,
    isLoadingPositions,
    refreshPositions,

    // Trading actions
    openPosition,
    closePosition,

    // Market data
    marketPrices,
    fundingRates,

    // Portfolio metrics
    totalPortfolioValue,
    totalUnrealizedPnL,
    marginUsed,
    availableMargin,

    // State
    isTrading,

    // Error handling
    error,
    clearError,
  };
}