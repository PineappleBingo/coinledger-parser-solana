/**
 * Loss Detection System for Tax Reporting
 * Automatically detects and classifies transaction losses
 */

import { NormalizedTransaction, LossDetectionResult } from './types';

/**
 * Detects if a transaction represents a loss and classifies the loss type
 * @param tx - Normalized transaction to analyze
 * @returns Loss detection result with type and reason
 */
export function detectLoss(tx: NormalizedTransaction): LossDetectionResult {
    // 1. Investment Loss: Trade sold at a loss
    if ((tx.type === 'Trade' || tx.type === 'Withdrawal') && tx.costBasisUSD && tx.proceedsUSD) {
        // 5% threshold to avoid flagging small rounding differences
        if (tx.proceedsUSD < tx.costBasisUSD * 0.95) {
            return {
                isLoss: true,
                lossType: 'Investment Loss',
                reason: `Sold at loss: Proceeds $${tx.proceedsUSD.toFixed(2)} vs Cost $${tx.costBasisUSD.toFixed(2)}`,
                estimatedLossUSD: tx.costBasisUSD - tx.proceedsUSD
            };
        }
    }

    // 2. Theft Loss: Spam/scam withdrawal with high confidence
    if (tx.isSpam && tx.spamConfidence > 0.8 && (tx.type === 'Withdrawal' || tx.type === 'Trade')) {
        const value = tx.amountSent && tx.priceUSD
            ? tx.amountSent * tx.priceUSD
            : 0;

        return {
            isLoss: true,
            lossType: 'Theft Loss',
            reason: `Spam/scam detected: ${tx.spamReasons.slice(0, 2).join(', ')}`,
            estimatedLossUSD: value
        };
    }

    // 3. Casualty Loss: Would require manual flagging or external data
    // Future enhancement: detect protocol exploits via external service
    // For now, this would need to be manually overridden by user

    return {
        isLoss: false,
        reason: 'Normal transaction'
    };
}

/**
 * Calculates cost basis for a transaction
 * Simplified implementation: uses current price as cost basis
 * 
 * TODO: Implement historical price lookup for accurate cost basis
 * This would require storing purchase history and matching FIFO/LIFO
 * 
 * @param tx - Transaction to calculate cost basis for
 * @returns Estimated cost basis in USD
 */
export function calculateCostBasis(tx: NormalizedTransaction): number {
    // For withdrawals and trades, estimate cost basis from current price
    if (tx.amountSent && tx.priceUSD) {
        return tx.amountSent * tx.priceUSD;
    }
    return 0;
}

/**
 * Calculates proceeds from a transaction
 * @param tx - Transaction to calculate proceeds from
 * @returns Proceeds in USD
 */
export function calculateProceeds(tx: NormalizedTransaction): number {
    // For deposits and trades, calculate proceeds from received amount
    if (tx.amountReceived && tx.priceUSD) {
        return tx.amountReceived * tx.priceUSD;
    }
    return 0;
}

/**
 * Calculates gain or loss for a transaction
 * @param costBasis - Cost basis in USD
 * @param proceeds - Proceeds in USD
 * @returns Gain (positive) or loss (negative) in USD
 */
export function calculateGainLoss(costBasis: number, proceeds: number): number {
    return proceeds - costBasis;
}
