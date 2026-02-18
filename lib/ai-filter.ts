/**
 * AI-Powered Spam Filter and Transaction Classifier
 * Uses Gemini Flash for intelligent filtering and classification
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    NormalizedTransaction,
    SpamDetectionResult,
    CoinLedgerType,
} from './types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Heuristic-based spam detection (fast, no AI required)
 */
export async function detectSpamHeuristic(
    tx: Partial<NormalizedTransaction>,
    priceUSD?: number
): Promise<SpamDetectionResult> {
    const reasons: string[] = [];
    let spamScore = 0;

    const tokenName = tx.assetReceived || tx.assetSent || '';

    // Factor 1a: CRITICAL - Zero amount (dust attack)
    // Transactions with 0 amount are always spam/dust attacks
    if ((tx.amountReceived !== undefined && tx.amountReceived === 0) ||
        (tx.amountSent !== undefined && tx.amountSent === 0)) {
        spamScore += 1.0; // Automatic spam - zero amount is always dust
        reasons.push('Zero amount transfer (dust attack)');
    }

    // Factor 1b: Unknown or invalid token
    // UNKNOWN tokens indicate metadata fetch failed or invalid token
    if (tokenName === 'UNKNOWN' || tokenName === '') {
        spamScore += 0.4;
        reasons.push('Unknown or invalid token');
    }

    // Factor 2: Suspicious keywords in token name
    const suspiciousPatterns = [
        /claim/i,
        /airdrop/i,
        /free/i,
        /bonus/i,
        /reward/i,
        /visit/i,
        /\.com$/i,
        /winner/i,
        /prize/i,
        /gift/i,
        /www\./i,
        /http/i,
    ];

    if (suspiciousPatterns.some((pattern) => pattern.test(tokenName))) {
        spamScore += 0.4;
        reasons.push('Suspicious token name pattern detected');
    }

    // Factor 2: Very low value
    if (priceUSD !== undefined && priceUSD < 0.0001) {
        spamScore += 0.3;
        reasons.push('Token value < $0.0001');
    }

    // Factor 3: Received without sending (potential airdrop spam)
    if (tx.assetReceived && (!tx.assetSent || tx.amountSent === 0)) {
        spamScore += 0.2;
        reasons.push('Received without sending assets (potential spam airdrop)');
    }

    // Factor 4: Token name too long (common in scams)
    if (tokenName.length > 30) {
        spamScore += 0.3;
        reasons.push('Token name unusually long');
    }

    // Factor 5: All caps or excessive special characters
    if (tokenName === tokenName.toUpperCase() && tokenName.length > 10) {
        spamScore += 0.1;
        reasons.push('Token name all caps');
    }

    const threshold = parseFloat(process.env.SPAM_FILTER_THRESHOLD || '0.5');

    return {
        isSpam: spamScore >= threshold,
        confidence: Math.min(spamScore, 1),
        reasons,
    };
}

/**
 * AI-powered spam detection using Gemini Flash
 */
export async function detectSpamWithAI(
    tx: Partial<NormalizedTransaction>,
    priceUSD?: number
): Promise<SpamDetectionResult> {
    try {
        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL_SIMPLE || 'gemini-2.0-flash',
        });

        const prompt = `
Analyze this Solana token transaction and determine if it's spam/scam.

Token: ${tx.assetReceived || tx.assetSent || 'UNKNOWN'}
Amount: ${tx.amountReceived || tx.amountSent || 0}
Price (USD): ${priceUSD !== undefined ? '$' + priceUSD : 'Unknown'}
Description: ${tx.description || 'N/A'}

Common spam indicators:
- Token names with "claim", "visit", "winner", "free", URLs
- Extremely low value (<$0.0001)
- Unsolicited airdrops
- Tokens with excessive special characters

Respond in JSON format:
{
  "isSpam": boolean,
  "confidence": number (0-1),
  "reasons": string[]
}
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                isSpam: parsed.isSpam || false,
                confidence: parsed.confidence || 0,
                reasons: parsed.reasons || [],
            };
        }

        // Fallback to heuristic if AI fails
        return detectSpamHeuristic(tx, priceUSD);
    } catch (error) {
        console.error('AI spam detection failed, using heuristic:', error);
        return detectSpamHeuristic(tx, priceUSD);
    }
}

/**
 * Classify transaction type using AI
 */
export async function classifyTransactionWithAI(
    tx: Partial<NormalizedTransaction>
): Promise<{
    type: CoinLedgerType;
    confidence: number;
    description: string;
}> {
    try {
        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL_SIMPLE || 'gemini-2.0-flash',
        });

        const prompt = `
