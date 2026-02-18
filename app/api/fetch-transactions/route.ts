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
import { detectLoss, calculateCostBasis, calculateProceeds } from '@/lib/loss-detector';

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

        // 3. Group transfers by transaction hash
        console.log('Grouping transfers by transaction hash...');
        const groupedByHash = new Map<string, typeof rawTransfers>();

        rawTransfers.forEach(transfer => {
            const existing = groupedByHash.get(transfer.trans_id) || [];
            existing.push(transfer);
            groupedByHash.set(transfer.trans_id, existing);
        });

        console.log(`Grouped ${rawTransfers.length} transfers into ${groupedByHash.size} transactions`);

        // 4. Parse grouped transactions with metadata
        const { parseGroupedTransfers } = await import('@/lib/solana-parser');
        const parsedTransactions = Array.from(groupedByHash.values()).map(transfers => {
            return parseGroupedTransfers(transfers, walletAddress, tokenMetadataMap);
        });

        console.log(`Parsed ${parsedTransactions.length} transactions with metadata`);

        // 3.5. Apply rent redemption and spam dust detection (BEFORE AI processing)
        // This ensures rent recovery is classified as "Income" and NOT marked as spam
        console.log('Checking for rent redemption and spam dust...');

        const { detectRentRedemption, isSpamDust } = await import('@/lib/rent-detector');
        const { getParsedTransaction } = await import('@/lib/solscan-client');

        let rentRedemptionCount = 0;
        let spamDustCount = 0;

        // Process each transaction to check for rent redemption or spam dust
        for (const parsedTx of parsedTransactions) {
            try {
                // Get full parsed transaction data (includes native transfers and instructions)
                const fullTx = await getParsedTransaction(parsedTx.txHash);

                if (!fullTx) {
                    console.log(`⚠️  Could not fetch full transaction for ${parsedTx.txHash.substring(0, 8)}...`);
                    continue;
                }

                // Check for rent redemption FIRST (takes priority over spam)
                const rentSignals = detectRentRedemption(fullTx, walletAddress, parsedTx.txHash);

                if (rentSignals.isRentRedemption) {
                    // Override classification as Income
                    parsedTx.type = 'Income';
                    parsedTx.description = `Rent recovery: ${rentSignals.rentAmount.toFixed(6)} SOL`;
                    parsedTx.assetReceived = 'SOL';
                    parsedTx.amountReceived = rentSignals.rentAmount;
                    parsedTx.isSpam = false; // Explicitly NOT spam
                    parsedTx.spamReasons = [];
                    parsedTx.spamConfidence = 0;
                    rentRedemptionCount++;

                    console.log(`✅ [RENT] ${parsedTx.txHash.substring(0, 8)}... → Income (+${rentSignals.rentAmount.toFixed(6)} SOL)`);
                    continue; // Skip spam check if it's rent redemption
                }

                // Check for spam dust (if not rent redemption)
                if (isSpamDust(fullTx, walletAddress, parsedTx.txHash)) {
                    parsedTx.isSpam = true;
                    parsedTx.spamReasons = ['Spam dust: received token without SOL income'];
                    parsedTx.spamConfidence = 0.9;
                    spamDustCount++;

                    console.log(`🗑️  [SPAM DUST] ${parsedTx.txHash.substring(0, 8)}... → Spam`);
                }
            } catch (error: any) {
                console.error(`❌ Error checking rent/spam for ${parsedTx.txHash.substring(0, 8)}...:`, error.message);
                // Continue processing other transactions
            }
        }

        console.log(`🔍 Rent detection complete: ${rentRedemptionCount} rent redemptions, ${spamDustCount} spam dust`);

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
            // Add prices WITHOUT AI — but still run heuristic spam detection
            // so the spam toggle has data to filter
            const { detectSpamHeuristic } = await import('@/lib/ai-filter');

            processedTransactions = await Promise.all(
                parsedTransactions.map(async (tx) => {
                    const priceUSD = priceMap.get(tx.assetReceived || tx.assetSent || '');

                    // Skip spam detection if already manually classified (e.g. rent redemption)
                    if (tx.isSpam === false) {
                        return {
                            ...tx,
                            priceUSD,
                        } as NormalizedTransaction;
                    }

                    // Run heuristic spam detection
                    const spamResult = await detectSpamHeuristic(tx, priceUSD);

                    return {
                        ...tx,
                        priceUSD,
                        isSpam: spamResult.isSpam,
                        spamConfidence: spamResult.confidence,
                        spamReasons: spamResult.reasons,
                    } as NormalizedTransaction;
                })
            );
        }

        // 5. Enrich with loss detection and cost analysis
        console.log('Enriching with cost basis and loss detection...');
        const enrichedTransactions = processedTransactions.map((tx) => {
            // Add token address for unknown tokens
            const metadata = tokenMetadataMap.get(
                rawTransfers.find(t => t.trans_id === tx.txHash)?.token_address || ''
            );
            const tokenAddress = metadata?.address;

            // Calculate cost basis and proceeds
            const costBasis = calculateCostBasis(tx);
            const proceeds = calculateProceeds(tx);
            const gainLoss = proceeds - costBasis;

            // Create enhanced transaction for loss detection
            const enrichedTx = {
                ...tx,
                tokenAddress,
                costBasisUSD: costBasis,
                proceedsUSD: proceeds,
                gainLossUSD: gainLoss,
            };

            // Detect losses
            const lossInfo = detectLoss(enrichedTx);

            // Override type if loss detected
            const finalType = lossInfo.isLoss ? lossInfo.lossType! : tx.type;

            return {
                ...enrichedTx,
                type: finalType,
                lossInfo,
            } as NormalizedTransaction;
        });

        // 6. Send ALL transactions to frontend (spam filtering is handled client-side by the toggle)
        // Previously this filtered spam on the backend, which prevented the frontend toggle from working
        const filtered = enrichedTransactions;

        console.log(`Sending ${filtered.length} transactions to frontend (${filtered.filter(tx => tx.isSpam).length} spam included for client-side filtering)`);


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
