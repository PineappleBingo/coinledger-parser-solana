import { ParsedTransactionWithMeta } from '@solana/web3.js';
import { extractTokenTransfers } from './solscan-client';
import { extractNativeTransfers } from './native-transfers';

export interface RentRedemptionSignals {
    isRentRedemption: boolean;
    hasTokenBurn: boolean;
    hasSOLIncome: boolean;
    rentAmount: number; // in SOL
    confidence: number; // 0-1
    details: string;
}

// Typical rent amounts for Solana accounts
const TYPICAL_RENT_AMOUNTS = [
    0.00203928,  // 1 account (~2,039,280 lamports)
    0.00407856,  // 2 accounts
    0.00611784,  // 3 accounts
    0.00815712,  // 4 accounts
];

const RENT_TOLERANCE = 0.0005; // 0.5 milliSOL tolerance
const MIN_RENT_AMOUNT = 0.001; // Minimum to consider as rent (1 milliSOL)

/**
 * Detect if transaction is a rent redemption (burning dust to recover SOL)
 * 
 * Rent redemption happens when:
 * - User closes/burns a token account (token OUT)
 * - System returns rent deposit (SOL IN, typically ~0.002 SOL)
 */
export function detectRentRedemption(
    tx: ParsedTransactionWithMeta,
    walletAddress: string,
    signature: string
): RentRedemptionSignals {
    // Extract token and native transfers
    const tokenTransfers = extractTokenTransfers(tx, walletAddress, signature);
    const nativeTransfers = extractNativeTransfers(tx, walletAddress);

    // Check for token burn/outflow (user sending/burning tokens)
    const tokenOutflows = tokenTransfers.filter(
        (t) => t.flow === 'out' && t.from_address === walletAddress
    );
    const hasTokenBurn = tokenOutflows.length > 0;

    // Check for SOL income (incoming SOL to user)
    const solIncomes = nativeTransfers.filter(
        (t) => t.toUserAccount === walletAddress && t.amount > 0
    );
    const hasSOLIncome = solIncomes.length > 0;

    // Calculate total SOL received
    const totalSOLReceived = solIncomes.reduce((sum, t) => sum + t.amount, 0);
    const rentAmount = totalSOLReceived / 1e9; // Convert lamports to SOL

    // Check if amount matches typical rent (or multiples of it)
    let isTypicalRent = false;
    let closestRent = 0;

    for (const typical of TYPICAL_RENT_AMOUNTS) {
        if (Math.abs(rentAmount - typical) < RENT_TOLERANCE) {
            isTypicalRent = true;
            closestRent = typical;
            break;
        }
    }

    // Also check if it's a multiple of base rent (within tolerance)
    if (!isTypicalRent && rentAmount >= MIN_RENT_AMOUNT) {
        const baseRent = TYPICAL_RENT_AMOUNTS[0];
        const multiple = Math.round(rentAmount / baseRent);
        if (multiple > 0 && Math.abs(rentAmount - (baseRent * multiple)) < RENT_TOLERANCE) {
            isTypicalRent = true;
            closestRent = baseRent * multiple;
        }
    }

    // Calculate confidence based on signals
    let confidence = 0;
    const signals: string[] = [];

    if (hasTokenBurn) {
        confidence += 0.3;
        signals.push(`token burn (${tokenOutflows.length} outflow${tokenOutflows.length > 1 ? 's' : ''})`);
    }

    if (hasSOLIncome && rentAmount >= MIN_RENT_AMOUNT) {
        confidence += 0.3;
        signals.push(`SOL income (+${rentAmount.toFixed(6)} SOL)`);
    }

    if (isTypicalRent) {
        confidence += 0.4;
        signals.push(`typical rent amount (~${closestRent.toFixed(6)} SOL)`);
    }

    // Final determination
    const isRentRedemption = hasTokenBurn && hasSOLIncome && confidence >= 0.6;

    const details = signals.length > 0
        ? signals.join(', ')
        : 'no rent signals detected';

    console.log(`🔍 [RENT CHECK] TX: ${signature.substring(0, 8)}...`);
    console.log(`   Token Burn: ${hasTokenBurn}, SOL Income: ${hasSOLIncome}`);
    console.log(`   Rent Amount: ${rentAmount.toFixed(6)} SOL, Typical: ${isTypicalRent}`);
    console.log(`   Confidence: ${confidence.toFixed(2)}, Is Rent: ${isRentRedemption}`);
    console.log(`   Details: ${details}`);

    return {
        isRentRedemption,
        hasTokenBurn,
        hasSOLIncome,
        rentAmount,
        confidence,
        details,
    };
}

/**
 * Check if transaction is spam dust (receiving worthless tokens)
 * 
 * Spam dust characteristics:
 * - Received token (token IN)
 * - No SOL income (or very minimal)
 * - Not initiated by user
 */
export function isSpamDust(
    tx: ParsedTransactionWithMeta,
    walletAddress: string,
    signature: string
): boolean {
    const tokenTransfers = extractTokenTransfers(tx, walletAddress, signature);
    const nativeTransfers = extractNativeTransfers(tx, walletAddress);

    // Spam dust = Received token WITHOUT sending anything
    const receivedToken = tokenTransfers.some(
        (t) => t.flow === 'in' && t.to_address === walletAddress
    );

    const sentToken = tokenTransfers.some(
        (t) => t.flow === 'out' && t.from_address === walletAddress
    );

    // Check SOL movements
    const receivedSOL = nativeTransfers.some(
        (t) => t.toUserAccount === walletAddress && t.amount > 0
    );

    // Spam = received token, didn't send anything, no SOL gain
    const isSpam = receivedToken && !sentToken && !receivedSOL;

    if (isSpam) {
        console.log(`🗑️  [SPAM DUST] TX: ${signature.substring(0, 8)}... - Received token without SOL income`);
    }

    return isSpam;
}
