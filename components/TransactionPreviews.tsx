'use client';

import { useState } from 'react';
import { NormalizedTransaction } from '@/lib/types';
import { getTransactionTypeInfo, getTransactionIcon } from '@/lib/transaction-education';
import { copyToClipboard, truncateAddress, formatAmount, getTokenDisplayName } from '@/lib/ui-utils';

// Preview A Component - Interactive Transaction Cards with Enhanced Features
export function PreviewA({
    transactions,
    selectedTxIndex,
    setSelectedTxIndex,
    expandedTxIndex,
    setExpandedTxIndex,
    formatDate,
    displayCurrency,
    searchQuery,
}: {
    transactions: NormalizedTransaction[];
    selectedTxIndex: number | null;
    setSelectedTxIndex: (index: number | null) => void;
    expandedTxIndex: number | null;
    setExpandedTxIndex: (index: number | null) => void;
    formatDate: (date: Date | string) => string;
    displayCurrency: 'USD' | 'SOL';
    searchQuery: string;
}) {
    const [copiedHash, setCopiedHash] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'transactions' | 'cost'>('transactions');

    // Filter transactions by search query
    const filteredTransactions = transactions.filter(tx =>
        !searchQuery || tx.txHash.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCopy = async (text: string, txHash: string) => {
        const success = await copyToClipboard(text);
        if (success) {
            setCopiedHash(txHash);
            setTimeout(() => setCopiedHash(null), 2000);
        }
    };

    return (
        <div className="glass rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-blue-400">📋</span> Preview A - Interactive Cards
                {searchQuery && (
                    <span className="text-sm text-gray-400">
                        ({filteredTransactions.length} of {transactions.length})
                    </span>
                )}
            </h3>
            <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2">
                {filteredTransactions.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        {searchQuery ? (
                            <>
                                <div className="text-4xl mb-2">🔍</div>
                                <div>No transactions match "{searchQuery}"</div>
                            </>
                        ) : (
                            <>
                                <div className="text-4xl mb-2">📭</div>
                                <div>No transactions to display</div>
                            </>
                        )}
                    </div>
                ) : (
                    filteredTransactions.map((tx, index) => {
                        const actualIndex = transactions.indexOf(tx);
                        const isSelected = selectedTxIndex === actualIndex;
                        const isExpanded = expandedTxIndex === actualIndex;
                        const sentAmount = tx.amountSent || 0;
                        const receivedAmount = tx.amountReceived || 0;
                        const price = tx.priceUSD || 0;

                        return (
                            <div
                                key={tx.id}
                                onClick={() => setSelectedTxIndex(isSelected ? null : actualIndex)}
                                className={`p-4 rounded-lg cursor-pointer transition-all ${isSelected
                                    ? 'bg-purple-600/30 border-2 border-purple-500'
                                    : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
                                    }`}
                            >
                                {/* Card Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3 flex-1">
                                        {/* Token Image */}
                                        {tx.tokenImageUrl ? (
                                            <img
                                                src={tx.tokenImageUrl}
                                                alt={tx.assetReceived || tx.assetSent || 'Token'}
                                                className="w-10 h-10 rounded-full"
                                                onError={(e) => {
                                                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%236366f1"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="40" font-family="Arial"%3E?%3C/text%3E%3C/svg%3E';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                                                {(tx.assetReceived || tx.assetSent || '?')[0]}
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${tx.isSpam ? 'bg-gray-500/20 text-gray-400 line-through' :
                                                    tx.type === 'Trade' ? 'bg-blue-500/20 text-blue-400' :
                                                        tx.type === 'Deposit' ? 'bg-green-500/20 text-green-400' :
                                                            tx.type === 'Withdrawal' ? 'bg-red-500/20 text-red-400' :
                                                                'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {tx.isSpam ? '🚫 Ignored' : tx.type}
                                                </span>

                                                {/* Info Icon with Tooltip */}
                                                <div className="group relative inline-flex">
                                                    <button
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-gray-500 hover:text-blue-400 transition-colors cursor-help"
                                                        aria-label="Transaction type information"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>

                                                    {/* Tooltip */}
                                                    <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute left-0 top-6 z-50 w-80">
                                                        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl">
                                                            <div className="flex items-start gap-2 mb-2">
                                                                <span className="text-2xl">{tx.isSpam ? '🚫' : getTransactionIcon(tx.type)}</span>
                                                                <div>
                                                                    <div className="font-semibold text-white mb-1">
                                                                        {tx.isSpam ? getTransactionTypeInfo('Ignored').title : getTransactionTypeInfo(tx.type, tx.description).title}
                                                                    </div>
                                                                    <div className="text-xs text-gray-400 mb-2">
                                                                        Taxable: <span className={`font-semibold ${(tx.isSpam ? getTransactionTypeInfo('Ignored') : getTransactionTypeInfo(tx.type, tx.description)).taxable === 'Yes' ? 'text-red-400' :
                                                                            (tx.isSpam ? getTransactionTypeInfo('Ignored') : getTransactionTypeInfo(tx.type, tx.description)).taxable === 'No' ? 'text-green-400' :
                                                                                'text-yellow-400'
                                                                            }`}>
                                                                            {(tx.isSpam ? getTransactionTypeInfo('Ignored') : getTransactionTypeInfo(tx.type, tx.description)).taxable}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <p className="text-sm text-gray-300 mb-2">
                                                                {(tx.isSpam ? getTransactionTypeInfo('Ignored') : getTransactionTypeInfo(tx.type, tx.description)).description}
                                                            </p>
                                                            <p className="text-xs text-gray-500 italic">
                                                                💡 {(tx.isSpam ? getTransactionTypeInfo('Ignored') : getTransactionTypeInfo(tx.type, tx.description)).learnMore}
                                                            </p>
                                                        </div>
                                                        {/* Arrow */}
                                                        <div className="absolute left-4 -top-2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-700"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {formatDate(tx.timestamp)}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedTxIndex(isExpanded ? null : actualIndex);
                                        }}
                                        className="text-gray-400 hover:text-white transition-transform ml-2"
                                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                    >
                                        ▼
                                    </button>
                                </div>

                                {/* Quick Summary */}
                                <div className="space-y-2 mb-3">
                                    {/* Sent */}
                                    {tx.assetSent && sentAmount > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400">Sent:</span>
                                            <div className="text-right">
                                                <div className="font-semibold text-red-400">
                                                    -{formatAmount(sentAmount)} {getTokenDisplayName(tx.assetSent)}
                                                </div>
                                                {displayCurrency === 'USD' && price > 0 && (
                                                    <div className="text-xs text-gray-500">
                                                        ${formatAmount(sentAmount * price, 2)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Received */}
                                    {tx.assetReceived && receivedAmount > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400">Received:</span>
                                            <div className="text-right">
                                                <div className="font-semibold text-green-400">
                                                    +{formatAmount(receivedAmount)} {getTokenDisplayName(tx.assetReceived)}
                                                </div>
                                                {displayCurrency === 'USD' && price > 0 && (
                                                    <div className="text-xs text-gray-500">
                                                        ${formatAmount(receivedAmount * price, 2)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
                                        {/* TxHash - Clickable Copy */}
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs text-gray-400 flex-shrink-0">TxHash:</span>
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCopy(tx.txHash, tx.txHash);
                                                    }}
                                                    className="text-xs text-gray-300 font-mono truncate hover:text-blue-400 transition-colors"
                                                    title="Click to copy transaction hash"
                                                >
                                                    {truncateAddress(tx.txHash, 8, 8)}
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCopy(tx.txHash, tx.txHash);
                                                    }}
                                                    className="flex-shrink-0 text-gray-400 hover:text-blue-400 transition-colors"
                                                    title="Copy transaction hash"
                                                >
                                                    {copiedHash === tx.txHash ? (
                                                        <span className="text-xs text-green-400">✓</span>
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    )}
                                                </button>
                                                <a
                                                    href={`https://solscan.io/tx/${tx.txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="flex-shrink-0 text-gray-400 hover:text-blue-400 transition-colors"
                                                    title="View on Solscan"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </a>
                                            </div>
                                        </div>

                                        {/* Detailed Breakdown Table */}
                                        <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                                            <div className="flex border-b border-gray-700">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveTab('transactions');
                                                    }}
                                                    className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${activeTab === 'transactions'
                                                        ? 'bg-purple-600/30 text-white'
                                                        : 'text-gray-400 hover:text-white'
                                                        }`}
                                                >
                                                    Transactions
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveTab('cost');
                                                    }}
                                                    className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${activeTab === 'cost'
                                                        ? 'bg-purple-600/30 text-white'
                                                        : 'text-gray-400 hover:text-white'
                                                        }`}
                                                >
                                                    Cost Analysis
                                                </button>
                                            </div>

                                            <div className="p-3">
                                                {activeTab === 'transactions' ? (
                                                    // TRANSACTIONS TAB
                                                    <div className="space-y-3">
                                                        {tx.type === 'Trade' || tx.type === 'Investment Loss' ? (
                                                            // For trades, show separate withdrawal and deposit sections
                                                            <>
                                                                {/* WITHDRAWAL Section (Sell Side) */}
                                                                {tx.assetSent && sentAmount > 0 && (
                                                                    <div className="border-l-4 border-red-500 pl-3 bg-red-500/5 rounded-r-lg p-3">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <span className="text-red-400">⬆️</span>
                                                                            <span className="font-semibold text-red-400 text-xs">WITHDRAWAL (Sold)</span>
                                                                        </div>
                                                                        <table className="w-full text-xs">
                                                                            <tbody>
                                                                                <tr>
                                                                                    <td className="py-1 text-gray-400 pr-4">Asset:</td>
                                                                                    <td className="py-1 text-gray-200">
                                                                                        {getTokenDisplayName(tx.assetSent, tx.tokenAddress)}
                                                                                    </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td className="py-1 text-gray-400">Amount:</td>
                                                                                    <td className="py-1 text-gray-200">{formatAmount(sentAmount)}</td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td className="py-1 text-gray-400">Value:</td>
                                                                                    <td className="py-1 text-gray-200 font-semibold">
                                                                                        ${formatAmount(sentAmount * price, 2)}
                                                                                    </td>
                                                                                </tr>
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}

                                                                {/* DEPOSIT Section (Buy Side) */}
                                                                {tx.assetReceived && receivedAmount > 0 && (
                                                                    <div className="border-l-4 border-green-500 pl-3 bg-green-500/5 rounded-r-lg p-3">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <span className="text-green-400">⬇️</span>
                                                                            <span className="font-semibold text-green-400 text-xs">DEPOSIT (Bought)</span>
                                                                        </div>
                                                                        <table className="w-full text-xs">
                                                                            <tbody>
                                                                                <tr>
                                                                                    <td className="py-1 text-gray-400 pr-4">Asset:</td>
                                                                                    <td className="py-1 text-gray-200">
                                                                                        {getTokenDisplayName(tx.assetReceived, tx.tokenAddress)}
                                                                                    </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td className="py-1 text-gray-400">Amount:</td>
                                                                                    <td className="py-1 text-gray-200">{formatAmount(receivedAmount)}</td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td className="py-1 text-gray-400">Value:</td>
                                                                                    <td className="py-1 text-gray-200 font-semibold">
                                                                                        ${formatAmount(receivedAmount * price, 2)}
                                                                                    </td>
                                                                                </tr>
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}

                                                                {/* FEE Section */}
                                                                {tx.feeAmount && tx.feeAmount > 0 && (
                                                                    <div className="border-l-4 border-gray-500 pl-3 bg-gray-500/5 rounded-r-lg p-3">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <span className="text-gray-400">⚡</span>
                                                                            <span className="font-semibold text-gray-400 text-xs">FEE</span>
                                                                        </div>
                                                                        <table className="w-full text-xs">
                                                                            <tbody>
                                                                                <tr>
                                                                                    <td className="py-1 text-gray-400 pr-4">Asset:</td>
                                                                                    <td className="py-1 text-gray-200">
                                                                                        {tx.feeCurrency || 'SOL'}
                                                                                    </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td className="py-1 text-gray-400">Amount:</td>
                                                                                    <td className="py-1 text-gray-200">{formatAmount(tx.feeAmount)}</td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td className="py-1 text-gray-400">Value:</td>
                                                                                    <td className="py-1 text-gray-200 font-semibold">
                                                                                        ${formatAmount(tx.feeAmount * (tx.priceUSD || 0), 2)}
                                                                                    </td>
                                                                                </tr>
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            // For non-trades, show single transaction table
                                                            <table className="w-full text-xs">
                                                                <tbody>
                                                                    {tx.assetSent && sentAmount > 0 && (
                                                                        <>
                                                                            <tr>
                                                                                <td className="py-1 text-gray-400 pr-4">Asset Sent:</td>
                                                                                <td className="py-1 text-gray-200">
                                                                                    {getTokenDisplayName(tx.assetSent, tx.tokenAddress)}
                                                                                </td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="py-1 text-gray-400">Amount Sent:</td>
                                                                                <td className="py-1 text-gray-200">{formatAmount(sentAmount)}</td>
                                                                            </tr>
                                                                        </>
                                                                    )}
                                                                    {tx.assetReceived && receivedAmount > 0 && (
                                                                        <>
                                                                            <tr>
                                                                                <td className="py-1 text-gray-400 pr-4">Asset Received:</td>
                                                                                <td className="py-1 text-gray-200">
                                                                                    {getTokenDisplayName(tx.assetReceived, tx.tokenAddress)}
                                                                                </td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="py-1 text-gray-400">Amount Received:</td>
                                                                                <td className="py-1 text-gray-200">{formatAmount(receivedAmount)}</td>
                                                                            </tr>
                                                                        </>
                                                                    )}
                                                                    {tx.feeAmount && tx.feeAmount > 0 && (
                                                                        <>
                                                                            <tr>
                                                                                <td className="py-1 text-gray-400">Fee:</td>
                                                                                <td className="py-1 text-gray-200">
                                                                                    {formatAmount(tx.feeAmount)} {tx.feeCurrency || 'SOL'}
                                                                                </td>
                                                                            </tr>
                                                                        </>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        )}
                                                    </div>
                                                ) : (
                                                    // COST ANALYSIS TAB
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-400 text-xs">Proceeds (Sale):</span>
                                                            <span className="text-green-400 font-semibold text-sm">
                                                                ${formatAmount(tx.proceedsUSD || 0, 2)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-400 text-xs">Cost Basis:</span>
                                                            <span className="text-gray-400 font-semibold text-sm">
                                                                ${formatAmount(tx.costBasisUSD || 0, 2)}
                                                            </span>
                                                        </div>
                                                        <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
                                                            <span className="text-gray-200 font-semibold text-sm">Gain / Loss:</span>
                                                            <div className="text-right">
                                                                <div className={`text-base font-bold ${(tx.gainLossUSD || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                                                                    }`}>
                                                                    {(tx.gainLossUSD || 0) >= 0 ? '+' : ''}${formatAmount(tx.gainLossUSD || 0, 2)}
                                                                </div>
                                                                {tx.costBasisUSD && tx.costBasisUSD > 0 && (
                                                                    <div className="text-xs text-gray-500">
                                                                        {(((tx.gainLossUSD || 0) / tx.costBasisUSD) * 100).toFixed(2)}%
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Loss Indicator */}
                                                        {tx.lossInfo?.isLoss && (
                                                            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-red-400 text-sm font-semibold">
                                                                        ⚠️ {tx.lossInfo.lossType}
                                                                    </span>
                                                                </div>
                                                                <div className="text-gray-400 text-xs">
                                                                    {tx.lossInfo.reason}
                                                                </div>
                                                                {tx.lossInfo.estimatedLossUSD && (
                                                                    <div className="text-red-400 text-xs font-semibold mt-1">
                                                                        Est. Loss: ${formatAmount(tx.lossInfo.estimatedLossUSD, 2)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Additional Info */}
                                        <div className="flex justify-between text-xs mt-2">
                                            <span className="text-gray-400">Platform:</span>
                                            <span className="text-gray-200">{tx.platform || 'Solana'}</span>
                                        </div>
                                        {tx.description && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-400">Description:</span>
                                                <span className="text-gray-200">{tx.description}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

// Preview B Component - CSV Table View with Trade Splitting
export function PreviewB({
    transactions,
    selectedTxIndex,
    setSelectedTxIndex,
    formatDate,
    searchQuery,
}: {
    transactions: NormalizedTransaction[];
    selectedTxIndex: number | null;
    setSelectedTxIndex: (index: number | null) => void;
    formatDate: (date: Date | string) => string;
    searchQuery: string;
}) {
    // Filter transactions by search query
    const filteredTransactions = transactions.filter(tx =>
        !searchQuery || tx.txHash.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // All transactions shown as single rows (no splitting)
    const filteredRows = filteredTransactions.map(tx => ({
        tx,
        originalIndex: transactions.indexOf(tx)
    }));

    return (
        <div className="glass rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-green-400">📊</span> Preview B - CSV Format (Google Sheet)
                {searchQuery && (
                    <span className="text-sm text-gray-400">
                        ({filteredTransactions.length} of {transactions.length})
                    </span>
                )}
            </h3>
            <div className="overflow-x-auto max-h-[800px]">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-800 z-10">
                        <tr className="border-b border-gray-700">
                            <th className="text-left py-2 px-2 text-gray-400 text-xs">Date (UTC)</th>
                            <th className="text-left py-2 px-2 text-gray-400 text-xs">Platform</th>
                            <th className="text-left py-2 px-2 text-gray-400 text-xs">Asset Sent</th>
                            <th className="text-left py-2 px-2 text-gray-400 text-xs">Amount Sent</th>
                            <th className="text-left py-2 px-2 text-gray-400 text-xs">Asset Received</th>
                            <th className="text-left py-2 px-2 text-gray-400 text-xs">Amount Received</th>
                            <th className="text-left py-2 px-2 text-gray-400 text-xs">Fee Currency</th>
                            <th className="text-left py-2 px-2 text-gray-400 text-xs">Fee Amount</th>
                            <th className="text-left py-2 px-2 text-gray-400 text-xs">Type</th>
                            <th className="text-left py-2 px-2 text-gray-400 text-xs">TxHash</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="text-center py-12 text-gray-400">
                                    {searchQuery ? `No transactions match "${searchQuery}"` : 'No transactions to display'}
                                </td>
                            </tr>
                        ) : (
                            filteredRows.map((row) => {
                                const { tx, originalIndex } = row;
                                const isSelected = selectedTxIndex === originalIndex;

                                return (
                                    <tr
                                        key={tx.id}
                                        onClick={() => setSelectedTxIndex(isSelected ? null : originalIndex)}
                                        className={`border-b border-gray-800 cursor-pointer transition-colors ${isSelected ? 'bg-purple-600/30' : 'hover:bg-gray-800/30'
                                            }`}
                                    >
                                        <td className="py-2 px-2 text-gray-300 text-xs">
                                            {formatDate(tx.timestamp)}
                                        </td>
                                        <td className="py-2 px-2 text-gray-300 text-xs">{tx.platform || 'Solana'}</td>
                                        <td className="py-2 px-2 text-gray-300 text-xs">
                                            {getTokenDisplayName(tx.assetSent, tx.tokenAddress) || '-'}
                                        </td>
                                        <td className="py-2 px-2 text-gray-300 text-xs">
                                            {tx.amountSent ? formatAmount(tx.amountSent) : '-'}
                                        </td>
                                        <td className="py-2 px-2 text-gray-300 text-xs">
                                            {getTokenDisplayName(tx.assetReceived, tx.tokenAddress) || '-'}
                                        </td>
                                        <td className="py-2 px-2 text-gray-300 text-xs">
                                            {tx.amountReceived ? formatAmount(tx.amountReceived) : '-'}
                                        </td>
                                        <td className="py-2 px-2 text-gray-300 text-xs">{tx.feeCurrency || '-'}</td>
                                        <td className="py-2 px-2 text-gray-300 text-xs">
                                            {tx.feeAmount ? formatAmount(tx.feeAmount) : '-'}
                                        </td>
                                        <td className="py-2 px-2 text-xs">
                                            <span className={`px-1.5 py-0.5 rounded ${tx.isSpam ? 'bg-gray-500/20 text-gray-400 line-through' :
                                                tx.type === 'Trade' ? 'bg-blue-500/20 text-blue-400' :
                                                    tx.type === 'Deposit' ? 'bg-green-500/20 text-green-400' :
                                                        tx.type === 'Withdrawal' ? 'bg-red-500/20 text-red-400' :
                                                            tx.type === 'Investment Loss' ? 'bg-orange-500/20 text-orange-400' :
                                                                tx.type === 'Theft Loss' ? 'bg-red-600/20 text-red-400' :
                                                                    tx.type === 'Casualty Loss' ? 'bg-red-600/20 text-red-400' :
                                                                        'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                {tx.isSpam ? '🚫 Ignored' : tx.type}
                                            </span>
                                        </td>
                                        <td className="py-2 px-2 text-gray-300 text-xs font-mono truncate max-w-[100px]">
                                            {truncateAddress(tx.txHash, 4, 4)}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
