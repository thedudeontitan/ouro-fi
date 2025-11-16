import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@txnlab/use-wallet-react";
import { formatAddress, formatBalance } from "../services/algorand/modern-wallet";

const navContainer = {
  hidden: { y: -100, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 20,
      staggerChildren: 0.1,
    },
  },
};

const navItem = {
  hidden: { y: -20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
};

export default function Navbar() {
  const location = useLocation();
  const {
    wallets,
    activeWallet,
    activeAddress,
    algodClient
  } = useWallet();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [accountInfo, setAccountInfo] = useState<any>(null);

  // Load account info when active address changes
  React.useEffect(() => {
    const loadAccountInfo = async () => {
      if (activeAddress && algodClient) {
        try {
          const info = await algodClient.accountInformation(activeAddress).do();
          setAccountInfo(info);
        } catch (err) {
          console.warn('Failed to load account info:', err);
        }
      } else {
        setAccountInfo(null);
      }
    };
    loadAccountInfo();
  }, [activeAddress, algodClient]);

  const handleConnect = async (walletId: string) => {
    const wallet = wallets?.find(w => w.id === walletId);
    if (!wallet) return;

    setIsConnecting(true);
    try {
      await wallet.connect();
      setShowWalletModal(false);
    } catch (err) {
      console.error('Failed to connect wallet:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (activeWallet) {
      try {
        await activeWallet.disconnect();
      } catch (err) {
        console.error('Failed to disconnect wallet:', err);
      }
    }
  };

  const algoBalance = accountInfo?.amount || 0;
  const isConnected = Boolean(activeWallet && activeAddress);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        backgroundColor: '#242931',
        borderBottom: '1px solid #434c5e'
      }}
      initial="hidden"
      animate="show"
      variants={navContainer}
    >
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo and brand */}
        <motion.div variants={navItem}>
          <Link to="/" className="flex items-center space-x-2">
            <motion.img
              src="/logo.png"
              alt="Ouro Logo"
              className="w-10 h-10 rounded-full"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            />
            <span className="text-xl font-bold" style={{
              color: '#eceff4'
            }}>Ouro</span>
          </Link>
        </motion.div>

        {/* Navigation menu */}
        <motion.div className="hidden lg:flex items-center space-x-8" variants={navItem}>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              to="/markets"
              className={`transition-colors hover:opacity-80 ${location.pathname === '/markets' ? 'pb-1 border-b-2' : ''}`}
              style={{
                color: location.pathname === '/markets'
                  ? '#eceff4'
                  : '#d8dee9',
                borderBottomColor: location.pathname === '/markets'
                  ? '#5e81ac'
                  : 'transparent'
              }}
            >
              Markets
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              to="/trade/ALGOUSD"
              className={`flex items-center space-x-2 transition-colors hover:opacity-80 ${location.pathname.startsWith('/trade') ? 'pb-1 border-b-2' : ''}`}
              style={{
                color: location.pathname.startsWith('/trade')
                  ? '#eceff4'
                  : '#d8dee9',
                borderBottomColor: location.pathname.startsWith('/trade')
                  ? '#5e81ac'
                  : 'transparent'
              }}
            >
              <motion.img
                src="/algorand.png"
                alt="Algorand"
                className="w-4 h-4"
                whileHover={{ rotate: 10 }}
                transition={{ type: "spring", stiffness: 300 }}
              />
              <span>Trade</span>
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/rewards" className="transition-colors hover:opacity-80" style={{
              color: '#d8dee9'
            }}>
              Rewards
            </Link>
          </motion.div>
          <Menu as="div" className="relative">
            <MenuButton className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors">
              <span>Earn</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </MenuButton>
            <MenuItems className="absolute right-0 mt-2 w-48 bg-[#262626] border border-gray-700 rounded-lg shadow-lg">
              <MenuItem>
                <Link to="/earn/staking" className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg">
                  Staking
                </Link>
              </MenuItem>
              <MenuItem>
                <Link to="/earn/liquidity" className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg">
                  Liquidity Mining
                </Link>
              </MenuItem>
            </MenuItems>
          </Menu>
          <Link to="/profile" className="text-gray-300 hover:text-white transition-colors">
            Profile
          </Link>
        </motion.div>

        {/* Right side - Real Wallet connection */}
        <motion.div className="flex items-center space-x-4" variants={navItem}>
          {!isConnected ? (
            <motion.button
              onClick={() => setShowWalletModal(true)}
              className="px-6 py-2 font-semibold transition-colors hover:opacity-90"
              style={{
                backgroundColor: '#5e81ac',
                color: '#eceff4',
                borderRadius: '8px',
                border: 'none'
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </motion.button>
          ) : (
            <motion.div
              className="flex items-center space-x-3"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <motion.div
                className="rounded-lg px-4 py-2"
                style={{
                  backgroundColor: '#3b4252',
                }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-right">
                  <div className="font-mono text-sm" style={{ color: '#eceff4' }}>
                    {activeAddress ? formatAddress(activeAddress) : 'Connected'}
                  </div>
                  <div className="text-xs" style={{ color: '#d8dee9' }}>
                    {formatBalance(algoBalance)} ALGO
                  </div>
                </div>
              </motion.div>
              <Menu as="div" className="relative">
                <MenuButton className="flex items-center space-x-2 rounded-lg px-3 py-2 transition-colors hover:opacity-80" style={{
                  backgroundColor: '#3b4252'
                }}>
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: '#5e81ac' }}></div>
                  <svg className="w-4 h-4" style={{ color: '#d8dee9' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </MenuButton>
                <MenuItems className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg" style={{
                  backgroundColor: '#3b4252',
                  border: '1px solid #434c5e'
                }}>
                  <MenuItem>
                    <Link to="/profile" className="block px-4 py-2 transition-colors hover:opacity-80 rounded-lg" style={{
                      color: '#d8dee9'
                    }}>
                      Profile
                    </Link>
                  </MenuItem>
                  <MenuItem>
                    <button
                      onClick={handleDisconnect}
                      className="block w-full text-left px-4 py-2 transition-colors hover:opacity-80 rounded-lg"
                      style={{ color: '#d8dee9' }}
                    >
                      Disconnect
                    </button>
                  </MenuItem>
                </MenuItems>
              </Menu>
            </motion.div>
          )}

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
                    <h3 className="text-lg font-semibold">Connect Algorand Wallet</h3>
                    <button
                      onClick={() => setShowWalletModal(false)}
                      className="transition-colors hover:opacity-80"
                      style={{ color: '#d8dee9' }}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {wallets?.map((wallet) => (
                      <motion.button
                        key={wallet.id}
                        onClick={() => handleConnect(wallet.id)}
                        className="w-full p-4 rounded-lg border transition-colors text-left flex items-center space-x-3"
                        style={{
                          backgroundColor: '#434c5e',
                          borderColor: '#5e81ac',
                          color: '#eceff4'
                        }}
                        whileHover={{ backgroundColor: '#4c566a' }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isConnecting || wallet.isConnected}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: '#5e81ac' }}>
                          {wallet.id === 'pera' && '🟣'}
                          {wallet.id === 'defly' && '🦋'}
                          {wallet.id === 'exodus' && '🚀'}
                          {wallet.id === 'lute' && '🎵'}
                          {wallet.id === 'walletconnect' && '🔗'}
                          {!['pera', 'defly', 'exodus', 'lute', 'walletconnect'].includes(wallet.id) && '👛'}
                        </div>
                        <div>
                          <div className="font-medium">{wallet.metadata.name}</div>
                          <div className="text-sm opacity-70">
                            {wallet.isConnected ? 'Connected' : `Connect with ${wallet.metadata.name}`}
                          </div>
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
        </motion.div>
      </div>
    </motion.div>
  );
}
