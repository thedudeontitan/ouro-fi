/**
 * Fallback implementations for wallet providers when packages are not installed
 */

// Mock implementations for development when wallet packages are not available
export const mockWalletProviders = {
  myalgo: {
    connect: async () => {
      return [{ address: 'ALGORAND_MOCK_ADDRESS_1234567890' }];
    },
    signTransaction: async (txn: Uint8Array) => {
      console.log('Mock MyAlgo transaction signing:', txn);
      return { blob: new Uint8Array(64).fill(1) };
    }
  },

  pera: {
    connect: async () => {
      return ['ALGORAND_MOCK_PERA_ADDRESS_1234567890'];
    },
    disconnect: async () => {
      console.log('Mock Pera disconnect');
    },
    signTransaction: async (txnGroup: any[]) => {
      console.log('Mock Pera transaction group signing:', txnGroup.length, 'transactions');
      return txnGroup.map(() => new Uint8Array(64).fill(2));
    }
  },

  defly: {
    connect: async () => {
      return ['ALGORAND_MOCK_DEFLY_ADDRESS_1234567890'];
    },
    disconnect: async () => {
      console.log('Mock Defly disconnect');
    },
    signTransaction: async (txnGroup: any[]) => {
      console.log('Mock Defly transaction group signing:', txnGroup.length, 'transactions');
      return txnGroup.map(() => new Uint8Array(64).fill(3));
    }
  }
};

// Check if we're in development mode
export const isDevelopmentMode = () => {
  return import.meta.env.DEV || import.meta.env.VITE_ALGORAND_NETWORK === 'localnet';
};

// Helper to show development notice
export const showDevNotice = (walletName: string) => {
  if (isDevelopmentMode()) {
    console.warn(`🚧 Development Mode: Using mock ${walletName} wallet implementation.`);
    console.warn('To use real wallets, install the wallet packages and connect a real wallet.');
  }
};