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

// Hook for DEX contract interactions
export const useDEXContract = () => {
  const { algodClient, activeAddress } = useWallet();
  const [contract, setContract] = useState<DEXContract | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (algodClient) {
      const dexContract = createDEXContract(algodClient);
      setContract(dexContract);
    }
  }, [algodClient]);

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
      const txId = await contract.openPosition(symbol, leverage, isLong, marginAmount, activeAddress);
      return txId;
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
      const txId = await contract.closePosition(positionId, activeAddress);
      return txId;
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
  const [positions, setPositions] = useState<Position[]>([
    // Mock position data for demonstration
    {
      margin: 100000000, // 100 USDC
      entryPrice: 400000000000, // $4000
      isOpen: false,
      holder: 'VK3HGSFUCOP42OBHJLF6LEJBLNAWQIJINVX4YWWLJRRWABNJ4B46ZKPNPQ',
      leverage: 10,
      size: 1000000000, // $1000 position size
      symbol: 'ETHUSD',
      timestamp: Date.now() - 3600000, // 1 hour ago
      liquidationPrice: 360000000000 // $3600
    }
  ]);
  const [loading, setLoading] = useState(false);

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

    // For mock: simulate transaction delay and add new position
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newPosition: Position = {
      margin: marginAmount,
      entryPrice: 400000000000, // Current ETH price
      isOpen: false,
      holder: 'VK3HGSFUCOP42OBHJLF6LEJBLNAWQIJINVX4YWWLJRRWABNJ4B46ZKPNPQ',
      leverage,
      size: isLong ? marginAmount * leverage : -(marginAmount * leverage),
      symbol,
      timestamp: Date.now(),
      liquidationPrice: isLong ? 360000000000 : 440000000000
    };

    setPositions(prev => [...prev, newPosition]);

    const mockTxId = 'MOCK_TX_' + Date.now();
    console.log('✅ Position opened with transaction:', mockTxId);
    return mockTxId;
  }, []);

  const closeExistingPosition = useCallback(async (positionId: number) => {
    console.log('🔒 Closing position:', positionId);

    // For mock: simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Remove position from local state
    setPositions(prev => prev.filter(p => p.timestamp !== positionId));

    const mockTxId = 'MOCK_CLOSE_TX_' + Date.now();
    console.log('✅ Position closed with transaction:', mockTxId);
    return mockTxId;
  }, []);

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