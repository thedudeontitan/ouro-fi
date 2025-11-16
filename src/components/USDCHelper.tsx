import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface USDCHelperProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function USDCHelper({ isVisible, onClose }: USDCHelperProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="rounded-xl p-6 w-full max-w-md mx-4"
            style={{
              backgroundColor: '#3b4252',
              color: '#eceff4'
            }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">💵 Get Testnet USDC</h3>
              <button
                onClick={onClose}
                className="transition-colors hover:opacity-80"
                style={{ color: '#d8dee9' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium mb-2" style={{ color: '#eceff4' }}>
                  📋 Testnet USDC Asset ID:
                  <code className="ml-2 px-2 py-1 rounded" style={{ backgroundColor: '#434c5e' }}>
                    10458941
                  </code>
                </h4>
              </div>

              <div>
                <h4 className="font-medium mb-2" style={{ color: '#eceff4' }}>
                  🔄 How to get Testnet USDC:
                </h4>
                <ol className="space-y-2 text-sm" style={{ color: '#d8dee9' }}>
                  <li>
                    <strong>1. Add the Asset:</strong>
                    <br />Add asset ID <code>10458941</code> to your Algorand wallet
                  </li>
                  <li>
                    <strong>2. Get from Faucet:</strong>
                    <br />Visit Algorand testnet faucets or DEX platforms
                  </li>
                  <li>
                    <strong>3. Trade for USDC:</strong>
                    <br />Use testnet DEXes to trade ALGO for USDC
                  </li>
                  <li>
                    <strong>4. Refresh Balance:</strong>
                    <br />Reconnect your wallet to see the updated balance
                  </li>
                </ol>
              </div>

              <div className="p-3 rounded-lg" style={{ backgroundColor: '#434c5e' }}>
                <h4 className="font-medium mb-2" style={{ color: '#a3be8c' }}>
                  🌐 Useful Links:
                </h4>
                <ul className="space-y-1 text-xs" style={{ color: '#d8dee9' }}>
                  <li>
                    <a
                      href="https://testnet.algoexplorer.io/asset/10458941"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-400 underline"
                    >
                      📊 View USDC on AlgoExplorer
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://testnet.algoexplorer.io/dispenser"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-400 underline"
                    >
                      🚰 Algorand Testnet Faucet
                    </a>
                  </li>
                  <li>
                    <span className="opacity-70">
                      💡 Tip: You can also ask in Algorand Discord for testnet tokens
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <motion.button
                onClick={onClose}
                className="px-4 py-2 rounded font-medium"
                style={{
                  backgroundColor: '#5e81ac',
                  color: '#eceff4'
                }}
                whileHover={{ backgroundColor: '#81a1c1' }}
                whileTap={{ scale: 0.95 }}
              >
                Got it!
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}