Classify this Solana transaction for tax reporting purposes.

Transaction Details:
- Asset Sent: ${tx.assetSent || 'None'}
- Amount Sent: ${tx.amountSent || 0}
- Asset Received: ${tx.assetReceived || 'None'}
- Amount Received: ${tx.amountReceived || 0}
- Platform: ${tx.platform || 'Unknown'}

Classification Rules:
1. If both sent and received: "Trade"
2. If only received (staking/rewards): "Staking" or "Income"
3. If only received (airdrop): "Airdrop"
4. If only received (transfer in): "Deposit"
5. If only sent (transfer out): "Withdrawal"
6. If only sent (payment): "Merchant Payment"

Respond in JSON format:
{
  "type": "Trade" | "Deposit" | "Withdrawal" | "Income" | "Staking" | "Airdrop" | "Gift Sent" | "Gift Received" | "Merchant Payment",
  "confidence": number (0-1),
  "description": "Human-readable description"
}
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                type: parsed.type || 'Trade',
                confidence: parsed.confidence || 0.5,
                description: parsed.description || tx.description || 'Transaction',
            };
        }

        // Fallback
        return {
            type: tx.type || 'Trade',
            confidence: 0.5,
            description: tx.description || 'Transaction',
        };
    } catch (error) {
        console.error('AI classification failed:', error);
        return {
            type: tx.type || 'Trade',
            confidence: 0.5,
            description: tx.description || 'Transaction',
        };
    }
}

/**
 * Batch process transactions with AI (rate-limited)
 */
export async function batchProcessWithAI(
    transactions: Partial<NormalizedTransaction>[],
    prices: Map<string, number>
): Promise<NormalizedTransaction[]> {
    const results: NormalizedTransaction[] = [];

    // Process in batches to avoid rate limits
    const batchSize = 10;

    for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);

        const processed = await Promise.all(
            batch.map(async (tx) => {
                const priceUSD = prices.get(tx.assetReceived || tx.assetSent || '');

                // Run spam detection and classification in parallel
                const [spamResult, classification] = await Promise.all([
                    detectSpamWithAI(tx, priceUSD),
                    classifyTransactionWithAI(tx),
                ]);

                // Respect pre-set isSpam=false (e.g. rent redemption override)
                // Only apply AI spam result if not already manually classified
                const finalIsSpam = tx.isSpam === false
                    ? false  // Rent redemption or other manual override - never mark as spam
                    : spamResult.isSpam;

                // Respect pre-set type (e.g. rent redemption classified as Income)
                const finalType = (tx.type && tx.type !== 'Trade' && tx.isSpam === false)
                    ? tx.type  // Keep manual classification
                    : classification.type;

                const finalDescription = (tx.description && tx.isSpam === false && tx.type !== 'Trade')
                    ? tx.description  // Keep manual description
                    : classification.description;

                return {
                    id: tx.txHash || `tx-${Date.now()}-${Math.random()}`,
                    timestamp: tx.timestamp || new Date(),
                    txHash: tx.txHash || '',
                    platform: tx.platform || 'Solana',
                    assetSent: tx.assetSent,
                    amountSent: tx.amountSent,
                    assetReceived: tx.assetReceived,
                    amountReceived: tx.amountReceived,
                    feeCurrency: tx.feeCurrency,
                    feeAmount: tx.feeAmount,
                    type: finalType,
                    description: finalDescription,
                    priceUSD,
                    isSpam: finalIsSpam,
                    spamConfidence: finalIsSpam ? spamResult.confidence : 0,
                    spamReasons: finalIsSpam ? spamResult.reasons : [],
                    aiConfidence: classification.confidence,
                } as NormalizedTransaction;
            })
        );

        results.push(...processed);

        // Progress logging
        console.log(`Processed ${Math.min(i + batchSize, transactions.length)}/${transactions.length} transactions`);

        // Small delay to avoid rate limits
        if (i + batchSize < transactions.length) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }

    return results;
}
