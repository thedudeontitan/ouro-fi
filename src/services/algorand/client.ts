/**
 * Algorand client configuration and initialization
 */

import algosdk from 'algosdk';

// Network configurations
export const NETWORKS = {
  testnet: {
    algodToken: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    algodServer: 'https://testnet-api.algonode.cloud',
    algodPort: 443,
    indexerToken: '',
    indexerServer: 'https://testnet-idx.algonode.cloud',
    indexerPort: 443,
  },
  mainnet: {
    algodToken: '',
    algodServer: 'https://mainnet-api.algonode.cloud',
    algodPort: 443,
    indexerToken: '',
    indexerServer: 'https://mainnet-idx.algonode.cloud',
    indexerPort: 443,
  },
  localnet: {
    algodToken: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    algodServer: 'http://localhost',
    algodPort: 4001,
    indexerToken: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    indexerServer: 'http://localhost',
    indexerPort: 8980,
  }
};

// Contract deployment info (loaded from deployment.json or environment)
export const CONTRACT_IDS = {
  PRICE_ORACLE: parseInt(import.meta.env.VITE_PRICE_ORACLE_APP_ID || '0'),
  FUNDING_RATE_MANAGER: parseInt(import.meta.env.VITE_FUNDING_MANAGER_APP_ID || '0'),
  PERPETUAL_DEX: parseInt(import.meta.env.VITE_PERPETUAL_DEX_APP_ID || '0'),
};

// Asset IDs
export const ASSET_IDS = {
  USDC: parseInt(import.meta.env.VITE_USDC_ASSET_ID || '31566704'), // Testnet USDC
};

// Get current network from environment
const CURRENT_NETWORK = (import.meta.env.VITE_ALGORAND_NETWORK as keyof typeof NETWORKS) || 'testnet';

export class AlgorandClient {
  private static instance: AlgorandClient;
  public algodClient: algosdk.Algodv2;
  public indexerClient: algosdk.Indexer;
  public network: keyof typeof NETWORKS;

  private constructor(network: keyof typeof NETWORKS = CURRENT_NETWORK) {
    this.network = network;
    const config = NETWORKS[network];

    this.algodClient = new algosdk.Algodv2(
      config.algodToken,
      config.algodServer,
      config.algodPort
    );

    this.indexerClient = new algosdk.Indexer(
      config.indexerToken,
      config.indexerServer,
      config.indexerPort
    );
  }

  public static getInstance(network?: keyof typeof NETWORKS): AlgorandClient {
    if (!AlgorandClient.instance || (network && AlgorandClient.instance.network !== network)) {
      AlgorandClient.instance = new AlgorandClient(network);
    }
    return AlgorandClient.instance;
  }

  /**
   * Get suggested transaction parameters
   */
  async getSuggestedParams(): Promise<algosdk.SuggestedParams> {
    return await this.algodClient.getTransactionParams().do();
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForConfirmation(txId: string, rounds: number = 10): Promise<any> {
    let status = await this.algodClient.status().do();
    let lastRound = Number(status.lastRound);
    let round = lastRound + 1;

    while (round < lastRound + rounds) {
      const pendingInfo = await this.algodClient.pendingTransactionInformation(txId).do();

      if (pendingInfo.confirmedRound !== null && pendingInfo.confirmedRound !== undefined && pendingInfo.confirmedRound > 0) {
        return pendingInfo;
      }

      if (pendingInfo.poolError != null && pendingInfo.poolError.length > 0) {
        throw new Error(`Transaction rejected: ${pendingInfo.poolError}`);
      }

      await this.algodClient.statusAfterBlock(round).do();
      round += 1;
    }

    throw new Error(`Transaction not confirmed after ${rounds} rounds`);
  }

  /**
   * Get account information
   */
  async getAccountInfo(address: string) {
    try {
      return await this.algodClient.accountInformation(address).do();
    } catch (error) {
      throw new Error(`Failed to get account info: ${error}`);
    }
  }

  /**
   * Get application information
   */
  async getApplicationInfo(appId: number) {
    try {
      return await this.algodClient.getApplicationByID(appId).do();
    } catch (error) {
      throw new Error(`Failed to get application info: ${error}`);
    }
  }

  /**
   * Compile TEAL program
   */
  async compileTeal(source: string): Promise<Uint8Array> {
    const compiled = await this.algodClient.compile(source).do();
    return new Uint8Array(Uint8Array.from(atob(compiled.result), c => c.charCodeAt(0)));
  }

  /**
   * Check if network is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      await this.algodClient.healthCheck().do();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current round
   */
  async getCurrentRound(): Promise<number> {
    const status = await this.algodClient.status().do();
    return Number(status.lastRound);
  }
}

// Export singleton instance
export const algorandClient = AlgorandClient.getInstance();