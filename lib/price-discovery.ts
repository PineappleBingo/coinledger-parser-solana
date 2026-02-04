/**
 * Price Discovery Module
 * Fetches token prices from Jupiter and Birdeye APIs
 */

import axios from 'axios';
import { PriceData } from './types';

const JUPITER_API_URL = process.env.JUPITER_API_URL || 'https://price.jup.ag/v4';
const BIRDEYE_API_URL = process.env.BIRDEYE_API_URL || 'https://public-api.birdeye.so';
const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || '';

/**
 * Fetch price from Jupiter Aggregator
 */
export async function fetchJupiterPrice(
    tokenSymbol: string,
    timestamp?: number
): Promise<PriceData | null> {
    try {
        const response = await axios.get(`${JUPITER_API_URL}/price`, {
            params: {
                ids: tokenSymbol,
            },
            timeout: 5000,
        });

        const priceData = response.data?.data?.[tokenSymbol];

        if (priceData && priceData.price) {
            return {
                symbol: tokenSymbol,
                priceUSD: priceData.price,
                timestamp: timestamp || Date.now() / 1000,
                source: 'jupiter',
                confidence: 0.9,
            };
        }

        return null;
    } catch (error) {
        console.error(`Jupiter price fetch failed for ${tokenSymbol}:`, error);
        return null;
    }
}

/**
 * Fetch historical price from Birdeye
 */
export async function fetchBirdeyePrice(
    tokenAddress: string,
    timestamp: number
): Promise<PriceData | null> {
    if (!BIRDEYE_API_KEY) {
        console.warn('Birdeye API key not configured');
        return null;
    }

    try {
        const response = await axios.get(
            `${BIRDEYE_API_URL}/defi/historical_price`,
            {
                params: {
                    address: tokenAddress,
                    address_type: 'token',
                    type: '1m',
                    time_from: timestamp - 300, // 5 minutes before
                    time_to: timestamp + 300, // 5 minutes after
                },
                headers: {
                    'X-API-KEY': BIRDEYE_API_KEY,
                },
                timeout: 5000,
            }
        );

        const items = response.data?.data?.items || [];

        if (items.length > 0) {
            // Find closest price to target timestamp
            const closest = items.reduce((prev: any, curr: any) => {
                const prevDiff = Math.abs(prev.unixTime - timestamp);
                const currDiff = Math.abs(curr.unixTime - timestamp);
                return currDiff < prevDiff ? curr : prev;
            });

            return {
                symbol: tokenAddress,
                priceUSD: closest.value,
                timestamp: closest.unixTime,
                source: 'birdeye',
                confidence: 0.8,
            };
        }

        return null;
    } catch (error) {
        console.error(`Birdeye price fetch failed for ${tokenAddress}:`, error);
        return null;
    }
}

/**
 * Price discovery cascade: Jupiter -> Birdeye -> null
 */
export async function fetchTokenPrice(
    tokenSymbol: string,
    tokenAddress?: string,
    timestamp?: number
): Promise<number | undefined> {
    // Try Jupiter first (real-time pricing)
    const jupiterPrice = await fetchJupiterPrice(tokenSymbol, timestamp);
    if (jupiterPrice) {
        return jupiterPrice.priceUSD;
    }

    // Fallback to Birdeye (historical pricing)
    if (tokenAddress && timestamp) {
        const birdeyePrice = await fetchBirdeyePrice(tokenAddress, timestamp);
        if (birdeyePrice) {
            return birdeyePrice.priceUSD;
        }
    }

    // No price found
    console.warn(`No price data found for ${tokenSymbol}`);
    return undefined;
}

/**
 * Batch fetch prices for multiple tokens
 */
export async function batchFetchPrices(
    tokens: Array<{ symbol: string; address?: string; timestamp?: number }>
): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();

    // Process in parallel with limit
    const pLimit = (await import('p-limit')).default;
    const limit = pLimit(5); // Max 5 concurrent requests

    await Promise.all(
        tokens.map((token) =>
            limit(async () => {
                const price = await fetchTokenPrice(
                    token.symbol,
                    token.address,
                    token.timestamp
                );
                if (price !== undefined) {
                    priceMap.set(token.symbol, price);
                }
            })
        )
    );

    return priceMap;
}
