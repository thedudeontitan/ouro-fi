/**
 * Algorand wallet integration and connection management
 */

import algosdk from 'algosdk';
import { algorandClient } from './client';

export interface WalletAccount {
  address: string;
  name?: string;
  balance: number;
  assets: Array<{
    assetId: number;
    balance: number;
    decimals: number;
  }>;
}

export interface WalletProvider {
  id: string;
  name: string;
  icon: string;
  connect(): Promise<string[]>;
  disconnect(): Promise<void>;
  signTxn(txn: algosdk.Transaction): Promise<Uint8Array>;
  signTxnGroup(txnGroup: algosdk.Transaction[]): Promise<Uint8Array[]>;
}

// MyAlgo Connect Wallet Provider
export class MyAlgoWalletProvider implements WalletProvider {
  id = 'myalgo';
  name = 'MyAlgo';
  icon = '/myalgo-icon.svg';

  private myAlgoConnect: any = null;

  constructor() {
    // Dynamically import MyAlgo Connect
    this.initMyAlgo();
  }

  private async initMyAlgo() {
    try {
      const MyAlgoConnect = (await import('@randlabs/myalgo-connect')).default;
      this.myAlgoConnect = new MyAlgoConnect();
    } catch (error) {
      console.error('Failed to initialize MyAlgo Connect:', error);
      throw new Error('MyAlgo Connect not available');
    }
  }

  async connect(): Promise<string[]> {
    if (!this.myAlgoConnect) {
      await this.initMyAlgo();
    }

    if (!this.myAlgoConnect) {
      throw new Error('MyAlgo Connect not available');
    }

    try {
      const accounts = await this.myAlgoConnect.connect();
      return accounts.map((acc: any) => acc.address);
    } catch (error) {
      throw new Error(`Failed to connect MyAlgo: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    // MyAlgo doesn't have explicit disconnect
    this.myAlgoConnect = null;
  }

  async signTxn(txn: algosdk.Transaction): Promise<Uint8Array> {
    if (!this.myAlgoConnect) {
      throw new Error('Wallet not connected');
    }

    const signedTxn = await this.myAlgoConnect.signTransaction(txn.toByte());
    return new Uint8Array(signedTxn.blob);
  }

  async signTxnGroup(txnGroup: algosdk.Transaction[]): Promise<Uint8Array[]> {
    if (!this.myAlgoConnect) {
      throw new Error('Wallet not connected');
    }

    const signedTxnGroup = await this.myAlgoConnect.signTransaction(
      txnGroup.map(txn => txn.toByte())
    );

    return signedTxnGroup.map((signed: any) => new Uint8Array(signed.blob));
  }
}

// PeraConnect Wallet Provider
export class PeraWalletProvider implements WalletProvider {
  id = 'pera';
  name = 'Pera Wallet';
  icon = '/pera-icon.svg';

  private peraWallet: any = null;

  constructor() {
    this.initPera();
  }

  private async initPera() {
    try {
      const { PeraWalletConnect } = await import('@perawallet/connect');
      this.peraWallet = new PeraWalletConnect();
    } catch (error) {
      console.error('Failed to initialize Pera Wallet:', error);
      throw new Error('Pera Wallet not available');
    }
  }

  async connect(): Promise<string[]> {
    if (!this.peraWallet) {
      await this.initPera();
    }

    if (!this.peraWallet) {
      throw new Error('Pera Wallet not available');
    }

    try {
      const accounts = await this.peraWallet.connect();
      return accounts;
    } catch (error) {
      throw new Error(`Failed to connect Pera Wallet: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.peraWallet) {
      this.peraWallet.disconnect();
    }
  }

  async signTxn(txn: algosdk.Transaction): Promise<Uint8Array> {
    if (!this.peraWallet) {
      throw new Error('Wallet not connected');
    }

    const signedTxn = await this.peraWallet.signTransaction([
      { txn, signers: [txn.sender.toString()] }
    ]);

    return new Uint8Array(signedTxn[0]);
  }

  async signTxnGroup(txnGroup: algosdk.Transaction[]): Promise<Uint8Array[]> {
    if (!this.peraWallet) {
      throw new Error('Wallet not connected');
    }

    const txnGroupFormatted = txnGroup.map(txn => ({
      txn,
      signers: [txn.sender.toString()]
    }));

    const signedTxnGroup = await this.peraWallet.signTransaction(txnGroupFormatted);
    return signedTxnGroup.map((signed: any) => new Uint8Array(signed));
  }
}

// Defly Wallet Provider
export class DeflyWalletProvider implements WalletProvider {
  id = 'defly';
  name = 'Defly Wallet';
  icon = '/defly-icon.svg';

