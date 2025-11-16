import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useWallet } from "@txnlab/use-wallet-react";
import TradingViewWidget from "../components/TradingView";
import { Symbols } from "../types";
import { getSymbolPrice } from "../utils/GetSymbolPrice";
import { useVelocityContracts, usePositions, usePriceData } from "../hooks/useContracts";
import { formatAddress } from "../services/algorand/modern-wallet";
import ContractStatus from "../components/ContractStatus";
import USDCHelper from "../components/USDCHelper";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
};

const slideIn = {
  hidden: { x: 300, opacity: 0 },
  show: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 20,
    },
  },
};

export default function Trade() {
  const { symbol } = useParams();
  const {
    activeWallet,
    activeAddress,
    algodClient
  } = useWallet();

  const [accountInfo, setAccountInfo] = React.useState<any>(null);

  // Load account info when active address changes
  React.useEffect(() => {
    const loadAccountInfo = async () => {
      if (activeAddress && algodClient) {
        try {
          const info = await algodClient.accountInformation(activeAddress).do();
          setAccountInfo(info);

          // Debug USDC balance
          const usdcAsset = info.assets?.find((asset: any) => asset['asset-id'] === 10458941);
          console.log('💰 Account Assets:', info.assets?.map((a: any) => ({ id: a['asset-id'], amount: a.amount })));
          console.log('💵 USDC Asset (10458941):', usdcAsset);
          console.log('💸 USDC Balance:', usdcAsset?.amount || 0);
        } catch (err) {
          console.warn('Failed to load account info:', err);
        }
      } else {
        setAccountInfo(null);
      }
    };
    loadAccountInfo();
  }, [activeAddress, algodClient]);

  const isConnected = Boolean(activeWallet && activeAddress);

  // Get USDC balance with proper conversion
  const usdcAsset = accountInfo?.assets?.find(
    (asset: any) => asset['asset-id'] === 10458941
  );
  const usdcBalance = usdcAsset?.amount ? Number(usdcAsset.amount) : 0;

  // Debug balance conversion
  React.useEffect(() => {
    if (isConnected) {
      console.log('🔍 USDC Balance Debug:', {
        raw: usdcAsset?.amount,
        converted: usdcBalance,
        formatted: (usdcBalance / 1000000).toFixed(2) + ' USDC'
      });
    }
  }, [usdcBalance, usdcAsset, isConnected]);
  const { dex, oracle, isReady, isLoading, error: contractError } = useVelocityContracts();
  const {
    positions,
    loading: positionsLoading,
    openNewPosition,
    closeExistingPosition,
    error: positionError
  } = usePositions();
  const { prices, loadPrice, error: priceError } = usePriceData();

  const isTrading = isLoading || positionsLoading;
  const tradingError = contractError || positionError || priceError;

  const [price, setPrice] = useState<number>(0);
  const [previousPrice, setPreviousPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"MARKET" | "LIMIT">("MARKET");
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState<string>("100");
  const [leverage, setLeverage] = useState<number>(10);
  const [showPositions, setShowPositions] = useState(true);
  const [showUSDCHelper, setShowUSDCHelper] = useState(false);

  // Real-time price updates
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let isInitialFetch = true;

    const fetchPrice = async () => {
      if (symbol) {
        try {
          const newPrice = await getSymbolPrice(symbol as keyof typeof Symbols);

          if (isInitialFetch) {
            // On first fetch, set both current and previous to same value
            setPrice(newPrice);
            setPreviousPrice(newPrice);
            // Set a realistic price change based on symbol
            const mockChanges = {
              'ETHUSD': -2.34,
              'BTCUSD': 1.87,
              'SOLUSD': -0.92,
              'ALGOUSD': 3.45
            };
            setPriceChange(mockChanges[symbol as keyof typeof mockChanges] || 0);
            isInitialFetch = false;
          } else {
            // For subsequent fetches, calculate real change
            if (previousPrice > 0) {
              const change = ((newPrice - previousPrice) / previousPrice) * 100;
              setPriceChange(change);
            }
            setPreviousPrice(price);
            setPrice(newPrice);
          }
        } catch (error) {
          console.error('Error fetching real-time price:', error);
        }
      }
    };

    // Initial price fetch
    fetchPrice();

    // Set up interval for real-time updates (every 5 seconds)
    intervalId = setInterval(fetchPrice, 5000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [symbol, price, previousPrice]);

  const currentSymbol = symbol?.replace("USD", "") || "ETH";
  const indexPrice = price > 0 ? price.toLocaleString(undefined, {
    minimumFractionDigits: price < 1 ? 6 : 2,
    maximumFractionDigits: price < 1 ? 8 : 2
  }) : "0.00";
  const fundingRate = "-0.0028%/hr";
  const marketSkew = "96.46K";

  const handleTrade = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    if (!symbol) {
      alert("No symbol selected");
      return;
    }

    const marginAmount = Math.floor(parseFloat(amount) * 1000000); // Convert to micro-USDC
    const positionSize = Math.floor(marginAmount * leverage);

    console.log('💳 Trade Validation:', {
      marginAmount,
      usdcBalance,
      marginAmountUSDC: marginAmount / 1000000,
      usdcBalanceUSDC: usdcBalance / 1000000,
      hasEnoughBalance: marginAmount <= usdcBalance
    });

    if (usdcBalance === 0) {
      alert(`You need testnet USDC to trade.

Asset ID: 10458941

You can:
1. Get testnet USDC from Algorand faucets
2. Add the USDC asset to your wallet first
3. Check that you're connected to the correct wallet`);
      return;
    }

    if (marginAmount > usdcBalance) {
      alert(`Insufficient USDC balance.

Required: ${(marginAmount / 1000000).toFixed(2)} USDC
Available: ${(usdcBalance / 1000000).toFixed(6)} USDC

Please add more USDC or reduce your position size.`);
      return;
    }

    try {
      const result = await openNewPosition(
        symbol.toUpperCase(),
        leverage,
        orderType === "BUY",
        marginAmount
      );

      if (result) {
        alert(`Position opened successfully! TxID: ${result}`);
        setAmount("100"); // Reset form
      }
    } catch (error) {
      alert(`Failed to open position: ${error}`);
    }
  };

  const handleClosePosition = async (positionId: number) => {
    try {
      const result = await closeExistingPosition(positionId);
      if (result) {
        alert(`Position closed! TxID: ${result}`);
      }
    } catch (error) {
      alert(`Failed to close position: ${error}`);
    }
  };

  // Load price data when symbol changes
  React.useEffect(() => {
    if (symbol && oracle.contract) {
      loadPrice(symbol.toUpperCase());
    }
  }, [symbol, oracle.contract, loadPrice]);

  // Calculate portfolio metrics from positions
  const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + (pos.size * 0.01), 0); // Mock calculation
  const marginUsed = positions.reduce((sum, pos) => sum + pos.size, 0);
  const availableMargin = usdcBalance - marginUsed;

  const clearError = () => {
    // Clear all errors - each hook has its own clearError method
  };


  return (
    <motion.div
      className="min-h-screen mt-20"
      style={{
        backgroundColor: '#242931',
        color: '#eceff4'
      }}
      initial="hidden"
      animate="show"
      variants={container}
    >
      {/* Contract Status Indicator */}
      <ContractStatus />

      {/* USDC Helper Modal */}
      <USDCHelper isVisible={showUSDCHelper} onClose={() => setShowUSDCHelper(false)} />
      {/* Header with price info */}
      <motion.div className="px-6 pt-6 pb-4" variants={item}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                   style={{ backgroundColor: '#3b4252' }}>
                {(() => {
                  const iconMap: { [key: string]: string } = {
                    ETH: "/eth.png",
                    BTC: "/btc.png",
                    SOL: "/sol.png",
                    ALGO: "/algorand.png"
                  };
                  return iconMap[currentSymbol] ? (
                    <img src={iconMap[currentSymbol]} alt={currentSymbol} className="w-6 h-6" />
                  ) : (
                    <span className="font-bold text-sm" style={{ color: '#eceff4' }}>
                      {currentSymbol}
                    </span>
                  );
                })()}
              </div>
              <h1 className="text-xl font-semibold" style={{ color: '#eceff4' }}>
                {currentSymbol} / USD
              </h1>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"
                   style={{ color: '#d8dee9' }}>
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>

            <motion.div
              className="text-2xl font-bold"
              style={{ color: priceChange >= 0 ? '#a3be8c' : '#bf616a' }}
              key={price} // This will trigger re-animation on price change
              initial={{ scale: 1.05, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {price > 0 ? (
                <>
                  ${price.toLocaleString(undefined, {
                    minimumFractionDigits: price < 1 ? 6 : 2,
                    maximumFractionDigits: price < 1 ? 8 : 2
                  })}
                  <span className="text-lg ml-2">
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                  </span>
                </>
              ) : (
                <span style={{ color: '#d8dee9' }}>Loading...</span>
              )}
            </motion.div>

            {/* Market stats */}
            <div className="flex flex-wrap gap-4 lg:gap-6 text-sm">
              <div>
                <div className="text-xs" style={{ color: '#d8dee9' }}>
                  Index Price
                </div>
                <div className="font-medium" style={{ color: '#eceff4' }}>
                  {indexPrice}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: '#d8dee9' }}>
                  Funding Rate
                </div>
                <div className="font-medium" style={{ color: '#eceff4' }}>
                  {fundingRate}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: '#d8dee9' }}>
                  Market Skew
                </div>
                <div className="font-medium" style={{ color: '#eceff4' }}>
                  {marketSkew}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Wallet status display */}
            {isConnected && activeAddress && (
              <div className="flex items-center space-x-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#3b4252' }}>
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm font-mono" style={{ color: '#eceff4' }}>
                  {formatAddress(activeAddress)}
                </span>
              </div>
            )}

            <button className="p-2 rounded transition-colors hover:opacity-80"
                    style={{ backgroundColor: '#3b4252' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                   style={{ color: '#d8dee9' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main content area with chart and side panel */}
      <motion.div className="px-6" variants={item}>
        {/* Chart and Trading Panel Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Chart container - takes remaining space */}
          <motion.div
            className="flex-1 order-2 lg:order-1"
            variants={item}
          >
            <div className="h-[400px] lg:h-[600px] rounded-lg overflow-hidden" style={{
            }}>
              <TradingViewWidget symbol={`${currentSymbol}USD`} />
            </div>
          </motion.div>

          {/* Trading Panel - fixed width sidebar */}
          <motion.div
            className="w-full lg:w-80 lg:flex-shrink-0 order-1 lg:order-2"
            variants={slideIn}
          >
            <div className="rounded-lg p-4 h-fit" style={{
              backgroundColor: '#242931',
              border: '1px solid #434c5e',
              borderRadius: 'var(--rk-radii-modal)'
            }}>
              {/* Market/Limit tabs */}
              <div className="flex mb-4 text-sm">
                {["MARKET", "LIMIT"].map((tab) => (
                  <motion.button
                    key={tab}
                    onClick={() => setActiveTab(tab as "MARKET" | "LIMIT")}
                    className={`flex-1 py-2 px-4 font-medium transition-colors ${
                      activeTab === tab
                        ? "border-b-2"
                        : ""
                    }`}
                    style={{
                      color: activeTab === tab ? '#eceff4' : '#d8dee9',
                      borderBottomColor: activeTab === tab ? '#5e81ac' : 'transparent'
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {tab}
                  </motion.button>
                ))}
              </div>

              {/* Price display on right */}
              <div className="text-right mb-4">
                <div className="text-xs text-gray-400 mb-1">4280.00</div>
                <div className="text-xs text-gray-400 mb-1">4240.00</div>
                <div className="text-xs text-gray-400 mb-1">4200.00</div>
                <div className="text-xs text-gray-400 mb-1">4160.00</div>
                <div className="text-xs text-gray-400 mb-1">4120.00</div>
                <div className="text-xs text-red-400 bg-red-500/20 px-2 py-1 rounded mb-1">4077.50</div>
                <div className="text-xs text-gray-400 mb-1">4040.00</div>
                <div className="text-xs text-gray-400 mb-1">4000.00</div>
                <div className="text-xs text-gray-400 mb-1">3960.00</div>
                <div className="text-xs text-gray-400">3920.00</div>
              </div>

              {/* Buy/Sell tabs */}
              <div className="flex mb-4 rounded-lg p-1" style={{
                backgroundColor: '#3b4252'
              }}>
                {["BUY", "SELL"].map((type) => (
                  <motion.button
                    key={type}
                    onClick={() => setOrderType(type as "BUY" | "SELL")}
                    className={`flex-1 py-2 px-4 rounded text-sm font-bold transition-colors`}
                    style={{
                      backgroundColor: orderType === type
                        ? (type === "BUY" ? '#a3be8c' : '#bf616a')
                        : 'transparent',
                      color: orderType === type
                        ? (type === "BUY" ? '#242931' : '#eceff4')
                        : '#d8dee9',
                      borderRadius: 'var(--rk-radii-connectButton)'
                    }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {type}
                  </motion.button>
                ))}
              </div>

              {/* Amount input */}
              <div className="mb-4">
                <label className="block text-xs mb-2 font-medium" style={{
                  color: '#d8dee9'
                }}>PAY</label>
                <div className="relative">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm"
                    placeholder="0.00"
                    style={{
                      backgroundColor: '#3b4252',
                      border: '1px solid #434c5e',
                      borderRadius: 'var(--rk-radii-connectButton)',
                      color: '#eceff4'
                    }}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                    <span className="text-white font-medium text-sm">USDC</span>
                    <button className="text-gray-400 hover:text-white">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <button className="text-gray-400 hover:text-white">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Leverage */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs text-gray-400 font-medium">LEVERAGE</label>
                  <span className="text-white font-medium text-sm">{leverage}x</span>
                </div>

                {/* Custom leverage slider */}
                <div className="relative mb-2">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={leverage}
                    onChange={(e) => setLeverage(Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer leverage-slider"
                    style={{
                      background: `linear-gradient(90deg, #4ade80 0%, #3b82f6 50%, #8b5cf6 100%)`
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1x - Safe</span>
                  <span className="text-purple-400">100x - Degen</span>
                </div>
              </div>

              {/* Trading Status */}
              {isConnected && (
                <div className="mb-4 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span style={{ color: '#d8dee9' }}>Available Margin:</span>
                    <div className="flex items-center space-x-2">
                      <span style={{
                        color: usdcBalance > 0 ? '#eceff4' : '#bf616a'
                      }}>
                        {usdcBalance > 0
                          ? `${(usdcBalance / 1000000).toFixed(6)} USDC`
                          : 'No USDC'
                        }
                      </span>
                      {usdcBalance === 0 && (
                        <button
                          onClick={() => setShowUSDCHelper(true)}
                          className="text-xs px-2 py-1 rounded transition-colors hover:opacity-80"
                          style={{
                            backgroundColor: '#5e81ac',
                            color: '#eceff4'
                          }}
                        >
                          Get USDC
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: '#d8dee9' }}>Position Size:</span>
                    <span style={{ color: '#eceff4' }}>
                      ${((parseFloat(amount) || 0) * leverage).toFixed(2)}
                    </span>
                  </div>
                  {tradingError && (
                    <div className="text-red-400 text-xs mt-2">
                      {tradingError}
                      <button onClick={clearError} className="ml-2 text-red-300 hover:text-red-100">
                        ×
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Trade button */}
              <motion.button
                onClick={handleTrade}
                disabled={!isConnected || isTrading}
                className="w-full py-3 font-bold text-sm transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: !isConnected
                    ? '#434c5e'
                    : orderType === "BUY"
                    ? '#a3be8c'
                    : '#bf616a',
                  color: !isConnected
                    ? '#d8dee9'
                    : orderType === "BUY" ? '#242931' : '#eceff4',
                  borderRadius: 'var(--rk-radii-connectButton)',
                  border: 'none',
                  boxShadow: 'var(--rk-shadows-connectButton)'
                }}
                whileTap={{ scale: isConnected ? 0.95 : 1 }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              >
                {!isConnected
                  ? "Connect Wallet to Trade"
                  : isTrading
                  ? "Processing..."
                  : `${orderType} / ${orderType === "BUY" ? "LONG" : "SHORT"}`
                }
              </motion.button>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom tabs */}
      <motion.div
        className="px-6 mt-6 mb-6"
        variants={item}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
      >
        <div className="flex space-x-8 border-b"
             style={{ borderColor: '#434c5e' }}>
          <motion.button
            className="pb-3 font-medium border-b-2"
            style={{
              color: '#eceff4',
              borderBottomColor: '#5e81ac'
            }}
            whileTap={{ scale: 0.95 }}
          >
            Positions
          </motion.button>
          <motion.button
            className="pb-3 transition-colors"
            style={{ color: '#d8dee9' }}
            whileTap={{ scale: 0.95 }}
          >
            Orders
          </motion.button>
          <motion.button
            className="pb-3 transition-colors"
            style={{ color: '#d8dee9' }}
            whileTap={{ scale: 0.95 }}
          >
            History
          </motion.button>
          <motion.div
            className="ml-auto flex items-center"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <input type="checkbox" className="mr-2 text-xs" />
            <span className="text-xs" style={{ color: '#d8dee9' }}>
              Include Fees
            </span>
          </motion.div>
        </div>
        <motion.div
          className="py-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {!isConnected ? (
            <div className="text-center text-sm" style={{ color: '#d8dee9' }}>
              Connect wallet to view positions
            </div>
          ) : positions.length === 0 ? (
            <div className="text-center text-sm" style={{ color: '#d8dee9' }}>
              No positions found
            </div>
          ) : (
            <div className="space-y-2">
              {positions.map((position) => (
                <motion.div
                  key={position.timestamp}
                  className="p-4 rounded-lg border"
                  style={{
                    backgroundColor: '#3b4252',
                    borderColor: '#434c5e'
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ backgroundColor: '#434c5e' }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-medium" style={{ color: '#eceff4' }}>
                        {position.symbol}
                      </span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
                        position.size > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {position.size > 0 ? 'LONG' : 'SHORT'} {position.leverage}x
                      </span>
                    </div>
                    <button
                      onClick={() => handleClosePosition(position.timestamp)}
                      disabled={isTrading}
                      className="px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                      style={{
                        backgroundColor: '#bf616a',
                        color: '#eceff4'
                      }}
                    >
                      Close
                    </button>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-xs" style={{ color: '#d8dee9' }}>Size</div>
                      <div style={{ color: '#eceff4' }}>
                        ${(position.size / 100000000).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: '#d8dee9' }}>Entry Price</div>
                      <div style={{ color: '#eceff4' }}>
                        ${(position.entryPrice / 100000000).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: '#d8dee9' }}>Margin</div>
                      <div style={{ color: '#eceff4' }}>
                        ${(position.margin / 1000000).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: '#d8dee9' }}>Unrealized PnL</div>
                      <div className="text-green-400">
                        ${((position.size * 0.01) / 1000000).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Portfolio Summary */}
              {positions.length > 0 && (
                <motion.div
                  className="p-4 rounded-lg border mt-4"
                  style={{
                    backgroundColor: '#434c5e',
                    borderColor: '#5e81ac'
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="text-sm font-medium mb-2" style={{ color: '#eceff4' }}>
                    Portfolio Summary
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-xs" style={{ color: '#d8dee9' }}>Total Unrealized PnL</div>
                      <div className={totalUnrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                        ${(totalUnrealizedPnL / 1000000).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: '#d8dee9' }}>Margin Used</div>
                      <div style={{ color: '#eceff4' }}>
                        ${(marginUsed / 1000000).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: '#d8dee9' }}>Available Margin</div>
                      <div style={{ color: '#eceff4' }}>
                        ${(availableMargin / 1000000).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Custom CSS for leverage slider */}
      <style>{`
        .leverage-slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 3px solid #1a1a1a;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          transition: all 0.2s ease;
        }


        .leverage-slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 3px solid #1a1a1a;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          transition: all 0.2s ease;
        }


        .leverage-slider::-webkit-slider-track {
          height: 8px;
          border-radius: 4px;
          background: linear-gradient(90deg, #4ade80 0%, #3b82f6 50%, #8b5cf6 100%);
        }

        .leverage-slider::-moz-range-track {
          height: 8px;
          border-radius: 4px;
          background: linear-gradient(90deg, #4ade80 0%, #3b82f6 50%, #8b5cf6 100%);
          border: none;
        }
      `}</style>
    </motion.div>
  );
}