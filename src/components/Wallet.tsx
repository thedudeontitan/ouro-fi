import { useState } from "react";
import { motion, AnimatePresence } from 'framer-motion';

import Button from "./Button";
import { renderFormattedBalance } from "../lib.tsx";
import { useAlgorandWallet } from "../hooks/useAlgorandWallet";

export default function Wallet() {
  const {
    isConnected,
    isConnecting,
    activeAccount,
    connectedProvider,
    balance,
    usdcBalance,
    connect,
    disconnect,
    refreshAccountInfo,
    availableProviders,
    error,
    clearError
  } = useAlgorandWallet();

  const [showWalletModal, setShowWalletModal] = useState(false);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
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
        <div className="text-center">
          <Button onClick={() => setShowWalletModal(true)} className="w-full" disabled={isConnecting}>
            {isConnecting ? 'Connecting...' : 'Connect Algorand Wallet'}
          </Button>
          <p className="mt-4 text-sm text-zinc-300/70">
            Connect your Algorand wallet to trade perpetual futures with leverage.
          </p>
        </div>

        {/* Wallet Selection Modal */}
        <AnimatePresence>
          {showWalletModal && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWalletModal(false)}
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
                onClick={(e) => e.stopPropagation()}
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
                  Choose your preferred Algorand wallet to start trading
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      {error && (
        <motion.div
          className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
          <button onClick={clearError} className="float-right ml-2 text-red-300 hover:text-red-100">
            ×
          </button>
        </motion.div>
      )}

      <div>
        <h3 className="mb-1 text-sm font-medium dark:text-zinc-300/70">
          Address
        </h3>
        <div className="flex flex-col md:flex-row items-center justify-between text-base dark:text-zinc-50">
          <input
            type="text"
            value={activeAccount ? formatAddress(activeAccount) : ''}
            className="w-2/3 bg-gray-800 rounded-md mb-2 md:mb-0 px-2 py-1 mr-3 truncate font-mono"
            disabled
            title={activeAccount || ''}
          />
          <Button onClick={handleDisconnect} className="w-1/3">
            Disconnect
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-medium dark:text-zinc-300/70">
          ALGO Balance
        </h3>
        <div className="flex items-center justify-between text-base dark:text-zinc-50">
          <input
            type="text"
            value={`${formatBalance(balance, 6)} ALGO`}
            className="w-2/3 bg-gray-800 rounded-md px-2 py-1 mr-3 truncate font-mono"
            disabled
          />
          <Button onClick={refreshAccountInfo} className="w-1/3">
            Refresh
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-medium dark:text-zinc-300/70">
          USDC Balance
        </h3>
        <div className="flex items-center justify-between text-base dark:text-zinc-50">
          <input
            type="text"
            value={`${formatBalance(usdcBalance, 6)} USDC`}
            className="w-2/3 bg-gray-800 rounded-md px-2 py-1 mr-3 truncate font-mono"
            disabled
          />
          <div className="w-1/3 text-xs text-zinc-400 text-center">
            Trading Collateral
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 text-sm">
        <div className="w-6 h-6 rounded-full flex items-center justify-center"
             style={{ backgroundColor: '#5e81ac' }}>
          <span className="text-xs font-bold text-white">
            {connectedProvider?.name[0]}
          </span>
        </div>
        <span className="text-zinc-300/70">
          Connected via {connectedProvider?.name}
        </span>
      </div>

      <div>
        <p>
          Start trading perpetual futures with leverage on Algorand. Learn more about
          Algorand development{" "}
          <a
            href="https://developer.algorand.org/"
            className="text-green-500/80 transition-colors hover:text-green-500"
            target="_blank"
            rel="noreferrer"
          >
            here
          </a>
          .
        </p>
      </div>
    </>
  );
}
