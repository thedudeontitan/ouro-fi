/**
 * React hooks for Algorand smart contract interactions
 */

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import {
  DEXContract,
  OracleContract,
  OrderBookContract,
  createDEXContract,
  createOracleContract,
  createOrderBookContract,
  Position,
  PriceData,
  AssetPair
} from '../services/algorand/contracts';
import { getSymbolPrice } from '../utils/GetSymbolPrice';

// Hook for DEX contract interactions
export const useDEXContract = () => {
  const { algodClient, activeAddress, signTransactions } = useWallet();
  const [contract, setContract] = useState<DEXContract | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (algodClient) {
      const dexContract = createDEXContract(algodClient);
      setContract(dexContract);
    }
  }, [algodClient]);

  // Set signer when available (without causing re-renders)
  useEffect(() => {
    if (contract && signTransactions) {
      contract.setSigner(signTransactions);
    }
  }, [contract]);

  const openPosition = useCallback(async (
    symbol: string,
    leverage: number,
    isLong: boolean,
    marginAmount: number
  ): Promise<string | null> => {
    if (!contract || !activeAddress) {
      setError('Wallet not connected or contract not initialized');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await contract.openPosition(symbol, leverage, isLong, marginAmount, activeAddress);
      return result.txId;
    } catch (err: any) {
      setError(err.message || 'Failed to open position');
      return null;
    } finally {
      setLoading(false);
    }
  }, [contract, activeAddress]);

  const closePosition = useCallback(async (positionId: number): Promise<string | null> => {
    if (!contract || !activeAddress) {
      setError('Wallet not connected or contract not initialized');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await contract.closePosition(positionId, activeAddress);
      return result.txId;
    } catch (err: any) {
      setError(err.message || 'Failed to close position');
      return null;
    } finally {
      setLoading(false);
    }
  }, [contract, activeAddress]);

  const getPosition = useCallback(async (positionId: number): Promise<Position | null> => {
    if (!contract) {
      setError('Contract not initialized');
      return null;
    }

    try {
      const position = await contract.getPosition(positionId);
      return position;
    } catch (err: any) {
      setError(err.message || 'Failed to get position');
      return null;
    }
  }, [contract]);

  const getContractMargin = useCallback(async (): Promise<number | null> => {
    if (!contract) return null;

    try {
      const margin = await contract.getContractMargin();
      return margin;
    } catch (err: any) {
      setError(err.message || 'Failed to get contract margin');
      return null;
    }
  }, [contract]);

  return {
    contract,
    loading,
    error,
    openPosition,
    closePosition,
    getPosition,
    getContractMargin,
    clearError: () => setError(null)
  };
};

// Hook for Oracle contract interactions
export const useOracleContract = () => {
  const { algodClient, activeAddress } = useWallet();
  const [contract, setContract] = useState<OracleContract | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (algodClient) {
      const oracleContract = createOracleContract(algodClient);
      setContract(oracleContract);
    }
  }, [algodClient]);

  const getPrice = useCallback(async (symbol: string): Promise<number | null> => {
    if (!contract) {
      setError('Contract not initialized');
      return null;
    }

    try {
      const price = await contract.getPrice(symbol);
      return price;
    } catch (err: any) {
      setError(err.message || 'Failed to get price');
      return null;
    }
  }, [contract]);

  const getPriceData = useCallback(async (symbol: string): Promise<PriceData | null> => {
    if (!contract) {
      setError('Contract not initialized');
      return null;
    }

    try {
      const priceData = await contract.getPriceData(symbol);
      return priceData;
    } catch (err: any) {
      setError(err.message || 'Failed to get price data');
      return null;
    }
  }, [contract]);

  const isPriceFresh = useCallback(async (symbol: string): Promise<boolean> => {
    if (!contract) return false;

    try {
      const fresh = await contract.isPriceFresh(symbol);
      return fresh;
    } catch (err: any) {
      setError(err.message || 'Failed to check price freshness');
      return false;
    }
  }, [contract]);

  const getSupportedAssets = useCallback(async (): Promise<string[]> => {
    if (!contract) return [];

    try {
      const assets = await contract.getSupportedAssets();
      return assets;
    } catch (err: any) {
      setError(err.message || 'Failed to get supported assets');
      return [];
    }
  }, [contract]);

  return {
    contract,
    loading,
    error,
    getPrice,
    getPriceData,
    isPriceFresh,
    getSupportedAssets,
    clearError: () => setError(null)
  };
};

