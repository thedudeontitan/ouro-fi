/**
 * Algorand Wallet Connection Component
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAlgorandWallet } from '../hooks/useAlgorandWallet';

export default function AlgorandWalletConnect() {
  const {
    isConnected,
    isConnecting,
    activeAccount,
    connectedProvider,
    balance,
    usdcBalance,
    connect,
    disconnect,
    availableProviders,
    error,
    clearError
  } = useAlgorandWallet();

  const [showWalletModal, setShowWalletModal] = useState(false);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: number, decimals: number = 6) => {
    return (balance / Math.pow(10, decimals)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals === 6 ? 2 : 8
    });
  };

  const handleConnect = async (providerId: string) => {
    try {
      await connect(providerId);
      setShowWalletModal(false);
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  if (!isConnected) {
    return (
      <>
        <motion.button
          onClick={() => setShowWalletModal(true)}
          className="px-4 py-2 rounded-lg font-medium transition-colors"
          style={{
            backgroundColor: '#5e81ac',
            color: '#eceff4'
          }}
          whileTap={{ scale: 0.95 }}
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </motion.button>

        {/* Wallet Selection Modal */}
        <AnimatePresence>
          {showWalletModal && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
                style={{
                  backgroundColor: '#3b4252',
                  color: '#eceff4'
                }}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Connect Algorand Wallet</h3>
                  <button
                    onClick={() => setShowWalletModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">
                    {error}
                    <button onClick={clearError} className="float-right ml-2 text-red-300 hover:text-red-100">
                      ×
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  {availableProviders.map((provider) => (
                    <motion.button
                      key={provider.id}
                      onClick={() => handleConnect(provider.id)}
                      className="w-full p-4 rounded-lg border transition-colors text-left flex items-center space-x-3"
                      style={{
                        backgroundColor: '#434c5e',
                        borderColor: '#5e81ac',
                        color: '#eceff4'
                      }}
                      whileHover={{ backgroundColor: '#4c566a' }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isConnecting}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                           style={{ backgroundColor: '#5e81ac' }}>
                        <span className="text-sm font-bold">{provider.name[0]}</span>
                      </div>
                      <div>
                        <div className="font-medium">{provider.name}</div>
                        <div className="text-sm opacity-70">Connect with {provider.name}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div className="mt-4 text-xs text-center opacity-70">
                  Choose your preferred Algorand wallet to connect to the DEX
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      {/* Account Info */}
      <div className="text-right">
        <div className="text-sm font-medium" style={{ color: '#eceff4' }}>
          {formatAddress(activeAccount!)}
        </div>
        <div className="text-xs" style={{ color: '#d8dee9' }}>
          {formatBalance(usdcBalance)} USDC
        </div>
      </div>

      {/* Provider Icon */}
      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
           style={{ backgroundColor: '#5e81ac' }}>
        <span className="text-sm font-bold text-white">
          {connectedProvider?.name[0]}
        </span>
      </div>

      {/* Disconnect Button */}
      <button
        onClick={handleDisconnect}
        className="p-2 rounded-lg transition-colors hover:opacity-80"
        style={{ backgroundColor: '#bf616a', color: '#eceff4' }}
        title="Disconnect"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>

      {/* Error Display */}
      {error && (
        <motion.div
          className="fixed top-4 right-4 z-50 p-3 rounded-lg bg-red-500/90 text-white max-w-sm"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
        >
          <div className="flex justify-between items-start">
            <span className="text-sm">{error}</span>
            <button onClick={clearError} className="ml-2 text-red-200 hover:text-white">
              ×
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}