/**
 * Transaction Type Education Tooltips
 * Provides helpful explanations for different transaction types
 */

export interface TransactionTypeInfo {
    type: string;
    icon: string;
    title: string;
    description: string;
    taxable: 'Yes' | 'No' | 'Depends';
    learnMore: string;
}

export const TRANSACTION_TYPE_INFO: Record<string, TransactionTypeInfo> = {
    'Trade': {
        type: 'Trade',
        icon: '🔄',
        title: 'Trade (Swap/Exchange)',
        description: 'You exchanged one token for another through a DEX. This is a taxable event where capital gains/losses are calculated on the asset you sold.',
        taxable: 'Yes',
        learnMore: 'Swapping tokens creates a taxable disposal of the sent asset and acquisition of the received asset.',
    },
    'Deposit': {
        type: 'Deposit',
        icon: '📥',
        title: 'Deposit (Incoming Transfer)',
        description: 'Tokens arrived in your wallet. Tax treatment depends on the source - transfers from your own wallets are not taxable, but airdrops and payments are taxable as income.',
        taxable: 'Depends',
        learnMore: 'From exchange or own wallet = not taxable. From airdrop/payment = taxable income.',
    },
    'Withdrawal': {
        type: 'Withdrawal',
        icon: '📤',
        title: 'Withdrawal (Outgoing Transfer)',
        description: 'Tokens left your wallet. Tax treatment depends on purpose - transfers to your own wallets are not taxable, but using crypto to buy goods/services is taxable.',
        taxable: 'Depends',
        learnMore: 'To your own wallet = not taxable. As payment/swap = taxable disposal.',
    },
    'Staking': {
        type: 'Staking',
        icon: '🏦',
        title: 'Staking Rewards',
        description: 'You earned tokens by staking your assets. This is taxable as ordinary income at the fair market value when received.',
        taxable: 'Yes',
        learnMore: 'Staking rewards are taxed as income when received, establishing your cost basis for future sales.',
    },
    'Airdrop': {
        type: 'Airdrop',
        icon: '🎁',
        title: 'Airdrop / Free Tokens',
        description: 'You received free tokens from a project airdrop. This is taxable as ordinary income at fair market value when received.',
        taxable: 'Yes',
        learnMore: 'Airdrops are taxed as income. If later sold, capital gains calculated from airdrop value.',
    },
    'Income': {
        type: 'Income',
        icon: '💰',
        title: 'Income / Payment',
        description: 'You received tokens as payment for goods, services, or as other compensation. This is taxable as ordinary income.',
        taxable: 'Yes',
        learnMore: 'Crypto received as payment is taxed as income at FMV. May also be subject to self-employment tax.',
    },
    'Mining': {
        type: 'Mining',
        icon: '⛏️',
        title: 'Mining Rewards',
        description: 'Tokens earned from mining or validating blocks. Taxable as ordinary income when received.',
        taxable: 'Yes',
        learnMore: 'Mining income is taxed when coins are received, not when later sold.',
    },
    'Gift Sent': {
        type: 'Gift Sent',
        icon: '🎁',
        title: 'Gift Sent',
        description: 'You sent crypto as a gift. Generally not taxable at time of gift if under annual exclusion ($18k in 2024), but may trigger capital gains if appreciated.',
        taxable: 'Depends',
        learnMore: 'Gifts over annual exclusion may trigger gift tax. Recipient takes your cost basis.',
    },
    'Gift Received': {
        type: 'Gift Received',
        icon: '🎉',
        title: 'Gift Received',
        description: 'You received crypto as a gift. Not taxable when received, but you adopt the giver\'s cost basis for future sales.',
        taxable: 'No',
        learnMore: 'Receiving gifts is not taxable income, but you inherit the donor\'s cost basis.',
    },
    'Merchant Payment': {
        type: 'Merchant Payment',
        icon: '🛒',
        title: 'Merchant Payment',
        description: 'You used crypto to purchase goods or services. This is a taxable disposal triggering capital gains.',
        taxable: 'Yes',
        learnMore: 'Using crypto as payment is treated as selling it, triggering capital gains/losses.',
    },
    'SPAM': {
        type: 'SPAM',
        icon: '⚠️',
        title: 'Spam / Dusting Attack',
        description: 'Unsolicited tokens with zero or minimal value sent to your wallet. This is a dusting attack for tracking or phishing. Do not interact with these tokens!',
        taxable: 'No',
        learnMore: 'Spam tokens have $0 value and should be excluded from tax reports. Never click links or try to sell spam tokens.',
    },
    'Interest': {
        type: 'Interest',
        icon: '💵',
        title: 'Interest Income',
        description: 'Interest earned on crypto deposits or lending. Taxable as ordinary income when received.',
        taxable: 'Yes',
        learnMore: 'Crypto interest is treated like traditional bank interest - taxable as ordinary income.',
    },
    'Hard Fork': {
        type: 'Hard Fork',
        icon: '🍴',
        title: 'Hard Fork / Network Split',
        description: 'New tokens received from a blockchain hard fork. Taxable as ordinary income at fair market value when you gain control.',
        taxable: 'Yes',
        learnMore: 'Hard fork tokens are taxed as income when you have dominion and control over them.',
    },
    'Interest Payment': {
        type: 'Interest Payment',
        icon: '💸',
        title: 'Interest Payment (Outgoing)',
        description: 'Crypto paid as interest on a loan or debt. May be tax deductible in certain circumstances.',
        taxable: 'Depends',
        learnMore: 'Interest payments may be deductible for business loans. Consult a tax professional.',
    },
    'Investment Loss': {
        type: 'Investment Loss',
        icon: '📉',
        title: 'Investment Loss (Capital Loss)',
        description: 'Sale of crypto at a loss. Reportable as capital loss on Schedule D. Can offset capital gains and up to $3,000 of ordinary income annually.',
        taxable: 'Yes',
        learnMore: 'Capital losses can offset gains and reduce your tax bill. Excess losses carry forward to future years.',
    },
    'Theft Loss': {
        type: 'Theft Loss',
        icon: '🚨',
        title: 'Theft Loss (Scam/Hack)',
        description: 'Loss from theft, scam, or hack. May be deductible as a casualty loss with strict IRS documentation requirements.',
        taxable: 'Depends',
        learnMore: 'IRS allows theft losses, but you must prove: (1) theft occurred, (2) you had ownership, (3) loss amount. Keep all evidence. Consult CPA.',
    },
    'Casualty Loss': {
        type: 'Casualty Loss',
        icon: '💥',
        title: 'Casualty Loss (Protocol Exploit)',
        description: 'Loss from protocol exploit, rug pull, or sudden unexpected event. Similar to theft loss - may be tax deductible with proper documentation.',
        taxable: 'Depends',
        learnMore: 'Must prove asset became worthless through sudden, unexpected event. Documentation critical. CPA recommended.',
    },
    'UNKNOWN': {
        type: 'UNKNOWN',
        icon: '❓',
        title: 'Unknown Transaction',
        description: 'This transaction type could not be automatically classified. Review the transaction details to determine the proper category.',
        taxable: 'Depends',
        learnMore: 'Check transaction details on Solscan to manually classify this transaction.',
    },
};


