/**
 * Real Algorand transaction creation and submission utilities
 * Follows official Algorand SDK best practices for React TypeScript apps
 */

import algosdk from 'algosdk';
import { getNetworkConfig } from './modern-wallet';

// Transaction interfaces
export interface TransactionParams {
  from: string;
  to: string;
  amount: number;
  note?: string;
}

export interface ApplicationCallParams {
  from: string;
  appIndex: number;
  appArgs?: Uint8Array[];
  accounts?: string[];
  foreignApps?: number[];
  foreignAssets?: number[];
  note?: string;
}

export interface TransactionResult {
  txId: string;
  confirmation?: any;
}

export interface TransactionStatus {
  status: 'idle' | 'building' | 'signing' | 'submitting' | 'confirming' | 'success' | 'error';
  txId?: string;
  error?: string;
  confirmation?: any;
}

/**
 * Create a properly configured Algorand client for testnet
 */
export function createAlgodClient(): algosdk.Algodv2 {
  const config = getNetworkConfig();
  return new algosdk.Algodv2('', config.algodServer, '');
}

/**
 * Validate an Algorand address
 */
export function isValidAddress(address: string): boolean {
  try {
    algosdk.decodeAddress(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert microAlgos to Algos for display
 */
export function microAlgosToAlgos(microAlgos: number): number {
  return microAlgos / 1_000_000;
}

/**
 * Convert Algos to microAlgos for transactions
 */
export function algosToMicroAlgos(algos: number): number {
  return Math.floor(algos * 1_000_000);
}

/**
 * Create a payment transaction with proper parameters
 */
export async function createPaymentTransaction(
  params: TransactionParams
): Promise<algosdk.Transaction> {
  const algodClient = createAlgodClient();

  // Get suggested transaction parameters from the network
  const suggestedParams = await algodClient.getTransactionParams().do();

  console.log('📋 Creating payment transaction with params:', {
    from: params.from,
    to: params.to,
    amount: params.amount,
    fee: suggestedParams.fee,
    firstRound: suggestedParams.firstValid,
    lastRound: suggestedParams.lastValid
  });

  // Create the payment transaction
  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: params.from,
    receiver: params.to,
    amount: params.amount,
    suggestedParams,
    note: params.note ? new TextEncoder().encode(params.note) : undefined
  });

  return txn;
}

/**
 * Create an application call transaction for smart contracts
 */
export async function createApplicationCallTransaction(
  params: ApplicationCallParams
): Promise<algosdk.Transaction> {
  const algodClient = createAlgodClient();

  // Get suggested transaction parameters
  const suggestedParams = await algodClient.getTransactionParams().do();

  console.log('📋 Creating application call transaction:', {
    from: params.from,
    appIndex: params.appIndex,
    appArgs: params.appArgs?.length || 0,
    accounts: params.accounts?.length || 0,
    foreignApps: params.foreignApps?.length || 0,
    foreignAssets: params.foreignAssets?.length || 0
  });

  // Create the application call transaction
  const txn = algosdk.makeApplicationCallTxnFromObject({
    sender: params.from,
    suggestedParams,
    appIndex: params.appIndex,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    appArgs: params.appArgs,
    accounts: params.accounts,
    foreignApps: params.foreignApps,
    foreignAssets: params.foreignAssets,
    note: params.note ? new TextEncoder().encode(params.note) : undefined
  });

  return txn;
}

/**
 * Create a transaction group (atomic transactions)
 */
export function createTransactionGroup(transactions: algosdk.Transaction[]): algosdk.Transaction[] {
  if (transactions.length === 0) {
    throw new Error('Transaction group cannot be empty');
  }

  // Assign group ID to link transactions atomically
  algosdk.assignGroupID(transactions);

  console.log('🔗 Created transaction group with', transactions.length, 'transactions');

  return transactions;
}

/**
 * Sign a transaction using the modern wallet integration
 * This uses the @txnlab/use-wallet-react wallet signing
 */
export async function signTransaction(
  transaction: algosdk.Transaction,
  signer: any // The signer from useWallet hook
): Promise<Uint8Array> {
  if (!signer) {
    throw new Error('No signer available - wallet not connected');
  }

  try {
    console.log('✍️ Signing transaction with wallet...');

    // Encode the unsigned transaction
    const unsignedTxn = algosdk.encodeUnsignedTransaction(transaction);

    // Sign with the wallet
    const signedTxns = await signer([unsignedTxn]);

    if (!signedTxns || signedTxns.length === 0) {
      throw new Error('Transaction signing failed - no signed transactions returned');
    }

    console.log('✅ Transaction signed successfully');
    return signedTxns[0];

  } catch (error) {
    console.error('❌ Transaction signing failed:', error);
    throw error;
  }
}

/**
 * Sign multiple transactions (for transaction groups)
 */
export async function signTransactionGroup(
  transactions: algosdk.Transaction[],
  signer: any
): Promise<Uint8Array[]> {
  if (!signer) {
    throw new Error('No signer available - wallet not connected');
  }

  try {
    console.log('✍️ Signing transaction group with', transactions.length, 'transactions...');

    // Encode all unsigned transactions
    const unsignedTxns = transactions.map(txn => algosdk.encodeUnsignedTransaction(txn));

    // Sign with the wallet
    const signedTxns = await signer(unsignedTxns);

    if (!signedTxns || signedTxns.length !== transactions.length) {
      throw new Error('Transaction group signing failed - invalid signed transactions');
    }

    console.log('✅ Transaction group signed successfully');
    return signedTxns;

  } catch (error) {
    console.error('❌ Transaction group signing failed:', error);
    throw error;
  }
}

/**
 * Submit a signed transaction to the network
 */
export async function submitTransaction(signedTxn: Uint8Array): Promise<string> {
  const algodClient = createAlgodClient();

  try {
    console.log('📡 Submitting transaction to Algorand network...');

    // Submit the signed transaction
    const response = await algodClient.sendRawTransaction(signedTxn).do();
    const txId = response.txid;

    console.log('✅ Transaction submitted successfully, TxID:', txId);
    return txId;

  } catch (error) {
    console.error('❌ Transaction submission failed:', error);
    throw error;
  }
}

/**
 * Submit multiple transactions (transaction group)
 */
export async function submitTransactionGroup(signedTxns: Uint8Array[]): Promise<string> {
  const algodClient = createAlgodClient();

  try {
    console.log('📡 Submitting transaction group to network...');

    // Submit all signed transactions
    const response = await algodClient.sendRawTransaction(signedTxns).do();
    const txId = response.txid;

    console.log('✅ Transaction group submitted successfully, TxID:', txId);
    return txId;

  } catch (error) {
    console.error('❌ Transaction group submission failed:', error);
    throw error;
  }
}

/**
 * Wait for transaction confirmation
 */
export async function waitForConfirmation(
  txId: string,
  maxRounds: number = 4
): Promise<any> {
  const algodClient = createAlgodClient();

  try {
    console.log('⏳ Waiting for transaction confirmation...', txId);

    const confirmation = await algosdk.waitForConfirmation(algodClient, txId, maxRounds);

    console.log('✅ Transaction confirmed in round', confirmation.confirmedRound);
    return confirmation;

  } catch (error) {
    console.error('❌ Transaction confirmation timeout or failed:', error);
    throw error;
  }
}

/**
 * Complete transaction flow: create, sign, submit, and wait for confirmation
 */
export async function executePaymentTransaction(
  params: TransactionParams,
  signer: any
): Promise<TransactionResult> {
  try {
    // 1. Create the transaction
    const transaction = await createPaymentTransaction(params);

    // 2. Sign the transaction
    const signedTxn = await signTransaction(transaction, signer);

    // 3. Submit to network
    const txId = await submitTransaction(signedTxn);

    // 4. Wait for confirmation
    const confirmation = await waitForConfirmation(txId);

    return { txId, confirmation };

  } catch (error) {
    console.error('❌ Payment transaction failed:', error);
    throw error;
  }
}

/**
 * Complete application call transaction flow
 */
export async function executeApplicationCall(
  params: ApplicationCallParams,
  signer: any
): Promise<TransactionResult> {
  try {
    // 1. Create the transaction
    const transaction = await createApplicationCallTransaction(params);

    // 2. Sign the transaction
    const signedTxn = await signTransaction(transaction, signer);

    // 3. Submit to network
    const txId = await submitTransaction(signedTxn);

    // 4. Wait for confirmation
    const confirmation = await waitForConfirmation(txId);

    return { txId, confirmation };

  } catch (error) {
    console.error('❌ Application call transaction failed:', error);
    throw error;
  }
}

/**
 * Execute a transaction group atomically
 */
export async function executeTransactionGroup(
  transactions: algosdk.Transaction[],
  signer: any
): Promise<TransactionResult> {
  try {
    // 1. Create transaction group
    const groupedTxns = createTransactionGroup(transactions);

    // 2. Sign all transactions
    const signedTxns = await signTransactionGroup(groupedTxns, signer);

    // 3. Submit transaction group
    const txId = await submitTransactionGroup(signedTxns);

    // 4. Wait for confirmation
    const confirmation = await waitForConfirmation(txId);

    return { txId, confirmation };

  } catch (error) {
    console.error('❌ Transaction group execution failed:', error);
    throw error;
  }
}

/**
 * Get account information from the network
 */
export async function getAccountInfo(address: string): Promise<any> {
  if (!isValidAddress(address)) {
    throw new Error('Invalid Algorand address');
  }

  const algodClient = createAlgodClient();

  try {
    const accountInfo = await algodClient.accountInformation(address).do();
    console.log('📊 Retrieved account info for', address);
    return accountInfo;
  } catch (error) {
    console.error('❌ Failed to get account info:', error);
    throw error;
  }
}

/**
 * Get transaction information from the network
 */
export async function getTransactionInfo(txId: string): Promise<any> {
  const algodClient = createAlgodClient();

  try {
    const txnInfo = await algodClient.pendingTransactionInformation(txId).do();
    console.log('📄 Retrieved transaction info for', txId);
    return txnInfo;
  } catch (error) {
    console.error('❌ Failed to get transaction info:', error);
    throw error;
  }
}

/**
 * Generate explorer URL for a transaction
 */
export function getExplorerUrl(txId: string, network: 'testnet' | 'mainnet' = 'testnet'): string {
  const baseUrl = network === 'testnet'
    ? 'https://testnet.algoexplorer.io/tx/'
    : 'https://algoexplorer.io/tx/';

  return `${baseUrl}${txId}`;
}

/**
 * Generate explorer URL for an account
 */
export function getAccountExplorerUrl(address: string, network: 'testnet' | 'mainnet' = 'testnet'): string {
  const baseUrl = network === 'testnet'
    ? 'https://testnet.algoexplorer.io/address/'
    : 'https://algoexplorer.io/address/';

  return `${baseUrl}${address}`;
}