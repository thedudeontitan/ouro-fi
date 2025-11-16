/**
 * Perpetual DEX service for interacting with smart contracts
 */

import algosdk from 'algosdk';
import { algorandClient, CONTRACT_IDS, ASSET_IDS } from './client';
import { walletManager } from './wallet';

export interface Position {
  id: number;
  trader: string;
  symbol: string;
  size: number;
  entryPrice: number;
  margin: number;
  leverage: number;
  isLong: boolean;
  timestamp: number;
  fundingIndex: number;
  liquidationPrice: number;
  unrealizedPnL?: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  fundingRate: number;
  longOpenInterest: number;
  shortOpenInterest: number;
  volume24h: number;
}

export interface OrderParams {
  symbol: string;
  size: number;
  leverage: number;
  isLong: boolean;
  marginAmount: number;
}

export class PerpetualDEXService {
  private static instance: PerpetualDEXService;

  private constructor() {}

  public static getInstance(): PerpetualDEXService {
    if (!PerpetualDEXService.instance) {
      PerpetualDEXService.instance = new PerpetualDEXService();
    }
    return PerpetualDEXService.instance;
  }

  /**
   * Open a new perpetual position
   */
  async openPosition(params: OrderParams): Promise<{txId: string, positionId: number}> {
    const connectedAccounts = walletManager.getConnectedAccounts();
    if (connectedAccounts.length === 0) {
      throw new Error('No wallet connected');
    }

    const sender = connectedAccounts[0];
    const suggestedParams = await algorandClient.getSuggestedParams();

    // Create margin payment transaction
    const marginPayment = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: sender,
      receiver: algosdk.getApplicationAddress(CONTRACT_IDS.PERPETUAL_DEX),
      amount: params.marginAmount,
      assetIndex: ASSET_IDS.USDC,
      suggestedParams,
    });

    // Create oracle price call (mock for now)
    const oracleCall = algosdk.makeApplicationCallTxnFromObject({
      sender: sender,
      appIndex: CONTRACT_IDS.PRICE_ORACLE,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      appArgs: [
        new TextEncoder().encode('get_price'),
        new TextEncoder().encode(params.symbol),
      ],
      suggestedParams,
    });

    // Create open position call
    const openPositionCall = algosdk.makeApplicationCallTxnFromObject({
      sender: sender,
      appIndex: CONTRACT_IDS.PERPETUAL_DEX,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      appArgs: [
        new TextEncoder().encode('open_position'),
        new TextEncoder().encode(params.symbol),
        algosdk.encodeUint64(params.size),
        algosdk.encodeUint64(params.leverage),
        new Uint8Array([params.isLong ? 1 : 0]),
      ],
      foreignApps: [CONTRACT_IDS.PRICE_ORACLE],
      foreignAssets: [ASSET_IDS.USDC],
      suggestedParams,
    });

    // Group transactions
    const txnGroup = [marginPayment, oracleCall, openPositionCall];
    algosdk.assignGroupID(txnGroup);

    try {
      // Sign transactions
      const signedTxnGroup = await walletManager.signTransactionGroup(txnGroup);

      // Submit to network
      const txId = await algorandClient.algodClient.sendRawTransaction(signedTxnGroup).do();

      // Wait for confirmation
      const result = await algorandClient.waitForConfirmation(txId.txid);

      // Extract position ID from logs (simplified)
      const positionId = this.extractPositionIdFromLogs(result);

      return { txId: txId.txid, positionId };
    } catch (error) {
      throw new Error(`Failed to open position: ${error}`);
    }
  }

  /**
   * Close an existing position
   */
  async closePosition(positionId: number): Promise<{txId: string, pnl: number}> {
    const connectedAccounts = walletManager.getConnectedAccounts();
    if (connectedAccounts.length === 0) {
      throw new Error('No wallet connected');
    }

    const sender = connectedAccounts[0];
    const suggestedParams = await algorandClient.getSuggestedParams();

    // Get position data first
    const position = await this.getPosition(positionId);

    // Create oracle price call
    const oracleCall = algosdk.makeApplicationCallTxnFromObject({
      sender: sender,
      appIndex: CONTRACT_IDS.PRICE_ORACLE,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      appArgs: [
        new TextEncoder().encode('get_price'),
        new TextEncoder().encode(position.symbol),
      ],
      suggestedParams,
    });

    // Create close position call
    const closePositionCall = algosdk.makeApplicationCallTxnFromObject({
      sender: sender,
      appIndex: CONTRACT_IDS.PERPETUAL_DEX,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      appArgs: [
        new TextEncoder().encode('close_position'),
        algosdk.encodeUint64(positionId),
      ],
      foreignApps: [CONTRACT_IDS.PRICE_ORACLE],
      foreignAssets: [ASSET_IDS.USDC],
      suggestedParams,
    });

    // Group transactions
    const txnGroup = [oracleCall, closePositionCall];
    algosdk.assignGroupID(txnGroup);

    try {
      // Sign transactions
      const signedTxnGroup = await walletManager.signTransactionGroup(txnGroup);

      // Submit to network
      const txId = await algorandClient.algodClient.sendRawTransaction(signedTxnGroup).do();

      // Wait for confirmation
      const result = await algorandClient.waitForConfirmation(txId.txid);

      // Extract PnL from logs
      const pnl = this.extractPnLFromLogs(result);

      return { txId: txId.txid, pnl };
    } catch (error) {
      throw new Error(`Failed to close position: ${error}`);
    }
  }

  /**
   * Get position data by ID
   */
  async getPosition(positionId: number): Promise<Position> {
    try {
      // Read position from application global state
      const appInfo = await algorandClient.getApplicationInfo(CONTRACT_IDS.PERPETUAL_DEX);

      // This is simplified - in reality, you'd read from box storage
      // For now, return mock data
      const mockPosition: Position = {
        id: positionId,
        trader: walletManager.getConnectedAccounts()[0] || '',
        symbol: 'ETHUSD',
        size: 1000000000, // 10 ETH with 8 decimals
        entryPrice: 400000000000, // $4000 with 8 decimals
        margin: 100000000, // 100 USDC with 6 decimals
        leverage: 10,
        isLong: true,
        timestamp: Math.floor(Date.now() / 1000),
        fundingIndex: 0,
        liquidationPrice: 360000000000, // $3600 with 8 decimals
      };

      return mockPosition;
    } catch (error) {
      throw new Error(`Failed to get position: ${error}`);
    }
  }

  /**
   * Get user positions
   */
  async getUserPositions(userAddress: string): Promise<Position[]> {
    try {
      // In a real implementation, you'd query the indexer or application state
      // For now, return mock data
      const mockPositions: Position[] = [
        {
          id: 1,
          trader: userAddress,
          symbol: 'ETHUSD',
          size: 1000000000,
          entryPrice: 400000000000,
          margin: 100000000,
          leverage: 10,
          isLong: true,
          timestamp: Math.floor(Date.now() / 1000) - 3600,
          fundingIndex: 0,
          liquidationPrice: 360000000000,
          unrealizedPnL: 5000000, // $5 profit
        },
        {
          id: 2,
          trader: userAddress,
          symbol: 'BTCUSD',
          size: 100000000,
          entryPrice: 6500000000000,
          margin: 200000000,
          leverage: 5,
          isLong: false,
          timestamp: Math.floor(Date.now() / 1000) - 7200,
          fundingIndex: 0,
          liquidationPrice: 6825000000000,
          unrealizedPnL: -8000000, // $8 loss
        },
      ];

      return mockPositions;
    } catch (error) {
      throw new Error(`Failed to get user positions: ${error}`);
    }
  }

  /**
   * Get market data for a symbol
   */
  async getMarketData(symbol: string): Promise<MarketData> {
    try {
      // Get price from oracle
      const price = await this.getPrice(symbol);

      // Get funding rate
      const fundingRate = await this.getFundingRate(symbol);

      // Mock other data for now
      const marketData: MarketData = {
        symbol,
        price,
        fundingRate,
        longOpenInterest: 50000000000, // $500M
        shortOpenInterest: 45000000000, // $450M
        volume24h: 100000000000, // $1B
      };

      return marketData;
    } catch (error) {
      throw new Error(`Failed to get market data: ${error}`);
    }
  }

  /**
   * Get current price for a symbol
   */
  async getPrice(symbol: string): Promise<number> {
    try {
      // In a real implementation, you'd call the price oracle
      // For now, return mock prices
      const mockPrices: { [key: string]: number } = {
        'ETHUSD': 400000000000, // $4000
        'BTCUSD': 6500000000000, // $65000
        'SOLUSD': 20000000000, // $200
        'ALGOUSD': 25000000, // $0.25
      };

      return mockPrices[symbol] || 100000000000; // Default $1000
    } catch (error) {
      throw new Error(`Failed to get price: ${error}`);
    }
  }

  /**
   * Get funding rate for a symbol
   */
  async getFundingRate(symbol: string): Promise<number> {
    try {
      // Call funding rate manager contract
      // For now, return mock funding rates
      const mockRates: { [key: string]: number } = {
        'ETHUSD': 28, // 0.0028%
        'BTCUSD': -15, // -0.0015%
        'SOLUSD': 45, // 0.0045%
        'ALGOUSD': 10, // 0.001%
      };

      return mockRates[symbol] || 0;
    } catch (error) {
      throw new Error(`Failed to get funding rate: ${error}`);
    }
  }

  /**
   * Calculate liquidation price
   */
  calculateLiquidationPrice(
    entryPrice: number,
    leverage: number,
    isLong: boolean,
    maintenanceMarginRatio: number = 0.05
  ): number {
    const leverageRatio = 1 / leverage;

    if (isLong) {
      return entryPrice * (1 - leverageRatio + maintenanceMarginRatio);
    } else {
      return entryPrice * (1 + leverageRatio - maintenanceMarginRatio);
    }
  }

  /**
   * Calculate unrealized PnL
   */
  calculateUnrealizedPnL(position: Position, currentPrice: number): number {
    const priceDiff = currentPrice - position.entryPrice;
    const multiplier = position.isLong ? 1 : -1;

    return (priceDiff * position.size * multiplier) / position.entryPrice;
  }

  /**
   * Check if position should be liquidated
   */
  shouldLiquidate(position: Position, currentPrice: number): boolean {
    if (position.isLong) {
      return currentPrice <= position.liquidationPrice;
    } else {
      return currentPrice >= position.liquidationPrice;
    }
  }

  /**
   * Get account balance for USDC
   */
  async getUSDCBalance(address: string): Promise<number> {
    try {
      const accountInfo = await algorandClient.getAccountInfo(address);
      const usdcAsset = accountInfo.assets?.find(
        (asset: any) => asset['asset-id'] === ASSET_IDS.USDC
      );

      return Number(usdcAsset?.amount || 0);
    } catch (error) {
      throw new Error(`Failed to get USDC balance: ${error}`);
    }
  }

  // Helper methods

  private extractPositionIdFromLogs(_txnResult: any): number {
    // In a real implementation, you'd parse the transaction logs
    // For now, return a mock position ID
    return Math.floor(Math.random() * 1000000);
  }

  private extractPnLFromLogs(_txnResult: any): number {
    // In a real implementation, you'd parse the transaction logs
    // For now, return a mock PnL
    return Math.floor(Math.random() * 20000000) - 10000000; // Random PnL between -$10 and +$10
  }
}

// Export singleton instance
export const perpDEXService = PerpetualDEXService.getInstance();