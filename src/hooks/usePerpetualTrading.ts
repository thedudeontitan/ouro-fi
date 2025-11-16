/**
 * React hook for perpetual trading operations
 */

import { useState, useEffect, useCallback } from 'react';
import { perpDEXService, Position, MarketData, OrderParams } from '../services/algorand/perpetual-dex';
import { useAlgorandWallet } from './useAlgorandWallet';

export interface UsePerpetualTradingReturn {
  // Positions
  positions: Position[];
  isLoadingPositions: boolean;
  refreshPositions: () => Promise<void>;

  // Market data
  marketData: { [symbol: string]: MarketData };
  isLoadingMarketData: boolean;
  refreshMarketData: (symbols: string[]) => Promise<void>;

  // Trading actions
  openPosition: (params: OrderParams) => Promise<{txId: string, positionId: number}>;
  closePosition: (positionId: number) => Promise<{txId: string, pnl: number}>;

  // State
  isTrading: boolean;

  // Portfolio metrics
  totalPortfolioValue: number;
  totalUnrealizedPnL: number;
  marginUsed: number;
  availableMargin: number;

  // Error handling
  error: string | null;
  clearError: () => void;
}

export function usePerpetualTrading(symbols: string[] = ['ETHUSD', 'BTCUSD', 'SOLUSD', 'ALGOUSD']): UsePerpetualTradingReturn {
  const { activeAccount, isConnected, usdcBalance } = useAlgorandWallet();

  // State
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [marketData, setMarketData] = useState<{ [symbol: string]: MarketData }>({});
  const [isLoadingMarketData, setIsLoadingMarketData] = useState(false);
  const [isTrading, setIsTrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load positions when account changes
  useEffect(() => {
    if (isConnected && activeAccount) {
      refreshPositions();
    } else {
      setPositions([]);
    }
  }, [isConnected, activeAccount]);

  // Load market data on mount and periodically
  useEffect(() => {
    refreshMarketData(symbols);

    // Set up periodic refresh for market data (every 30 seconds)
    const interval = setInterval(() => {
      refreshMarketData(symbols);
    }, 30000);

    return () => clearInterval(interval);
  }, [symbols]);

  // Refresh positions
  const refreshPositions = useCallback(async () => {
    if (!activeAccount) return;

    setIsLoadingPositions(true);
    setError(null);

    try {
      const userPositions = await perpDEXService.getUserPositions(activeAccount);

      // Calculate unrealized PnL for each position
      const positionsWithPnL = await Promise.all(
        userPositions.map(async (position) => {
          const currentPrice = await perpDEXService.getPrice(position.symbol);
          const unrealizedPnL = perpDEXService.calculateUnrealizedPnL(position, currentPrice);

          return {
            ...position,
            unrealizedPnL
          };
        })
      );

      setPositions(positionsWithPnL);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load positions');
    } finally {
      setIsLoadingPositions(false);
    }
  }, [activeAccount]);

  // Refresh market data
  const refreshMarketData = useCallback(async (symbolsToRefresh: string[]) => {
    setIsLoadingMarketData(true);

    try {
      const marketDataPromises = symbolsToRefresh.map(async (symbol) => {
        const data = await perpDEXService.getMarketData(symbol);
        return [symbol, data] as const;
      });

      const results = await Promise.all(marketDataPromises);
      const newMarketData = Object.fromEntries(results);

      setMarketData(prevData => ({
        ...prevData,
        ...newMarketData
      }));
    } catch (err) {
      // Don't set error for market data refresh failures, just log them
      console.warn('Failed to refresh market data:', err);
    } finally {
      setIsLoadingMarketData(false);
    }
  }, []);

  // Open position
  const openPosition = useCallback(async (params: OrderParams) => {
    if (!isConnected || !activeAccount) {
      throw new Error('Wallet not connected');
    }

    setIsTrading(true);
    setError(null);

    try {
      const result = await perpDEXService.openPosition(params);

      // Refresh positions after successful trade
      await refreshPositions();

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open position';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsTrading(false);
    }
  }, [isConnected, activeAccount, refreshPositions]);

  // Close position
  const closePosition = useCallback(async (positionId: number) => {
    if (!isConnected || !activeAccount) {
      throw new Error('Wallet not connected');
    }

    setIsTrading(true);
    setError(null);

    try {
      const result = await perpDEXService.closePosition(positionId);

      // Refresh positions after successful close
      await refreshPositions();

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to close position';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsTrading(false);
    }
  }, [isConnected, activeAccount, refreshPositions]);

  // Calculate portfolio metrics
  const totalPortfolioValue = usdcBalance + positions.reduce((sum, pos) => sum + (pos.unrealizedPnL || 0), 0);

  const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + (pos.unrealizedPnL || 0), 0);

  const marginUsed = positions.reduce((sum, pos) => sum + pos.margin, 0);

  const availableMargin = usdcBalance;

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Positions
    positions,
    isLoadingPositions,
    refreshPositions,

    // Market data
    marketData,
    isLoadingMarketData,
    refreshMarketData,

    // Trading actions
    openPosition,
    closePosition,

    // State
    isTrading,

    // Portfolio metrics
    totalPortfolioValue,
    totalUnrealizedPnL,
    marginUsed,
    availableMargin,

    // Error handling
    error,
    clearError,
  };
}