// Hook for OrderBook contract interactions
export const useOrderBookContract = () => {
  const { algodClient, activeAddress } = useWallet();
  const [contract, setContract] = useState<OrderBookContract | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (algodClient) {
      const orderBookContract = createOrderBookContract(algodClient);
      setContract(orderBookContract);
    }
  }, [algodClient]);

  const getOrder = useCallback(async (assetA: number, assetB: number): Promise<AssetPair | null> => {
    if (!contract) {
      setError('Contract not initialized');
      return null;
    }

    try {
      const order = await contract.getOrder(assetA, assetB);
      return order;
    } catch (err: any) {
      setError(err.message || 'Failed to get order');
      return null;
    }
  }, [contract]);

  const isPairActive = useCallback(async (assetA: number, assetB: number): Promise<boolean> => {
    if (!contract) return false;

    try {
      const active = await contract.isPairActive(assetA, assetB);
      return active;
    } catch (err: any) {
      setError(err.message || 'Failed to check pair status');
      return false;
    }
  }, [contract]);

  const getAllPairs = useCallback(async (): Promise<string[]> => {
    if (!contract) return [];

    try {
      const pairs = await contract.getAllPairs();
      return pairs;
    } catch (err: any) {
      setError(err.message || 'Failed to get all pairs');
      return [];
    }
  }, [contract]);

  return {
    contract,
    loading,
    error,
    getOrder,
    isPairActive,
    getAllPairs,
    clearError: () => setError(null)
  };
};

// Combined hook for all contract interactions
export const useVelocityContracts = () => {
  const dex = useDEXContract();
  const oracle = useOracleContract();
  const orderBook = useOrderBookContract();

  const isReady = !!(dex.contract && oracle.contract && orderBook.contract);
  const isLoading = dex.loading || oracle.loading || orderBook.loading;
  const error = dex.error || oracle.error || orderBook.error;

  const clearAllErrors = useCallback(() => {
    dex.clearError();
    oracle.clearError();
    orderBook.clearError();
  }, [dex.clearError, oracle.clearError, orderBook.clearError]);

  return {
    dex,
    oracle,
    orderBook,
    isReady,
    isLoading,
    error,
    clearAllErrors
  };
};