/**
 * Get transaction type information for tooltip
 */
export function getTransactionTypeInfo(type: string): TransactionTypeInfo {
    // Check if transaction is spam-related
    if (type.toUpperCase().includes('SPAM') || type === 'UNKNOWN') {
        return TRANSACTION_TYPE_INFO['SPAM'];
    }

    return TRANSACTION_TYPE_INFO[type] || TRANSACTION_TYPE_INFO['UNKNOWN'];
}

/**
 * Get icon for transaction type
 */
export function getTransactionIcon(type: string): string {
    const info = getTransactionTypeInfo(type);
    return info.icon;
}

/**
 * Determine if transaction is likely spam
 */
export function isLikelySpam(tx: {
    assetSent?: string;
    assetReceived?: string;
    amountSent?: number;
    amountReceived?: number;
    priceUSD?: number;
    isSpam?: boolean;
}): boolean {
    // Already marked as spam
    if (tx.isSpam) return true;

    // Received unknown token with no value
    if (tx.assetReceived &&
        (tx.assetReceived === 'UNKNOWN' || tx.assetReceived.length === 44) && // Solana address length
        (!tx.priceUSD || tx.priceUSD === 0) &&
        (!tx.amountReceived || tx.amountReceived === 0)) {
        return true;
    }

    // Received very small amount with no value
    if (tx.amountReceived && tx.amountReceived < 0.000001 && (!tx.priceUSD || tx.priceUSD === 0)) {
        return true;
    }

    return false;
}
