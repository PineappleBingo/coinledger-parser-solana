/**
 * API Route: /api/fetch-transactions
 * Fetches and processes Solana transactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchTokenTransfers } from '@/lib/solscan-client';
import { parseTokenTransfer, classifyTransactionType, generateDescription } from '@/lib/solana-parser';
import { batchProcessWithAI } from '@/lib/ai-filter';
import { batchFetchPrices } from '@/lib/price-discovery';
import { NormalizedTransaction } from '@/lib/types';

const requestSchema = z.object({
    walletAddress: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid Solana address'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    includeSpam: z.boolean().default(false),
    useAI: z.boolean().default(true),
    limit: z.number().min(1).max(1000).default(100),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validated = requestSchema.parse(body);

        const { walletAddress, startDate, endDate, includeSpam, useAI, limit } = validated;

        // Convert dates to Unix timestamps
        const startTime = startDate ? Math.floor(new Date(startDate).getTime() / 1000) : undefined;
        const endTime = endDate ? Math.floor(new Date(endDate).getTime() / 1000) : undefined;

        console.log(`Fetching transactions for ${walletAddress}...`);

        // 1. Fetch raw transactions from Solscan
        const rawTransfers = await fetchTokenTransfers(
            walletAddress,
            startTime,
            endTime,
            limit
        );

        console.log(`Fetched ${rawTransfers.length} raw transfers`);

        // 2. Enrich with token metadata from Helius
        console.log('Fetching token metadata...');
        const uniqueTokenAddresses = Array.from(
            new Set(rawTransfers.map((t) => t.token_address).filter(Boolean))
        );

        const { batchFetchTokenMetadata } = await import('@/lib/helius-metadata');
        const tokenMetadataMap = await batchFetchTokenMetadata(uniqueTokenAddresses);

        // 3. Parse transactions with metadata
        const parsedTransactions = rawTransfers.map((transfer) => {
            const metadata = tokenMetadataMap.get(transfer.token_address);
            const parsed = parseTokenTransfer(transfer, walletAddress);

            return {
                ...parsed,
                id: transfer.trans_id,
                txHash: transfer.trans_id,
                timestamp: new Date(parseInt(transfer.time) * 1000),
                assetSent: metadata?.symbol || transfer.token_symbol || 'UNKNOWN',
                assetReceived: metadata?.symbol || transfer.token_symbol || 'UNKNOWN',
                tokenImageUrl: metadata?.logoURI,
                type: classifyTransactionType(parsed),
                description: generateDescription(parsed),
                isSpam: false,
                spamConfidence: 0,
                spamReasons: [],
            } as NormalizedTransaction;
        });

        console.log(`Parsed ${parsedTransactions.length} transactions with metadata`);

        // 3. Fetch prices for all unique tokens
        const uniqueTokens = Array.from(
            new Set(
                parsedTransactions
                    .map((tx) => tx.assetReceived || tx.assetSent)
                    .filter(Boolean) as string[]
            )
        ).map((symbol) => ({ symbol }));

        console.log(`Fetching prices for ${uniqueTokens.length} unique tokens...`);

        const priceMap = await batchFetchPrices(uniqueTokens);

        console.log(`Fetched ${priceMap.size} prices`);

        // 4. AI processing (spam detection + classification)
        let processedTransactions: NormalizedTransaction[];

        if (useAI) {
            console.log('Processing with AI...');
            processedTransactions = await batchProcessWithAI(parsedTransactions, priceMap);
        } else {
            // Add prices without AI
            processedTransactions = parsedTransactions.map((tx) => ({
                ...tx,
                priceUSD: priceMap.get(tx.assetReceived || tx.assetSent || ''),
            }));
        }

        // 5. Filter spam if requested
        const filtered = includeSpam
            ? processedTransactions
            : processedTransactions.filter((tx) => !tx.isSpam);

        console.log(`Filtered to ${filtered.length} transactions (spam excluded: ${processedTransactions.length - filtered.length})`);

        // 6. Calculate summary
        const summary = {
            total: processedTransactions.length,
            filtered: processedTransactions.length - filtered.length,
            missingPrices: filtered.filter((tx) => !tx.priceUSD).length,
            dateRange: {
                start: startDate || new Date(Math.min(...filtered.map((tx) => tx.timestamp.getTime()))).toISOString(),
                end: endDate || new Date(Math.max(...filtered.map((tx) => tx.timestamp.getTime()))).toISOString(),
            },
        };

        return NextResponse.json({
            success: true,
            data: {
                transactions: filtered,
                summary,
            },
        });
    } catch (error: any) {
        console.error('API error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    details: error.errors,
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Internal server error',
            },
            { status: 500 }
        );
    }
}
