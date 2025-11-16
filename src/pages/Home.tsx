import React from "react";
import { useWallet } from "@txnlab/use-wallet-react";
import { useModernTrading } from "../hooks/useModernTrading";
import { formatAddress, formatBalance } from "../services/algorand/modern-wallet";
import { Link } from "react-router-dom";

export default function Home() {
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
  const algoBalance = accountInfo?.amount || 0;
  const usdcBalance = accountInfo?.assets?.find(
    (asset: any) => asset['asset-id'] === 31566704 // Testnet USDC
  )?.amount || 0;

  const {
    positions,
    totalUnrealizedPnL,
    marginUsed,
    availableMargin
  } = useModernTrading();


  return (
    <div className="w-full min-h-screen bg-white mt-[100px] px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to Velocity Finance
          </h1>
          <p className="text-lg text-gray-600">
            Trade perpetual futures with leverage on Algorand
          </p>
        </div>

        {!isConnected ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Connect Your Algorand Wallet
            </h2>
            <p className="text-gray-600 mb-6">
              Connect your wallet to start trading perpetual futures with up to 100x leverage
            </p>
            <Link
              to="/trade/ETHUSD"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Trading
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Wallet Info */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Wallet Information
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-mono text-sm text-gray-900">
                    {activeAddress ? formatAddress(activeAddress) : 'Not connected'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Provider</p>
                  <p className="text-sm text-gray-900">
                    {activeWallet?.metadata?.name || 'None'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ALGO Balance</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatBalance(algoBalance)} ALGO
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">USDC Balance</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatBalance(usdcBalance)} USDC
                  </p>
                </div>
              </div>
            </div>

            {/* Portfolio Summary */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Portfolio Summary
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Active Positions</p>
                  <p className="text-xl font-bold text-gray-900">
                    {positions.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Unrealized PnL</p>
                  <p className={`text-xl font-bold ${
                    totalUnrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${formatBalance(totalUnrealizedPnL, 6)} USDC
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Margin Used</p>
                  <p className="text-lg font-medium text-gray-900">
                    ${formatBalance(marginUsed, 6)} USDC
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Available Margin</p>
                  <p className="text-lg font-medium text-gray-900">
                    ${formatBalance(availableMargin, 6)} USDC
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Link
                  to="/trade/ETHUSD"
                  className="block w-full px-4 py-3 bg-blue-600 text-white text-center font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Trade ETH/USD
                </Link>
                <Link
                  to="/trade/BTCUSD"
                  className="block w-full px-4 py-3 bg-orange-600 text-white text-center font-medium rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Trade BTC/USD
                </Link>
                <Link
                  to="/trade/SOLUSD"
                  className="block w-full px-4 py-3 bg-purple-600 text-white text-center font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Trade SOL/USD
                </Link>
                <Link
                  to="/trade/ALGOUSD"
                  className="block w-full px-4 py-3 bg-gray-600 text-white text-center font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Trade ALGO/USD
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Recent Positions */}
        {isConnected && positions.length > 0 && (
          <div className="mt-8 bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Positions
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Symbol</th>
                    <th className="text-left py-2">Side</th>
                    <th className="text-left py-2">Size</th>
                    <th className="text-left py-2">Entry Price</th>
                    <th className="text-left py-2">Leverage</th>
                    <th className="text-left py-2">PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.slice(0, 5).map((position) => (
                    <tr key={position.id} className="border-b">
                      <td className="py-2 font-medium">{position.symbol}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          position.isLong ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {position.isLong ? 'LONG' : 'SHORT'}
                        </span>
                      </td>
                      <td className="py-2">${formatBalance(position.size, 8)}</td>
                      <td className="py-2">${formatBalance(position.entryPrice, 8)}</td>
                      <td className="py-2">{position.leverage}x</td>
                      <td className={`py-2 font-medium ${
                        (position.unrealizedPnL || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${formatBalance(position.unrealizedPnL || 0, 6)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
