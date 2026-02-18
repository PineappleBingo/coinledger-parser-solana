/**
 * Utility functions for the Solana Tax Bridge UI
 */

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy:', err);
        // Fallback for older browsers
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful;
        } catch (fallbackErr) {
            console.error('Fallback copy failed:', fallbackErr);
            return false;
        }
    }
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string, startChars: number = 6, endChars: number = 4): string {
    if (!address || address.length <= startChars + endChars) {
        return address;
    }
    return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
}

/**
 * Format number with appropriate decimals
 */
export function formatAmount(amount: number, maxDecimals: number = 6): string {
    if (amount === 0) return '0';
    if (Math.abs(amount) < 0.000001) return amount.toExponential(2);
    return amount.toLocaleString(undefined, {
        maximumFractionDigits: maxDecimals,
        minimumFractionDigits: 0
    });
}

/**
 * Get display name for token (fallback to truncated address if unknown)
 */
export function getTokenDisplayName(symbol?: string, address?: string): string {
    if (symbol && symbol !== 'UNKNOWN') {
        return symbol;
    }
    if (address) {
        return truncateAddress(address, 4, 4);
    }
    return 'UNKNOWN';
}