  private deflyWallet: any = null;

  constructor() {
    this.initDefly();
  }

  private async initDefly() {
    try {
      const { DeflyWalletConnect } = await import('@blockshake/defly-connect');
      this.deflyWallet = new DeflyWalletConnect();
    } catch (error) {
      console.error('Failed to initialize Defly Wallet:', error);
      throw new Error('Defly Wallet not available');
    }
  }

  async connect(): Promise<string[]> {
    if (!this.deflyWallet) {
      await this.initDefly();
    }

    if (!this.deflyWallet) {
      throw new Error('Defly Wallet not available');
    }

    try {
      const accounts = await this.deflyWallet.connect();
      return accounts;
    } catch (error) {
      throw new Error(`Failed to connect Defly Wallet: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.deflyWallet) {
      this.deflyWallet.disconnect();
    }
  }

  async signTxn(txn: algosdk.Transaction): Promise<Uint8Array> {
    if (!this.deflyWallet) {
      throw new Error('Wallet not connected');
    }

    const signedTxn = await this.deflyWallet.signTransaction([
      { txn, signers: [txn.sender.toString()] }
    ]);

    return new Uint8Array(signedTxn[0]);
  }

  async signTxnGroup(txnGroup: algosdk.Transaction[]): Promise<Uint8Array[]> {
    if (!this.deflyWallet) {
      throw new Error('Wallet not connected');
    }

    const txnGroupFormatted = txnGroup.map(txn => ({
      txn,
      signers: [txn.sender.toString()]
    }));

    const signedTxnGroup = await this.deflyWallet.signTransaction(txnGroupFormatted);
    return signedTxnGroup.map((signed: any) => new Uint8Array(signed));
  }
}

// Wallet Manager Class
export class WalletManager {
  private static instance: WalletManager;
  private providers: Map<string, WalletProvider> = new Map();
  private connectedProvider: WalletProvider | null = null;
  private connectedAccounts: string[] = [];

  private constructor() {
    this.initializeProviders();
  }

  public static getInstance(): WalletManager {
    if (!WalletManager.instance) {
      WalletManager.instance = new WalletManager();
    }
    return WalletManager.instance;
  }

  private initializeProviders() {
    const providers = [
      new MyAlgoWalletProvider(),
      new PeraWalletProvider(),
      new DeflyWalletProvider(),
    ];

    providers.forEach(provider => {
      this.providers.set(provider.id, provider);
    });
  }

  getAvailableProviders(): WalletProvider[] {
    return Array.from(this.providers.values());
  }

  async connect(providerId: string): Promise<string[]> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    try {
      const accounts = await provider.connect();
      this.connectedProvider = provider;
      this.connectedAccounts = accounts;

      return accounts;
    } catch (error) {
      throw new Error(`Failed to connect ${provider.name}: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.connectedProvider) {
      await this.connectedProvider.disconnect();
      this.connectedProvider = null;
      this.connectedAccounts = [];
    }
  }

  getConnectedAccounts(): string[] {
    return this.connectedAccounts;
  }

  getConnectedProvider(): WalletProvider | null {
    return this.connectedProvider;
  }

  isConnected(): boolean {
    return this.connectedProvider !== null && this.connectedAccounts.length > 0;
  }

  async getAccountInfo(address: string): Promise<WalletAccount> {
    const accountInfo = await algorandClient.getAccountInfo(address);

    const balance = accountInfo.amount;
    const assets = accountInfo.assets?.map((asset: any) => ({
      assetId: asset['asset-id'],
      balance: asset.amount,
      decimals: asset.decimals || 0,
    })) || [];

    return {
      address,
      name: address,
      balance: Number(balance),
      assets,
    };
  }

  async signTransaction(txn: algosdk.Transaction): Promise<Uint8Array> {
    if (!this.connectedProvider) {
      throw new Error('No wallet connected');
    }

    return await this.connectedProvider.signTxn(txn);
  }

  async signTransactionGroup(txnGroup: algosdk.Transaction[]): Promise<Uint8Array[]> {
    if (!this.connectedProvider) {
      throw new Error('No wallet connected');
    }

    return await this.connectedProvider.signTxnGroup(txnGroup);
  }
}

// Export singleton instance
export const walletManager = WalletManager.getInstance();