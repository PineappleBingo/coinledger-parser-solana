/**
 * Type Definitions for Solana Tax Bridge System
 */

export type CoinLedgerType =
    | 'Trade'
    | 'Deposit'
    | 'Withdrawal'
    | 'Income'
    | 'Mining'
    | 'Staking'
    | 'Airdrop'
    | 'Gift Sent'
    | 'Gift Received'
    | 'Merchant Payment';

export interface SolscanTokenTransfer {
    trans_id: string;
    block_id?: number;
    time: string; // Unix timestamp as string
    status?: 'Success' | 'Fail';
    from_address: string;
    to_address: string;
    token_address: string;
    token_decimals: number;
    token_symbol: string;
    amount: number; // Un amount
    flow: 'in' | 'out';
    fee?: number; // in lamports
}

export interface SolscanTransaction {
    txHash: string;
    blockTime: number;
    status: 'Success' | 'Fail';
    fee: number;
    parsedInstruction: Array<{
        type: string;
        programId: string;
        program: string;
        data?: any;
    }>;
    tokenBalanes?: any[];
}

export interface TokenMetadata {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
    coingeckoId?: string;
}

export interface PriceData {
    symbol: string;
    priceUSD: number;
    timestamp: number;
    source: 'jupiter' | 'birdeye' | 'manual';
    confidence: number;
}

export interface NormalizedTransaction {
    id: string;
    timestamp: Date;
    txHash: string;
    platform: string;

    // Trade fields
    assetSent?: string;
    amountSent?: number;
    assetReceived?: string;
    amountReceived?: number;

    // Fee fields
    feeCurrency?: string;
    feeAmount?: number;

    // Classification
    type: CoinLedgerType;
    description: string;

    // Metadata
    priceUSD?: number;
    tokenImageUrl?: string; // Token logo image URL
    isSpam: boolean;
    spamConfidence: number;
    spamReasons: string[];
    aiConfidence: number;
}

export interface CoinLedgerRow {
    'Date (UTC)': string;
    'Platform': string;
    'Asset Sent': string;
    'Amount Sent': string;
    'Asset Received': string;
    'Amount Received': string;
    'Fee Currency': string;
    'Fee Amount': string;
    'Type': CoinLedgerType;
    'Description': string;
    'TxHash': string;
}

export interface SpamDetectionResult {
    isSpam: boolean;
    confidence: number;
    reasons: string[];
}

export interface TransactionSummary {
    total: number;
    filtered: number;
    missingPrices: number;
    dateRange: {
        start: string;
        end: string;
    };
}
