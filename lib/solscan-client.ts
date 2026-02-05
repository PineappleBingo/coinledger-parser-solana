/**
 * Helius RPC Client
 * Fetches transaction data using Helius RPC API
 * Free Tier: 1M credits/month, 10 req/sec
 * Documentation: https://docs.helius.dev/
 */

import axios from 'axios';
import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { SolscanTokenTransfer, SolscanTransaction } from './types';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '';
const HELIUS_RPC_URL = process.env.HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com';
const RATE_LIMIT_SECONDS = parseInt(process.env.SOLSCAN_RATE_LIMIT_SECONDS || '60', 10);

// Rate limiter state
let lastRequestTime = 0;
let requestCount = 0;

/**
 * Rate limiter
 */
async function enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    const requiredDelay = RATE_LIMIT_SECONDS * 1000;

    if (lastRequestTime > 0 && timeSinceLastRequest < requiredDelay) {
        const waitTime = requiredDelay - timeSinceLastRequest;
        console.log(`⏳ Rate limit: Waiting ${Math.ceil(waitTime / 1000)}s before next API call...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    lastRequestTime = Date.now();
    requestCount++;
    console.log(`📡 Helius API Request #${requestCount}`);
}

/**
 * Create Helius RPC connection
 */
function createHeliusConnection(): Connection {
    if (!HELIUS_API_KEY) {
        throw new Error('HELIUS_API_KEY not configured in .env file. Get one free at https://www.helius.dev/');
    }

    const rpcUrl = `${HELIUS_RPC_URL}/?api-key=${HELIUS_API_KEY}`;
    return new Connection(rpcUrl, 'confirmed');
}

/**
 * Fetch token transfers using Helius RPC
 */
export async function fetchTokenTransfers(
    walletAddress: string,
    startTime?: number,
    endTime?: number,
    limit: number = 100
): Promise<SolscanTokenTransfer[]> {
    // Check test mode
    const isTestMode = process.env.TEST_MODE === 'true';
    const testLimit = parseInt(process.env.TEST_TRANSACTION_LIMIT || '10', 10);

    if (isTestMode && limit > testLimit) {
        console.log(`🧪 TEST MODE ENABLED: Limiting transactions to ${testLimit}`);
        limit = testLimit;
    }

    const connection = createHeliusConnection();
    const publicKey = new PublicKey(walletAddress);
    const allTransfers: SolscanTokenTransfer[] = [];

    try {
        console.log(`Fetching signatures for ${walletAddress}...`);

        // Enforce rate limit
        await enforceRateLimit();

        // Get transaction signatures
        const signatures = await connection.getSignaturesForAddress(publicKey, {
            limit,
        });

        console.log(`Found ${signatures.length} signatures`);

        // Fetch and parse each transaction
        for (let i = 0; i < Math.min(signatures.length, limit); i++) {
            const sig = signatures[i];

            // Enforce rate limit for each transaction fetch
            if (i > 0 && i % 5 === 0) {
                await enforceRateLimit();
            }

            console.log(`Fetching transaction ${i + 1}/${Math.min(signatures.length, limit)}...`);

            try {
                const tx = await connection.getParsedTransaction(sig.signature, {
                    maxSupportedTransactionVersion: 0,
                });

                if (!tx || !tx.meta) {
                    continue;
                }

                // Extract token transfers from parsed transaction
                const tokenTransfers = extractTokenTransfers(tx, walletAddress, sig.signature);
                allTransfers.push(...tokenTransfers);

                console.log(`✓ Processed transaction (${allTransfers.length} transfers so far)`);

                if (allTransfers.length >= limit) {
                    break;
                }
            } catch (error: any) {
                console.error(`Failed to fetch transaction ${sig.signature}:`, error.message);
                continue;
            }
        }

        const finalTransfers = allTransfers.slice(0, limit);
        console.log(`\n📊 Total token transfers extracted: ${finalTransfers.length}`);

        if (isTestMode) {
            console.log(`\n⚠️  TEST MODE: Review these ${finalTransfers.length} transactions before proceeding.`);
        }

        return finalTransfers;
    } catch (error: any) {
        console.error('Helius API error:', error.message);

        if (error.message?.includes('HELIUS_API_KEY')) {
            throw error;
        }

        throw new Error(`Failed to fetch token transfers: ${error.message}`);
    }
}

/**
 * Extract token transfers from parsed transaction
 * Extracts from both balance changes AND parsed instructions
 */
function extractTokenTransfers(
    tx: ParsedTransactionWithMeta,
    walletAddress: string,
    signature: string
): SolscanTokenTransfer[] {
    const transfers: SolscanTokenTransfer[] = [];

    if (!tx.meta || !tx.transaction) {
        return transfers;
    }

    const blockTime = tx.blockTime || Math.floor(Date.now() / 1000);

    // Method 1: Extract from parsed instructions (most reliable)
    const instructions = tx.transaction.message.instructions;

    for (const instruction of instructions) {
        if ('parsed' in instruction && instruction.parsed) {
            const parsed = instruction.parsed;

            // Check for SPL Token Transfer
            if (parsed.type === 'transfer' && parsed.info) {
                const info = parsed.info;

                // Check if wallet is involved
                const isSource = info.source === walletAddress || info.authority === walletAddress;
                const isDestination = info.destination === walletAddress;

                if (isSource || isDestination) {
                    transfers.push({
                        trans_id: signature,
                        time: blockTime,
                        from_address: info.authority || info.source || '',
                        to_address: info.destination || '',
                        token_address: info.mint || '',
                        token_symbol: 'UNKNOWN', // Will be resolved later
                        token_decimals: 9, // Default, will be updated by metadata
                        amount: parseFloat(info.amount || info.tokenAmount?.uiAmount || 0),
                        flow: isSource ? 'out' : 'in',
                    });
                }
            }

            // Check for SPL Token TransferChecked (includes decimals)
            if (parsed.type === 'transferChecked' && parsed.info) {
                const info = parsed.info;

                const isSource = info.source === walletAddress || info.authority === walletAddress;
                const isDestination = info.destination === walletAddress;

                if (isSource || isDestination) {
                    const decimals = info.decimals || 9;
                    const amount = parseFloat(info.tokenAmount?.uiAmount || info.amount || 0);

                    transfers.push({
                        trans_id: signature,
                        time: blockTime,
                        from_address: info.authority || info.source || '',
                        to_address: info.destination || '',
                        token_address: info.mint || '',
                        token_symbol: 'UNKNOWN',
                        token_decimals: decimals,
                        amount: amount,
                        flow: isSource ? 'out' : 'in',
                    });
                }
            }
        }
    }

    // Method 2: Extract from token balance changes (backup)
    if (transfers.length === 0) {
        const preBalances = tx.meta.preTokenBalances || [];
        const postBalances = tx.meta.postTokenBalances || [];

        for (const postBalance of postBalances) {
            const preBalance = preBalances.find(
                (pre) => pre.accountIndex === postBalance.accountIndex
            );

            if (!preBalance || !postBalance.uiTokenAmount || !preBalance.uiTokenAmount) {
                continue;
            }

            const preAmount = preBalance.uiTokenAmount.uiAmount || 0;
            const postAmount = postBalance.uiTokenAmount.uiAmount || 0;
            const changeAmount = postAmount - preAmount;

            if (changeAmount === 0) {
                continue;
            }

            // Determine if wallet is involved
            const accountKey = tx.transaction.message.accountKeys[postBalance.accountIndex];
            const owner = postBalance.owner || accountKey?.pubkey.toString() || '';
            const isOutgoing = owner === walletAddress && changeAmount < 0;
            const isIncoming = owner === walletAddress && changeAmount > 0;

            if (!isOutgoing && !isIncoming) {
                continue;
            }

            transfers.push({
                trans_id: signature,
                time: blockTime.toString(),
                from_address: isOutgoing ? walletAddress : '',
                to_address: isIncoming ? walletAddress : '',
                token_address: postBalance.mint,
                token_symbol: 'UNKNOWN',
                token_decimals: postBalance.uiTokenAmount.decimals,
                amount: Math.abs(changeAmount),
                flow: isOutgoing ? 'out' : 'in',
            });
        }
    }

    return transfers;
}

/**
 * Fetch account transactions (not needed for token transfers, but kept for compatibility)
 */
export async function fetchAccountTransactions(
    walletAddress: string,
    startTime?: number,
    endTime?: number,
    limit: number = 100
): Promise<SolscanTransaction[]> {
    // For now, we'll use the same method as fetchTokenTransfers
    // This can be expanded if needed
    const transfers = await fetchTokenTransfers(walletAddress, startTime, endTime, limit);

    // Convert transfers to transaction format (simplified)
    return transfers.map((transfer) => ({
        txHash: transfer.trans_id,
        blockTime: transfer.time,
        slot: 0,
        fee: 5000, // Default Solana fee
        status: 'Success',
        lamport: 0,
        signer: [transfer.from_address || transfer.to_address],
        parsedInstruction: [],
    } as any));
}

/**
 * Fetch token metadata (using Helius DAS API)
 */
export async function fetchTokenMetadata(
    tokenAddress: string
): Promise<{
    symbol: string;
    name: string;
    decimals: number;
    address: string;
}> {
    try {
        await enforceRateLimit();

        const response = await axios.post(
            `${HELIUS_RPC_URL}/?api-key=${HELIUS_API_KEY}`,
            {
                jsonrpc: '2.0',
                id: 'token-metadata',
                method: 'getAsset',
                params: {
                    id: tokenAddress,
                },
            }
        );

        const data = response.data?.result;

        return {
            symbol: data?.content?.metadata?.symbol || 'UNKNOWN',
            name: data?.content?.metadata?.name || 'Unknown Token',
            decimals: data?.token_info?.decimals || 9,
            address: tokenAddress,
        };
    } catch (error: any) {
        console.error(`Failed to fetch token metadata for ${tokenAddress}:`, error.message);

        return {
            symbol: 'UNKNOWN',
            name: 'Unknown Token',
            decimals: 9,
            address: tokenAddress,
        };
    }
}

/**
 * Retry wrapper for API calls
 */
export async function fetchWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            if (attempt === maxRetries - 1) {
                throw error;
            }

            const delay = baseDelay * Math.pow(2, attempt);
            console.warn(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw new Error('Max retries exceeded');
}

/**
 * Reset rate limiter
 */
export function resetRateLimiter(): void {
    lastRequestTime = 0;
    requestCount = 0;
    console.log('Rate limiter reset');
}
