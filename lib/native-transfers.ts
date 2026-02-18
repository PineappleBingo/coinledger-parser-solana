import { ParsedTransactionWithMeta } from '@solana/web3.js';

export interface NativeTransfer {
    fromUserAccount: string | null;
    toUserAccount: string | null;
    amount: number; // in lamports
}

/**
 * Extract native SOL transfers from transaction
 * Uses preBalances and postBalances to detect SOL movements
 */
export function extractNativeTransfers(
    tx: ParsedTransactionWithMeta,
    walletAddress: string
): NativeTransfer[] {
    const transfers: NativeTransfer[] = [];

    if (!tx.meta || !tx.transaction) {
        return transfers;
    }

    const preBalances = tx.meta.preBalances || [];
    const postBalances = tx.meta.postBalances || [];
    const accountKeys = tx.transaction.message.accountKeys;

    // Find wallet's account index
    const walletIndex = accountKeys.findIndex(
        (key) => key.pubkey.toBase58() === walletAddress
    );

    if (walletIndex === -1) {
        return transfers;
    }

    const preBal = preBalances[walletIndex] || 0;
    const postBal = postBalances[walletIndex] || 0;
    const diff = postBal - preBal;

    // Get transaction fee
    const fee = tx.meta.fee || 0;

    if (diff !== 0) {
        // Positive diff = received SOL
        // Negative diff = sent SOL (including fees)

        if (diff > 0) {
            // SOL received
            transfers.push({
                fromUserAccount: null, // Unknown source
                toUserAccount: walletAddress,
                amount: diff,
            });
        } else if (diff < 0) {
            // SOL sent - need to separate actual send from fee
            const totalDecrease = Math.abs(diff);
            const actualSentAmount = totalDecrease - fee;

            if (actualSentAmount > 0) {
                transfers.push({
                    fromUserAccount: walletAddress,
                    toUserAccount: null, // Unknown destination
                    amount: -actualSentAmount,
                });
            }
        }
    }

    return transfers;
}
