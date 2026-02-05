/**
 * Helius Token Metadata Fetcher
 * Uses Helius DAS (Digital Asset Standard) API to fetch token metadata
 */

import axios from 'axios';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '';
const HELIUS_RPC_URL = process.env.HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com';

interface TokenMetadata {
    symbol: string;
    name: string;
    decimals: number;
    address: string;
    logoURI?: string;
}

/**
 * Fetch token metadata from Helius
 */
export async function fetchTokenMetadataFromHelius(
    tokenAddress: string
): Promise<TokenMetadata> {
    try {
        if (!HELIUS_API_KEY) {
            throw new Error('HELIUS_API_KEY not configured');
        }

        // Use Helius DAS API to get asset info
        const response = await axios.post(
            `${HELIUS_RPC_URL}/?api-key=${HELIUS_API_KEY}`,
            {
                jsonrpc: '2.0',
                id: `metadata-${tokenAddress}`,
                method: 'getAsset',
                params: {
                    id: tokenAddress,
                },
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        const asset = response.data?.result;

        if (asset) {
            // Extract logo image from various possible locations
            const logoURI =
                asset.content?.links?.image ||
                asset.content?.files?.[0]?.uri ||
                asset.content?.json_uri ||
                undefined;

            return {
                symbol: asset.content?.metadata?.symbol || asset.token_info?.symbol || 'UNKNOWN',
                name: asset.content?.metadata?.name || asset.token_info?.name || 'Unknown Token',
                decimals: asset.token_info?.decimals ?? 9,
                address: tokenAddress,
                logoURI,
            };
        }

        // Fallback: Try using Token-2022 standard
        const tokenResponse = await axios.post(
            `${HELIUS_RPC_URL}/?api-key=${HELIUS_API_KEY}`,
            {
                jsonrpc: '2.0',
                id: 'token-account-info',
                method: 'getAccountInfo',
                params: [
                    tokenAddress,
                    {
                        encoding: 'jsonParsed',
                    },
                ],
            }
        );

        const accountInfo = tokenResponse.data?.result?.value?.data?.parsed?.info;

        if (accountInfo) {
            return {
                symbol: accountInfo.symbol || 'UNKNOWN',
                name: accountInfo.name || 'Unknown Token',
                decimals: accountInfo.decimals ?? 9,
                address: tokenAddress,
            };
        }

        throw new Error('Token metadata not found');
    } catch (error: any) {
        console.warn(`Failed to fetch metadata for ${tokenAddress}:`, error.message);

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
 * Batch fetch token metadata
 */
export async function batchFetchTokenMetadata(
    tokenAddresses: string[]
): Promise<Map<string, TokenMetadata>> {
    const metadataMap = new Map<string, TokenMetadata>();

    // Fetch in parallel with limit
    const fetchPromises = tokenAddresses.map(async (address) => {
        const metadata = await fetchTokenMetadataFromHelius(address);
        metadataMap.set(address, metadata);
    });

    await Promise.all(fetchPromises);

    return metadataMap;
}