// Hook for managing trading positions
export const usePositions = () => {
  const { dex } = useVelocityContracts();
  const { activeAddress } = useWallet();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [positionsInitialized, setPositionsInitialized] = useState(false);

  // Initialize with realistic mock position using current market prices
  useEffect(() => {
    const initializeMockPositions = async () => {
      if (positionsInitialized) return;

      try {
        // Get current ETH price for mock position
        const currentEthPrice = await getSymbolPrice('ETHUSD');
        const entryPrice = Math.floor(currentEthPrice * 100000000); // Convert to 8 decimals

        const mockPosition: Position = {
          margin: 100000000, // 100 USDC
          entryPrice, // Current ETH price
          isOpen: false,
          holder: 'VK3HGSFUCOP42OBHJLF6LEJBLNAWQIJINVX4YWWLJRRWABNJ4B46ZKPNPQ',
          leverage: 10,
          size: 1000000000, // $1000 position size
          symbol: 'ETHUSD',
          timestamp: Date.now() - 3600000, // 1 hour ago
          liquidationPrice: Math.floor(entryPrice * 0.9) // 10% below entry for long position
        };

        setPositions([mockPosition]);
        setPositionsInitialized(true);

        console.log('🏦 Initialized mock position with current price:', {
          symbol: 'ETHUSD',
          entryPrice: `$${(entryPrice / 100000000).toFixed(2)}`,
          liquidationPrice: `$${(mockPosition.liquidationPrice / 100000000).toFixed(2)}`
        });
      } catch (error) {
        console.warn('⚠️ Failed to fetch current price for mock position, using fallback');

        // Fallback to static position if price fetch fails
        const fallbackPosition: Position = {
          margin: 100000000,
          entryPrice: 400000000000, // $4000 fallback
          isOpen: false,
          holder: 'VK3HGSFUCOP42OBHJLF6LEJBLNAWQIJINVX4YWWLJRRWABNJ4B46ZKPNPQ',
          leverage: 10,
          size: 1000000000,
          symbol: 'ETHUSD',
          timestamp: Date.now() - 3600000,
          liquidationPrice: 360000000000
        };

        setPositions([fallbackPosition]);
        setPositionsInitialized(true);
      }
    };

    initializeMockPositions();
  }, []); // Empty dependency array - only run once on mount

  const loadPosition = useCallback(async (positionId: number) => {
    if (!dex.contract) return;

    setLoading(true);
    try {
      const position = await dex.getPosition(positionId);
      if (position) {
        setPositions(prev => {
          const existing = prev.findIndex(p => p.timestamp === position.timestamp);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = position;
            return updated;
          }
          return [...prev, position];
        });
      }
    } catch (err) {
      console.error('Failed to load position:', err);
    } finally {
      setLoading(false);
    }
  }, [dex.contract, dex.getPosition]);

  const openNewPosition = useCallback(async (
    symbol: string,
    leverage: number,
    isLong: boolean,
    marginAmount: number
  ) => {
    console.log('🚀 Opening position:', { symbol, leverage, isLong, marginAmount });

    // Fetch current market price
    let currentPrice;
    try {
      currentPrice = await getSymbolPrice(symbol);
      console.log(`📈 Current ${symbol} price: $${currentPrice}`);
    } catch (error) {
      console.warn(`⚠️ Failed to fetch ${symbol} price, using fallback:`, error);
      // Fallback prices if API fails
      const fallbackPrices: Record<string, number> = {
        'ETHUSD': 4000,
        'BTCUSD': 65000,
        'SOLUSD': 150,
        'ALGOUSD': 0.5
      };
      currentPrice = fallbackPrices[symbol] || 4000;
    }

    // Convert price to 8 decimal format for internal storage
    const entryPrice = Math.floor(currentPrice * 100000000); // 8 decimals

    // Calculate liquidation price (5% margin from entry for safety)
    const liquidationPrice = isLong
      ? Math.floor(entryPrice * (1 - 0.95 / leverage)) // Long liquidation below entry
      : Math.floor(entryPrice * (1 + 0.95 / leverage)); // Short liquidation above entry

    // Use real DEX contract to create transaction
    if (!dex.contract) {
      throw new Error('DEX contract not initialized');
    }

    if (!activeAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      // Call the actual contract method to create real transaction
      const txId = await dex.openPosition(symbol, leverage, isLong, marginAmount);

      // Create the position object after successful transaction creation
      const newPosition: Position = {
        margin: marginAmount,
        entryPrice, // Using actual market price
        isOpen: true, // Mark as open since we created real transaction
        holder: activeAddress,
        leverage,
        size: isLong ? marginAmount * leverage : -(marginAmount * leverage),
        symbol,
        timestamp: Date.now(),
        liquidationPrice
      };

      console.log('📋 Real position created:', {
        symbol,
        entryPrice: `$${(entryPrice / 100000000).toFixed(2)}`,
        liquidationPrice: `$${(liquidationPrice / 100000000).toFixed(2)}`,
        direction: isLong ? 'LONG' : 'SHORT',
        leverage: `${leverage}x`,
        txId
      });

      setPositions(prev => [...prev, newPosition]);

      console.log('✅ Real position transaction created:', txId);
      return txId;

    } catch (error) {
      console.error('❌ Failed to create position transaction:', error);
      throw error;
    }
  }, [dex.contract, activeAddress]);

  const closeExistingPosition = useCallback(async (positionId: number) => {
    console.log('🔒 Closing position:', positionId);

    if (!dex.contract) {
      throw new Error('DEX contract not initialized');
    }

    if (!activeAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      // Call the actual contract method to create real close transaction
      const txId = await dex.closePosition(positionId);

      // Remove position from local state after successful transaction creation
      setPositions(prev => prev.filter(p => p.timestamp !== positionId));

      console.log('✅ Real close transaction created:', txId);
      return txId;

    } catch (error) {
      console.error('❌ Failed to create close transaction:', error);
      throw error;
    }
  }, [dex.contract, activeAddress]);

  return {
    positions,
    loading: loading || dex.loading,
    error: dex.error,
    loadPosition,
    openNewPosition,
    closeExistingPosition,
    clearError: dex.clearError
  };
};

// Hook for price data management
export const usePriceData = () => {
  const { oracle } = useVelocityContracts();
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(false);

  const loadPrice = useCallback(async (symbol: string) => {
    if (!oracle.contract) return;

    setLoading(true);
    try {
      const priceData = await oracle.getPriceData(symbol);
      if (priceData) {
        setPrices(prev => ({ ...prev, [symbol]: priceData }));
      }
    } catch (err) {
      console.error('Failed to load price:', err);
    } finally {
      setLoading(false);
    }
  }, [oracle.contract, oracle.getPriceData]);

  const loadMultiplePrices = useCallback(async (symbols: string[]) => {
    if (!oracle.contract) return;

    setLoading(true);
    try {
      const pricePromises = symbols.map(symbol => oracle.getPriceData(symbol));
      const results = await Promise.allSettled(pricePromises);

      const newPrices: Record<string, PriceData> = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          newPrices[symbols[index]] = result.value;
        }
      });

      setPrices(prev => ({ ...prev, ...newPrices }));
    } catch (err) {
      console.error('Failed to load multiple prices:', err);
    } finally {
      setLoading(false);
    }
  }, [oracle.contract, oracle.getPriceData]);

  return {
    prices,
    loading: loading || oracle.loading,
    error: oracle.error,
    loadPrice,
    loadMultiplePrices,
    clearError: oracle.clearError
  };
};