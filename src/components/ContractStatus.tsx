import React from 'react';
import { motion } from 'framer-motion';
import { CONTRACT_IDS, ASSET_IDS } from '../services/algorand/modern-wallet';

export default function ContractStatus() {
  const contracts = [
    { name: 'Oracle', id: CONTRACT_IDS.PRICE_ORACLE, status: CONTRACT_IDS.PRICE_ORACLE > 0 },
    { name: 'DEX', id: CONTRACT_IDS.PERPETUAL_DEX, status: CONTRACT_IDS.PERPETUAL_DEX > 0 },
    { name: 'OrderBook', id: CONTRACT_IDS.ORDERBOOK, status: CONTRACT_IDS.ORDERBOOK > 0 },
  ];

  const allDeployed = contracts.every(c => c.status);

  return (
    <motion.div
      className="fixed top-20 right-4 z-40 p-4 rounded-lg border"
      style={{
        backgroundColor: '#3b4252',
        borderColor: allDeployed ? '#a3be8c' : '#d08770',
        color: '#eceff4'
      }}
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1, duration: 0.5 }}
    >
      <div className="flex items-center space-x-2 mb-2">
        <div
          className={`w-3 h-3 rounded-full ${allDeployed ? 'bg-green-400' : 'bg-orange-400'}`}
        />
        <span className="text-sm font-medium">
          {allDeployed ? '🚀 Contracts Deployed' : '🔧 Mock Mode'}
        </span>
      </div>

      <div className="space-y-1 text-xs">
        {contracts.map((contract) => (
          <div key={contract.name} className="flex justify-between items-center">
            <span style={{ color: '#d8dee9' }}>{contract.name}:</span>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-1 rounded text-xs ${
                  contract.status
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-orange-500/20 text-orange-400'
                }`}
              >
                {contract.status ? contract.id : 'MOCK'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {!allDeployed && (
        <div className="mt-2 pt-2 border-t border-gray-600">
          <p className="text-xs" style={{ color: '#d8dee9' }}>
            Using mock data. Deploy contracts for real functionality.
          </p>
        </div>
      )}
    </motion.div>
  );
}