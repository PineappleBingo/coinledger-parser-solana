/**
 * API Route: /api/sync
 * Main pipeline: Fetch -> Filter -> Export to Google Sheets
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchTokenTransfers } from '@/lib/solscan-client';
import { parseTokenTransfer, classifyTransactionType, generateDescription } from '@/lib/solana-parser';
import { batchProcessWithAI } from '@/lib/ai-filter';
import { batchFetchPrices } from '@/lib/price-discovery';
import { batchWriteToGoogleSheets } from '@/lib/google-sheets';
import { NormalizedTransaction } from '@/lib/types';

const requestSchema = z.object({
    walletAddress: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid Solana address'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    includeSpam: z.boolean().default(false),
    useAI: z.boolean().default(true),
    sheetId: z.string().optional(),
    sheetName: z.string().default('CoinLedger Import'),
    limit: z.number().min(1).max(1000).default(100),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validated = requestSchema.parse(body);

        const {
            walletAddress,
            startDate,
            endDate,
            includeSpam,
            useAI,
            sheetId,
            sheetName,
            limit,
        } = validated;

        console.log('=== SOLANA TAX BRIDGE SYNC STARTED ===');
        console.log(`Wallet: ${walletAddress}`);
        console.log(`Date Range: ${startDate || 'All'} to ${endDate || 'Now'}`);

        // Convert dates to Unix timestamps
        const startTime = startDate ? Math.floor(new Date(startDate).getTime() / 1000) : undefined;
        const endTime = endDate ? Math.floor(new Date(endDate).getTime() / 1000) : undefined;

        // STEP 1: EXTRACTION
        console.log('\n[1/5] Extracting transactions from Solscan...');
        const rawTransfers = await fetchTokenTransfers(
            walletAddress,
            startTime,
            endTime,
            limit
        );
        console.log(`✓ Fetched ${rawTransfers.length} raw transfers`);

        // STEP 2: PARSING
        console.log('\n[2/5] Parsing Solana instructions...');
        const parsedTransactions = rawTransfers.map((transfer) => {
            const parsed = parseTokenTransfer(transfer, walletAddress);
            return {
                ...parsed,
                id: transfer.trans_id,
                txHash: transfer.trans_id,
                timestamp: new Date(transfer.time * 1000),
                type: classifyTransactionType(parsed),
                description: generateDescription(parsed),
                isSpam: false,
                spamConfidence: 0,
                spamReasons: [],
                aiConfidence: 0.5,
            } as NormalizedTransaction;
        });
        console.log(`✓ Parsed ${parsedTransactions.length} transactions`);

        // STEP 3: PRICE DISCOVERY
        console.log('\n[3/5] Discovering token prices...');
        const uniqueTokens = Array.from(
            new Set(
                parsedTransactions
                    .map((tx) => tx.assetReceived || tx.assetSent)
                    .filter(Boolean) as string[]
            )
        ).map((symbol) => ({ symbol }));

        const priceMap = await batchFetchPrices(uniqueTokens);
        console.log(`✓ Fetched ${priceMap.size}/${uniqueTokens.length} prices`);

        // STEP 4: AI PROCESSING
        console.log('\n[4/5] AI processing (spam filter + classification)...');
        let processedTransactions: NormalizedTransaction[];

        if (useAI) {
            processedTransactions = await batchProcessWithAI(parsedTransactions, priceMap);
        } else {
            processedTransactions = parsedTransactions.map((tx) => ({
                ...tx,
                priceUSD: priceMap.get(tx.assetReceived || tx.assetSent || ''),
            }));
        }

        const filtered = includeSpam
            ? processedTransactions
            : processedTransactions.filter((tx) => !tx.isSpam);

        console.log(`✓ Processed ${processedTransactions.length} transactions`);
        console.log(`✓ Filtered out ${processedTransactions.length - filtered.length} spam transactions`);

        // STEP 5: EXPORT TO GOOGLE SHEETS
        console.log('\n[5/5] Exporting to Google Sheets...');
        const exportResult = await batchWriteToGoogleSheets(
            filtered,
            sheetId,
            sheetName
        );
        console.log(`✓ Wrote ${exportResult.totalRowsWritten} rows to sheet`);

        console.log('\n=== SYNC COMPLETED SUCCESSFULLY ===');
        console.log(`Sheet URL: ${exportResult.sheetUrl}`);

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    totalFetched: rawTransfers.length,
                    totalProcessed: processedTransactions.length,
                    spamFiltered: processedTransactions.length - filtered.length,
                    exported: exportResult.totalRowsWritten,
                    missingPrices: filtered.filter((tx) => !tx.priceUSD).length,
                },
                sheetUrl: exportResult.sheetUrl,
                transactions: filtered,
            },
        });
    } catch (error: any) {
        console.error('=== SYNC FAILED ===');
        console.error(error);

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
                error: error.message || 'Sync failed',
            },
            { status: 500 }
        );
    }
}
