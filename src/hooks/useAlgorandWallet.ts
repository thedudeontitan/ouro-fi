/**
 * React hook for Algorand wallet connection and management
 */

import { useState, useEffect, useCallback } from 'react';
import { walletManager, WalletProvider, WalletAccount } from '../services/algorand/wallet';

export interface UseAlgorandWalletReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectedAccounts: string[];
  activeAccount: string | null;
  connectedProvider: WalletProvider | null;

  // Wallet data
  accountInfo: WalletAccount | null;
  balance: number;
  usdcBalance: number;

  // Actions
  connect: (providerId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  setActiveAccount: (address: string) => void;
  refreshAccountInfo: () => Promise<void>;

  // Available providers
  availableProviders: WalletProvider[];

  // Error handling
  error: string | null;
  clearError: () => void;
}

export function useAlgorandWallet(): UseAlgorandWalletReturn {
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([]);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);
  const [connectedProvider, setConnectedProvider] = useState<WalletProvider | null>(null);
  const [accountInfo, setAccountInfo] = useState<WalletAccount | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Available providers
  const availableProviders = walletManager.getAvailableProviders();

  // Derived state
  const balance = accountInfo?.balance || 0;
  const usdcBalance = accountInfo?.assets.find(asset => asset.assetId === 31566704)?.balance || 0;

  // Initialize wallet state on mount
  useEffect(() => {
    const initializeWalletState = () => {
      const connected = walletManager.isConnected();
      const accounts = walletManager.getConnectedAccounts();
      const provider = walletManager.getConnectedProvider();

      setIsConnected(connected);
      setConnectedAccounts(accounts);
      setConnectedProvider(provider);

      if (accounts.length > 0) {
        setActiveAccount(accounts[0]);
      }
    };

    initializeWalletState();
  }, []);

  // Load account info when active account changes
  useEffect(() => {
    if (activeAccount) {
      refreshAccountInfo();
    } else {
      setAccountInfo(null);
    }
  }, [activeAccount]);

  // Connect to wallet
  const connect = useCallback(async (providerId: string) => {
    if (isConnecting) return;

    setIsConnecting(true);
    setError(null);

    try {
      const accounts = await walletManager.connect(providerId);
      const provider = walletManager.getConnectedProvider();

      setConnectedAccounts(accounts);
      setConnectedProvider(provider);
      setIsConnected(true);

      if (accounts.length > 0) {
        setActiveAccount(accounts[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting]);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      await walletManager.disconnect();

      setIsConnected(false);
      setConnectedAccounts([]);
      setActiveAccount(null);
      setConnectedProvider(null);
      setAccountInfo(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect wallet');
    }
  }, []);

  // Set active account
  const setActiveAccountHandler = useCallback((address: string) => {
    if (!connectedAccounts.includes(address)) {
      setError('Account not found in connected accounts');
      return;
    }

    setActiveAccount(address);
    setError(null);
  }, [connectedAccounts]);

  // Refresh account info
  const refreshAccountInfo = useCallback(async () => {
    if (!activeAccount) return;

    try {
      const info = await walletManager.getAccountInfo(activeAccount);
      setAccountInfo(info);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh account info');
    }
  }, [activeAccount]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Connection state
    isConnected,
    isConnecting,
    connectedAccounts,
    activeAccount,
    connectedProvider,

    // Wallet data
    accountInfo,
    balance,
    usdcBalance,

    // Actions
    connect,
    disconnect,
    setActiveAccount: setActiveAccountHandler,
    refreshAccountInfo,

    // Available providers
    availableProviders,

    // Error handling
    error,
    clearError,
  };
}