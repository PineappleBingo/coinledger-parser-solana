/**
 * Solscan API Client
 * Fetches transaction data from Solscan API v2.0
 * Rate Limit: 1 request per 60 seconds
 */

import axios, { AxiosInstance } from 'axios';
import { SolscanTokenTransfer, SolscanTransaction } from './types';

const SOLSCAN_API_BASE = 'https://pro-api.solscan.io/v2.0';
const SOLSCAN_API_KEY = process.env.SOLSCAN_API_KEY || '';
const RATE_LIMIT_SECONDS = parseInt(process.env.SOLSCAN_RATE_LIMIT_SECONDS || '60', 10);

// Rate limiter state
let lastRequestTime = 0;
let requestCount = 0;

/**
 * Rate limiter for Solscan API
 * Enforces 1 request per 60 seconds (configurable via env)
 */
async function enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    const requiredDelay = RATE_LIMIT_SECONDS * 1000; // Convert to milliseconds

    if (lastRequestTime > 0 && timeSinceLastRequest < requiredDelay) {
        const waitTime = requiredDelay - timeSinceLastRequest;
        console.log(`⏳ Rate limit: Waiting ${Math.ceil(waitTime / 1000)}s before next Solscan API call...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    lastRequestTime = Date.now();
    requestCount++;
    console.log(`📡 Solscan API Request #${requestCount}`);
}

/**
 * Create Solscan API client with authentication
 */
function createSolscanClient(): AxiosInstance {
    if (!SOLSCAN_API_KEY) {
        throw new Error('SOLSCAN_API_KEY not configured in .env');
    }

    return axios.create({
        baseURL: SOLSCAN_API_BASE,
        headers: {
            token: SOLSCAN_API_KEY,
            'Content-Type': 'application/json',
        },
        timeout: 30000,
    });
}

/**
 * Fetch token transfers for a wallet
 * Respects rate limiting (1 request per 60 seconds)
 * Respects TEST_MODE for limited transaction fetching
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

    const client = createSolscanClient();
    const allTransfers: SolscanTokenTransfer[] = [];
    let page = 1;
    const pageSize = Math.min(limit, 100); // Max 100 per page

    try {
        while (allTransfers.length < limit) {
            // Enforce rate limit before each request
            await enforceRateLimit();

            console.log(`Fetching page ${page} (${allTransfers.length}/${limit} transactions)...`);

            const response = await client.get('/account/token/txs', {
                params: {
                    address: walletAddress,
                    page,
                    page_size: pageSize,
                    sort_by: 'block_time',
                    sort_order: 'desc',
                    ...(startTime && { from_time: startTime }),
                    ...(endTime && { to_time: endTime }),
                },
            });

            const transfers = response.data?.data || [];

            if (transfers.length === 0) {
                console.log('No more transactions available');
                break; // No more data
            }

            allTransfers.push(...transfers);
            console.log(`✓ Fetched ${transfers.length} transactions (total: ${allTransfers.length})`);

            // Check if we've reached the limit
            if (allTransfers.length >= limit || transfers.length < pageSize) {
                break;
            }

            page++;
        }

        const finalTransfers = allTransfers.slice(0, limit);
        console.log(`\n📊 Total transactions fetched: ${finalTransfers.length}`);

        if (isTestMode) {
            console.log(`\n⚠️  TEST MODE: Review these ${finalTransfers.length} transactions before proceeding.`);
        }

        return finalTransfers;
    } catch (error: any) {
        console.error('Solscan API error:', error.response?.data || error.message);
        throw new Error(`Failed to fetch token transfers: ${error.message}`);
    }
}

/**
 * Fetch account transactions (includes swaps, etc.)
 * Respects rate limiting (1 request per 60 seconds)
 */
export async function fetchAccountTransactions(
    walletAddress: string,
    startTime?: number,
    endTime?: number,
    limit: number = 100
): Promise<SolscanTransaction[]> {
    // Check test mode
    const isTestMode = process.env.TEST_MODE === 'true';
    const testLimit = parseInt(process.env.TEST_TRANSACTION_LIMIT || '10', 10);

    if (isTestMode && limit > testLimit) {
        console.log(`🧪 TEST MODE ENABLED: Limiting transactions to ${testLimit}`);
        limit = testLimit;
    }

    const client = createSolscanClient();
    const allTransactions: SolscanTransaction[] = [];
    let beforeSignature: string | undefined;

    try {
        while (allTransactions.length < limit) {
            // Enforce rate limit before each request
            await enforceRateLimit();

            const response = await client.get('/account/transactions', {
                params: {
                    address: walletAddress,
                    limit: Math.min(50, limit - allTransactions.length),
                    ...(beforeSignature && { before: beforeSignature }),
                },
            });

            const transactions = response.data?.data || [];

            if (transactions.length === 0) {
                break;
            }

            // Filter by time range if specified
            const filtered = transactions.filter((tx: any) => {
                const txTime = tx.blockTime || tx.block_time;
                if (startTime && txTime < startTime) return false;
                if (endTime && txTime > endTime) return false;
                return true;
            });

            allTransactions.push(...filtered);

            // Get last signature for pagination
            if (transactions.length > 0) {
                beforeSignature = transactions[transactions.length - 1].txHash;
            }

            // Check if we've reached the limit or time boundary
            if (
                allTransactions.length >= limit ||
                transactions.length < 50 ||
                (startTime && transactions[transactions.length - 1]?.blockTime < startTime)
            ) {
                break;
            }
        }

        return allTransactions.slice(0, limit);
    } catch (error: any) {
        console.error('Solscan API error:', error.response?.data || error.message);
        throw new Error(`Failed to fetch account transactions: ${error.message}`);
    }
}

/**
 * Fetch token metadata
 */
export async function fetchTokenMetadata(
    tokenAddress: string
): Promise<{
    symbol: string;
    name: string;
    decimals: number;
    address: string;
}> {
    const client = createSolscanClient();

    try {
        // Enforce rate limit
        await enforceRateLimit();

        const response = await client.get('/token/meta', {
            params: {
                address: tokenAddress,
            },
        });

        const data = response.data?.data;

        return {
            symbol: data?.symbol || 'UNKNOWN',
            name: data?.name || 'Unknown Token',
            decimals: data?.decimals || 9,
            address: tokenAddress,
        };
    } catch (error: any) {
        console.error(`Failed to fetch token metadata for ${tokenAddress}:`, error.message);

        // Return default metadata
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
 * Reset rate limiter (useful for testing)
 */
export function resetRateLimiter(): void {
    lastRequestTime = 0;
    requestCount = 0;
    console.log('Rate limiter reset');
}
