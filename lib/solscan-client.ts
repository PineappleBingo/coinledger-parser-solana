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
        let processedCount = 0;
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

                processedCount++;
                console.log(`✓ Processed transaction ${processedCount} (${allTransfers.length} transfers so far)`);

                // Stop when we've processed enough transactions (not transfers!)
                if (processedCount >= limit) {
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
export function extractTokenTransfers(
    tx: ParsedTransactionWithMeta,
    walletAddress: string,
    signature: string
): SolscanTokenTransfer[] {
    const transfers: SolscanTokenTransfer[] = [];

    if (!tx.meta || !tx.transaction) {
        return transfers;
    }

    // Skip failed transactions - they shouldn't be counted for tax purposes
    if (tx.meta.err) {
        console.log(`\n⚠️ [EXTRACT] TX: ${signature.substring(0, 8)}... - FAILED`);
        console.log(`   Error: ${JSON.stringify(tx.meta.err)}`);
        console.log(`   ❌ SKIPPED - Transaction failed`);
        return transfers;
    }

    const blockTime = tx.blockTime || Math.floor(Date.now() / 1000);

    // 🔍 DEBUG LOGGING
    console.log(`\n🔍 [EXTRACT] TX: ${signature.substring(0, 8)}...`);
    console.log(`   Pre-balances: ${tx.meta?.preTokenBalances?.length || 0}, Post-balances: ${tx.meta?.postTokenBalances?.length || 0}`);

    // Method 1: Extract from token balance changes (MOST RELIABLE FOR SWAPS!)
    // This catches the actual token movements even if wallet isn't directly in the instruction
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

        // Get the owner of this token account
        const owner = postBalance.owner || '';

        // 🔍 DEBUG LOGGING
        const mintShort = (postBalance.mint || 'unknown').substring(0, 8);
        console.log(`   Token: ${mintShort}... Owner: ${owner.substring(0, 8)}... Wallet: ${walletAddress.substring(0, 8)}...`);
        console.log(`   Match: ${owner === walletAddress}, Change: ${changeAmount.toFixed(6)}`);

        // Only include transfers where the wallet owns the token account
        if (owner !== walletAddress) {
            console.log(`   ❌ SKIPPED - Owner mismatch`);
            continue;
        }

        const isOutgoing = changeAmount < 0;
        const isIncoming = changeAmount > 0;

        console.log(`   ✅ ADDED - Flow: ${isOutgoing ? 'OUT' : 'IN'}, Amount: ${Math.abs(changeAmount)}`);

        transfers.push({
            trans_id: signature,
            time: blockTime.toString(),
            from_address: isOutgoing ? walletAddress : '',
            to_address: isIncoming ? walletAddress : '',
            token_address: postBalance.mint || '',
            token_symbol: 'UNKNOWN',
            token_decimals: postBalance.uiTokenAmount.decimals || 9,
            amount: Math.abs(changeAmount), // Store as positive amount
            flow: isOutgoing ? 'out' : 'in',
        });
    }

    console.log(`   📊 Total extracted (SPL): ${transfers.length} transfers`);

    // Method 1b: Extract native SOL changes
    // This is CRITICAL for trades involving SOL (Sell Token -> Buy SOL)
    if (tx.meta?.preBalances && tx.meta.postBalances) {
        const preBalances = tx.meta.preBalances;
        const postBalances = tx.meta.postBalances;
        const accountKeys = tx.transaction.message.accountKeys;

        // Find the wallet's account index
        // In parsed transactions, accountKeys is an array of objects { pubkey, ... }
        const walletIndex = accountKeys.findIndex(key =>
            key.pubkey.toString() === walletAddress
        );

        if (walletIndex !== -1) {
            const preSol = preBalances[walletIndex] || 0;
            const postSol = postBalances[walletIndex] || 0;

            const rawChange = postSol - preSol;
            const LAMPORTS_PER_SOL = 1_000_000_000;
            const feeSol = (tx.meta.fee || 0) / LAMPORTS_PER_SOL;

            // Check if this wallet paid the fee (index 0 is fee payer)
            const isFeePayer = walletIndex === 0;

            // If fee payer, the raw change includes the fee payment (negative)
            // We want to separate the fee from the actual transfer amount
            // Gross Change = Net Change + Fee (if payer)
            let grossAllChange = rawChange / LAMPORTS_PER_SOL;

            if (isFeePayer) {
                grossAllChange += feeSol;

                // Add the Fee as a separate transfer so the parser can detect it
                if (feeSol > 0) {
                    transfers.push({
                        trans_id: signature,
                        time: blockTime.toString(),
                        from_address: walletAddress,
                        to_address: '', // Burn/System
                        token_address: 'So11111111111111111111111111111111111111112',
                        token_symbol: 'SOL',
                        token_decimals: 9,
                        amount: feeSol,
                        flow: 'out',
                    });
                }
            }

            // Now capture the actual transfer amount (excluding fee)
            // Ignore tiny dust (< 0.000001) unless it's significant
            if (Math.abs(grossAllChange) > 0.000001) {
                const isOutgoing = grossAllChange < 0;
                const isIncoming = grossAllChange > 0;

                transfers.push({
                    trans_id: signature,
                    time: blockTime.toString(),
                    from_address: isOutgoing ? walletAddress : '',
                    to_address: isIncoming ? walletAddress : '',
                    token_address: 'So11111111111111111111111111111111111111112',
                    token_symbol: 'SOL',
                    token_decimals: 9,
                    amount: Math.abs(grossAllChange),
                    flow: isOutgoing ? 'out' : 'in',
                });
            }
        }
    }

    // Method 1c: Extract from inner instructions (multi-hop swaps, DEX intermediaries)
    // This catches intermediate steps where your wallet authorized but doesn't own the accounts
    if (tx.meta?.innerInstructions && tx.meta.innerInstructions.length > 0) {
        console.log(`   🔄 Checking ${tx.meta.innerInstructions.length} inner instruction groups...`);

        let innerTransfersFound = 0;
        for (const innerGroup of tx.meta.innerInstructions) {
            for (const instruction of innerGroup.instructions) {
                // Only process parsed instructions
                if (!('parsed' in instruction) || !instruction.parsed) {
                    continue;
                }

                const parsed = instruction.parsed;

                if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
                    const info = parsed.info;

                    // Check if user is involved via authority or destination
                    const authority = info.authority || info.owner || info.source;
                    const isUserSent = authority === walletAddress;
                    const isUserReceived = info.destination === walletAddress;

                    if (isUserSent || isUserReceived) {
                        innerTransfersFound++;

                        // Extract amount
                        let amount = 0;
                        if (info.tokenAmount?.uiAmount) {
                            amount = info.tokenAmount.uiAmount;
                        } else if (info.amount && info.decimals !== undefined) {
                            amount = parseFloat(info.amount) / Math.pow(10, info.decimals);
                        } else if (info.amount) {
                            amount = parseFloat(info.amount) / 1e9; // Default to 9 decimals
                        }

                        const transfer: SolscanTokenTransfer = {
                            trans_id: signature,
                            time: String(blockTime),
                            from_address: isUserSent ? walletAddress : '',
                            to_address: isUserReceived ? walletAddress : '',
                            token_address: info.mint || 'So11111111111111111111111111111111111111112', // Default to SOL if no mint
                            token_symbol: info.mint ? 'UNKNOWN' : 'SOL',
                            token_decimals: info.decimals || 9,
                            amount,
                            flow: isUserSent ? 'out' : 'in',
                        };

                        transfers.push(transfer);
                        console.log(`   ✅ Inner: ${transfer.flow === 'out' ? 'Sent' : 'Received'} ${amount} ${transfer.token_symbol}`);
                    }
                }
            }
        }

        if (innerTransfersFound > 0) {
            console.log(`   📊 Total after inner instructions: ${transfers.length} transfers (+${innerTransfersFound} from inner)`);
        }
    }

    // Method 2: Extract from parsed instructions (backup for cases without balance changes)
    if (transfers.length === 0) {
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
                            time: String(blockTime),
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
                            time: String(blockTime),
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
