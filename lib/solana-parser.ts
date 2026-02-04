/**
 * Solana Transaction Parser
 * Converts Solscan API responses to CoinLedger format
 */

import { format } from 'date-fns';
import {
    SolscanTokenTransfer,
    SolscanTransaction,
    NormalizedTransaction,
    CoinLedgerRow,
    CoinLedgerType,
    TokenMetadata,
} from './types';

const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Detect the DEX platform from program IDs
 */
export function detectPlatform(instructions: any[]): string {
    const programIds = instructions.map((ix) => ix.programId || '');

    // Known Solana DEX program IDs
    const platformMap: Record<string, string> = {
        '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium',
        '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP': 'Orca',
        'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter',
        'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'Orca Whirlpool',
        'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo': 'Solend',
    };

    for (const programId of programIds) {
        if (platformMap[programId]) {
            return platformMap[programId];
        }
    }

    return 'Unknown DEX';
}

/**
 * Parse token transfer into normalized transaction
 */
export function parseTokenTransfer(
    transfer: SolscanTokenTransfer,
    userWallet: string
): Partial<NormalizedTransaction> {
    const isReceived = transfer.to_address === userWallet;
    const isSent = transfer.from_address === userWallet;

    // Calculate actual amount considering decimals
    const amount = parseFloat(transfer.amount) / Math.pow(10, transfer.token_decimals);

    const base: Partial<NormalizedTransaction> = {
        txHash: transfer.trans_id,
        timestamp: new Date(transfer.time * 1000),
        platform: 'Solana',
    };

    if (isReceived && !isSent) {
        // Pure receive (airdrop, deposit, etc.)
        return {
            ...base,
            assetReceived: transfer.token_symbol,
            amountReceived: amount,
            type: 'Income', // Will be refined by AI
            description: `Received ${amount} ${transfer.token_symbol}`,
        };
    } else if (isSent && !isReceived) {
        // Pure send (withdrawal, gift, etc.)
        return {
            ...base,
            assetSent: transfer.token_symbol,
            amountSent: amount,
            type: 'Withdrawal',
            description: `Sent ${amount} ${transfer.token_symbol}`,
        };
    } else {
        // Self-transfer or complex transaction
        return {
            ...base,
            assetSent: transfer.token_symbol,
            amountSent: amount,
            assetReceived: transfer.token_symbol,
            amountReceived: amount,
            type: 'Deposit',
            description: `Self-transfer ${amount} ${transfer.token_symbol}`,
        };
    }
}

/**
 * Parse swap instruction from Solscan transaction
 * Handles Raydium, Orca, Jupiter swaps
 */
export function parseSwapInstruction(
    tx: SolscanTransaction,
    userWallet: string
): Partial<NormalizedTransaction> {
    // Extract token balance changes
    const balanceChanges = tx.tokenBalanes || [];

    if (balanceChanges.length < 2) {
        // Not a swap, return basic info
        return {
            txHash: tx.txHash,
            timestamp: new Date(tx.blockTime * 1000),
            feeCurrency: 'SOL',
            feeAmount: tx.fee / LAMPORTS_PER_SOL,
            platform: detectPlatform(tx.parsedInstruction),
        };
    }

    // Find sent and received tokens
    let sent: any = null;
    let received: any = null;

    for (const change of balanceChanges) {
        const amount = parseFloat(change.amount || '0');

        if (amount < 0) {
            // Negative = sent
            sent = {
                symbol: change.symbol || 'UNKNOWN',
                amount: Math.abs(amount),
                decimals: change.decimals || 0,
            };
        } else if (amount > 0) {
            // Positive = received
            received = {
                symbol: change.symbol || 'UNKNOWN',
                amount: amount,
                decimals: change.decimals || 0,
            };
        }
    }

    return {
        txHash: tx.txHash,
        timestamp: new Date(tx.blockTime * 1000),
        assetSent: sent?.symbol,
        amountSent: sent ? sent.amount / Math.pow(10, sent.decimals) : undefined,
        assetReceived: received?.symbol,
        amountReceived: received ? received.amount / Math.pow(10, received.decimals) : undefined,
        feeCurrency: 'SOL',
        feeAmount: tx.fee / LAMPORTS_PER_SOL,
        platform: detectPlatform(tx.parsedInstruction),
        type: 'Trade',
        description: sent && received
            ? `Swapped ${sent.amount / Math.pow(10, sent.decimals)} ${sent.symbol} for ${received.amount / Math.pow(10, received.decimals)} ${received.symbol}`
            : 'Swap transaction',
    };
}

/**
 * Convert normalized transaction to CoinLedger CSV row
 */
export function toCoinLedgerRow(tx: NormalizedTransaction): CoinLedgerRow {
    return {
        'Date (UTC)': format(tx.timestamp, 'MM/dd/yyyy HH:mm:ss'),
        'Platform': tx.platform || '',
        'Asset Sent': tx.assetSent || '',
        'Amount Sent': tx.amountSent?.toString() || '',
        'Asset Received': tx.assetReceived || '',
        'Amount Received': tx.amountReceived?.toString() || '',
        'Fee Currency': tx.feeCurrency || '',
        'Fee Amount': tx.feeAmount?.toString() || '',
        'Type': tx.type,
        'Description': tx.description,
        'TxHash': tx.txHash,
    };
}

/**
 * Determine transaction type based on context
 */
export function classifyTransactionType(
    tx: Partial<NormalizedTransaction>
): CoinLedgerType {
    const hasSent = !!tx.assetSent && (tx.amountSent || 0) > 0;
    const hasReceived = !!tx.assetReceived && (tx.amountReceived || 0) > 0;

    if (hasSent && hasReceived) {
        // Both sent and received = Trade
        return 'Trade';
    } else if (hasReceived && !hasSent) {
        // Only received = Income (will be refined by AI to Airdrop/Staking/etc)
        return 'Income';
    } else if (hasSent && !hasReceived) {
        // Only sent = Withdrawal
        return 'Withdrawal';
    }

    return 'Trade'; // Default fallback
}

/**
 * Generate human-readable description
 */
export function generateDescription(tx: Partial<NormalizedTransaction>): string {
    if (tx.assetSent && tx.assetReceived) {
        return `Swapped ${tx.amountSent} ${tx.assetSent} for ${tx.amountReceived} ${tx.assetReceived} via ${tx.platform}`;
    } else if (tx.assetReceived) {
        return `Received ${tx.amountReceived} ${tx.assetReceived}`;
    } else if (tx.assetSent) {
        return `Sent ${tx.amountSent} ${tx.assetSent}`;
    }

    return 'Transaction';
}
