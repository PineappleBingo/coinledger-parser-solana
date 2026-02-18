/**
 * Solana Transaction Parser
 * Converts Helius API responses to CoinLedger format
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
const FEE_THRESHOLD = 0.01; // SOL threshold for identifying fees

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
 * Parse grouped token transfers (from same transaction) into a single normalized transaction
 * This is the main parser for Helius API data that properly handles swaps (Trades)
 */
export function parseGroupedTransfers(
    transfers: SolscanTokenTransfer[],
    userWallet: string,
    tokenMetadataMap?: Map<string, TokenMetadata>
): NormalizedTransaction {
    if (transfers.length === 0) {
        throw new Error('Cannot parse empty transfer group');
    }

    // 🔍 DEBUG LOGGING
    console.log(`\n🧩 [PARSE] Group: ${transfers[0].trans_id.substring(0, 8)}... (${transfers.length} transfers)`);

    const firstTransfer = transfers[0];
    const timestamp = typeof firstTransfer.time === 'string' ? parseInt(firstTransfer.time) : firstTransfer.time;

    // Separate transfers by flow
    const outgoing = transfers.filter(t => t.flow === 'out');
    const incoming = transfers.filter(t => t.flow === 'in');

    console.log(`   Outgoing: ${outgoing.length}, Incoming: ${incoming.length}`);
    outgoing.forEach(t => console.log(`     OUT: ${t.token_symbol} ${t.amount}`));
    incoming.forEach(t => console.log(`     IN:  ${t.token_symbol} ${t.amount}`));

    // Identify fee (small SOL outgoing transfer)
    const feeTransfer = outgoing.find(t =>
        (t.token_symbol === 'SOL' || t.token_symbol === 'WSOL') && t.amount < FEE_THRESHOLD
    );

    console.log(`   Fee detected: ${feeTransfer ? `${feeTransfer.amount} SOL` : 'None'}`);

    // Filter out fee from main transfers
    const mainOutgoing = outgoing.filter(t => t !== feeTransfer);
    const mainIncoming = incoming;

    console.log(`   Main OUT: ${mainOutgoing.length}, Main IN: ${mainIncoming.length}`);

    // Determine transaction type
    let type: CoinLedgerType;
    if (mainOutgoing.length > 0 && mainIncoming.length > 0) {
        type = 'Trade'; // Swap: has both sent and received
    } else if (mainIncoming.length > 0) {
        type = 'Income'; // Only incoming (will be refined by AI to Deposit/Airdrop/etc)
    } else if (mainOutgoing.length > 0) {
        type = 'Withdrawal'; // Only outgoing
    } else {
        type = 'Trade'; // Fallback
    }

    // Get sent and received transfers
    const sentTransfer = mainOutgoing[0];
    const receivedTransfer = mainIncoming[0];

    // Get metadata for better token names
    const sentMetadata = sentTransfer ? tokenMetadataMap?.get(sentTransfer.token_address) : undefined;
    const receivedMetadata = receivedTransfer ? tokenMetadataMap?.get(receivedTransfer.token_address) : undefined;

    // Build normalized transaction
    const transaction: NormalizedTransaction = {
        id: firstTransfer.trans_id,
        txHash: firstTransfer.trans_id,
        timestamp: new Date(timestamp * 1000),
        platform: 'Solana',

        // Sent (Sell) info
        assetSent: sentTransfer ? (sentMetadata?.symbol || sentTransfer.token_symbol) : undefined,
        amountSent: sentTransfer?.amount,
        tokenAddress: sentTransfer?.token_address || receivedTransfer?.token_address,

        // Received (Buy) info
        assetReceived: receivedTransfer ? (receivedMetadata?.symbol || receivedTransfer.token_symbol) : undefined,
        amountReceived: receivedTransfer?.amount,

        // Fee info
        feeCurrency: feeTransfer ? 'SOL' : undefined,
        feeAmount: feeTransfer?.amount,

        // Classification
        type,
        description: generateDescriptionFromTransfers(sentTransfer, receivedTransfer, type),

        // Token images
        tokenImageUrl: sentMetadata?.logoURI || receivedMetadata?.logoURI,

        // Spam detection (to be filled by AI)
        isSpam: undefined as unknown as boolean, // undefined = not yet classified; false = manually classified as not-spam
        spamConfidence: 0,
        spamReasons: [],
        aiConfidence: 0.5,
    };

    return transaction;
}

/**
 * Parse token transfer into normalized transaction (legacy single-transfer parser)
 * Keep this for backwards compatibility
 */
export function parseTokenTransfer(
    transfer: SolscanTokenTransfer,
    userWallet: string
): Partial<NormalizedTransaction> {
    const isReceived = transfer.to_address === userWallet;
    const isSent = transfer.from_address === userWallet;

    // Calculate actual amount considering decimals
    const decimals = typeof transfer.token_decimals === 'string' ? parseInt(transfer.token_decimals) : transfer.token_decimals;
    const amountStr = typeof transfer.amount === 'string' ? transfer.amount : String(transfer.amount);
    const amount = parseFloat(amountStr) / Math.pow(10, decimals);

    const timestamp = typeof transfer.time === 'string' ? parseInt(transfer.time) : transfer.time;
    const base: Partial<NormalizedTransaction> = {
        txHash: transfer.trans_id,
        timestamp: new Date(timestamp * 1000),
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
 * Format asset name for export - includes full address for unknown tokens
 */
function formatAssetForExport(asset?: string, tokenAddress?: string): string {
    if (!asset || asset === 'UNKNOWN') {
        if (tokenAddress) {
            return `UNKNOWN (${tokenAddress})`;
        }
        return 'UNKNOWN';
    }
    return asset;
}

/**
 * Convert normalized transaction to CoinLedger CSV row
 */
export function toCoinLedgerRow(tx: NormalizedTransaction): CoinLedgerRow {
    return {
        'Date (UTC)': format(tx.timestamp, 'MM/dd/yyyy HH:mm:ss'),
        'Platform': tx.platform || '',
        'Asset Sent': formatAssetForExport(tx.assetSent, tx.tokenAddress),
        'Amount Sent': tx.amountSent?.toString() || '',
        'Asset Received': formatAssetForExport(tx.assetReceived, tx.tokenAddress),
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
 * Generate human-readable description from transfers
 */
function generateDescriptionFromTransfers(
    sentTransfer?: SolscanTokenTransfer,
    receivedTransfer?: SolscanTokenTransfer,
    type?: CoinLedgerType
): string {
    if (sentTransfer && receivedTransfer) {
        return `Swapped ${sentTransfer.amount} ${sentTransfer.token_symbol} for ${receivedTransfer.amount} ${receivedTransfer.token_symbol}`;
    } else if (receivedTransfer) {
        return `Received ${receivedTransfer.amount} ${receivedTransfer.token_symbol}`;
    } else if (sentTransfer) {
        return `Sent ${sentTransfer.amount} ${sentTransfer.token_symbol}`;
    }
    return 'Transaction';
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
