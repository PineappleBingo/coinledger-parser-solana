'use client';

import { useState } from 'react';
import { NormalizedTransaction } from '@/lib/types';

export default function Home() {
    // Form state
    const [walletAddress, setWalletAddress] = useState('xP1rrkVZ7g7Ten349zRDhJCvKfW8ak5LyAw11dBupRa');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [includeSpam, setIncludeSpam] = useState(false);
    const [useAI, setUseAI] = useState(true);
    const [limit, setLimit] = useState(10);

    // Data state
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState<NormalizedTransaction[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [exportLoading, setExportLoading] = useState(false);

    // UI state
    const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'SOL'>('USD');
    const [timezone, setTimezone] = useState<'UTC' | 'Local'>('UTC');
    const [selectedTxIndex, setSelectedTxIndex] = useState<number | null>(null);
    const [expandedTxIndex, setExpandedTxIndex] = useState<number | null>(null);

    // Date formatting functions
    const formatDate = (date: Date) => {
        if (timezone === 'UTC') {
            // Format as "YYYY-MM-DD HH:mm:ss" UTC
            return date.toISOString().replace('T', ' ').substring(0, 19);
        } else {
            // Format as local time "YYYY-MM-DD HH:mm:ss"
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }
    };

    const handleFetchTransactions = async () => {
        setLoading(true);
        setError(null);
        setTransactions([]);
        setSummary(null);
        setSelectedTxIndex(null);
        setExpandedTxIndex(null);

        try {
            const response = await fetch('/api/fetch-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                    includeSpam,
                    useAI,
                    limit,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch transactions');
            }

            setTransactions(data.data.transactions);
            setSummary(data.data.summary);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExportToSheets = async () => {
        setExportLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/export-sheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactions,
                    sheetName: 'CoinLedger Import',
                    appendMode: true,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to export to Google Sheets');
            }

            alert(`Successfully exported ${data.data.totalRowsWritten} rows!\\n\\nSheet URL: ${data.data.sheetUrl}`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setExportLoading(false);
        }
    };

    const handleOneClickSync = async () => {
        await handleFetchTransactions();
        if (transactions.length > 0) {
            await handleExportToSheets();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
            <div className="container mx-auto px-4 py-8 max-w-[1800px]">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        Solana Tax Bridge
                    </h1>
                    <p className="text-gray-300 text-lg">
                        Automated Meme Coin Transaction Parser for CoinLedger
                    </p>
                </div>

                {/* Configuration Panel */}
                <div className="glass rounded-2xl p-8 mb-8">
                    <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                        <span className="text-purple-400">⚙️</span> Configuration
                    </h2>

                    {/* Wallet Address */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Wallet Address
                        </label>
                        <input
                            type="text"
                            value={walletAddress}
                            onChange={(e) => setWalletAddress(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                            placeholder="Enter Solana wallet address"
                        />
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Start Date (Optional)
                            </label>
                            <input
                                type="datetime-local"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                End Date (Optional)
                            </label>
                            <input
                                type="datetime-local"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                            />
                        </div>
                    </div>

                    {/* Transaction Limit */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Transaction Limit
                        </label>
                        <input
                            type="number"
                            value={limit}
                            onChange={(e) => setLimit(parseInt(e.target.value))}
                            min={1}
                            max={1000}
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                        />
                    </div>

                    {/* Options */}
                    <div className="flex flex-wrap gap-6 mb-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={useAI}
                                onChange={(e) => setUseAI(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-700 bg-gray-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
                            />
                            <span className="text-gray-300">Use AI Classification & Spam Filter</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeSpam}
                                onChange={(e) => setIncludeSpam(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-700 bg-gray-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
                            />
                            <span className="text-gray-300">Include Spam Transactions</span>
                        </label>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <button
                            onClick={handleFetchTransactions}
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all transform hover:scale-105 active:scale-95"
                        >
                            {loading ? '⏳ Fetching...' : '🔍 Fetch & Preview'}
                        </button>
                        <button
                            onClick={handleOneClickSync}
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all transform hover:scale-105 active:scale-95"
                        >
                            {loading ? '⏳ Syncing...' : '⚡ One-Click Sync to Sheets'}
                        </button>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="glass rounded-2xl p-6 mb-8 border-l-4 border-red-500">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">❌</span>
                            <div>
                                <h3 className="font-semibold text-red-400 mb-1">Error</h3>
                                <p className="text-gray-300">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Summary */}
                {summary && (
                    <div className="glass rounded-2xl p-8 mb-8">
                        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                            <span className="text-green-400">📊</span> Summary
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-purple-400">{summary.total}</div>
                                <div className="text-sm text-gray-400 mt-1">Total Transactions</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-red-400">{summary.filtered}</div>
                                <div className="text-sm text-gray-400 mt-1">Spam Filtered</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-yellow-400">{summary.missingPrices}</div>
                                <div className="text-sm text-gray-400 mt-1">Missing Prices</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-400">{transactions.length}</div>
                                <div className="text-sm text-gray-400 mt-1">Ready to Export</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Dual Preview */}
                {transactions.length > 0 && (
                    <div className="space-y-4">
                        {/* Global Controls */}
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-semibold">Transaction Previews</h2>
                            <div className="flex gap-3">
                                {/* UTC/Local Toggle */}
                                <div className="flex bg-gray-800/50 rounded-lg p-1">
                                    <button
                                        onClick={() => setTimezone('UTC')}
                                        className={`px-4 py-2 rounded-md font-semibold transition-all ${timezone === 'UTC'
                                                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                                                : 'text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        🌍 UTC
                                    </button>
                                    <button
                                        onClick={() => setTimezone('Local')}
                                        className={`px-4 py-2 rounded-md font-semibold transition-all ${timezone === 'Local'
                                                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                                                : 'text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        🏠 Local
                                    </button>
                                </div>

                                {/* USD/SOL Toggle */}
                                <div className="flex bg-gray-800/50 rounded-lg p-1">
                                    <button
                                        onClick={() => setDisplayCurrency('USD')}
                                        className={`px-4 py-2 rounded-md font-semibold transition-all ${displayCurrency === 'USD'
                                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                                                : 'text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        💵 USD
                                    </button>
                                    <button
                                        onClick={() => setDisplayCurrency('SOL')}
                                        className={`px-4 py-2 rounded-md font-semibold transition-all ${displayCurrency === 'SOL'
                                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                                                : 'text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        ◎ SOL
                                    </button>
                                </div>

                                {/* Export Button */}
                                <button
                                    onClick={handleExportToSheets}
                                    disabled={exportLoading}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
                                >
                                    {exportLoading ? '📤 Exporting...' : '📤 Export to Sheets'}
                                </button>
                            </div>
                        </div>

                        {/* Side-by-Side Previews */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Preview A - Interactive Cards */}
                            <PreviewA
                                transactions={transactions}
                                selectedTxIndex={selectedTxIndex}
                                setSelectedTxIndex={setSelectedTxIndex}
                                expandedTxIndex={expandedTxIndex}
                                setExpandedTxIndex={setExpandedTxIndex}
                                formatDate={formatDate}
                                displayCurrency={displayCurrency}
                            />

                            {/* Preview B - CSV Table */}
                            <PreviewB
                                transactions={transactions}
                                selectedTxIndex={selectedTxIndex}
                                setSelectedTxIndex={setSelectedTxIndex}
                                formatDate={formatDate}
                            />
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .glass {
                    background: rgba(30, 41, 59, 0.6);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </div>
    );
}

// Preview A Component - Interactive Transaction Cards
function PreviewA({
    transactions,
    selectedTxIndex,
    setSelectedTxIndex,
    expandedTxIndex,
    setExpandedTxIndex,
    formatDate,
    displayCurrency,
}: {
    transactions: NormalizedTransaction[];
    selectedTxIndex: number | null;
    setSelectedTxIndex: (index: number | null) => void;
    expandedTxIndex: number | null;
    setExpandedTxIndex: (index: number | null) => void;
    formatDate: (date: Date) => string;
    displayCurrency: 'USD' | 'SOL';
}) {
    return (
        <div className="glass rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-blue-400">📋</span> Preview A - Interactive Cards
            </h3>
            <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2">
                {transactions.map((tx, index) => {
                    const isSelected = selectedTxIndex === index;
                    const isExpanded = expandedTxIndex === index;
                    const sentAmount = tx.amountSent || 0;
                    const receivedAmount = tx.amountReceived || 0;
                    const price = tx.priceUSD || 0;

                    return (
                        <div
                            key={tx.id}
                            onClick={() => setSelectedTxIndex(isSelected ? null : index)}
                            className={`p-4 rounded-lg cursor-pointer transition-all ${isSelected
                                    ? 'bg-purple-600/30 border-2 border-purple-500'
                                    : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
                                }`}
                        >
                            {/* Card Header */}
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
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
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
                                            {(tx.assetReceived || tx.assetSent || '?')[0]}
                                        </div>
                                    )}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${tx.type === 'Trade' ? 'bg-blue-500/20 text-blue-400' :
                                                    tx.type === 'Deposit' ? 'bg-green-500/20 text-green-400' :
                                                        tx.type === 'Withdrawal' ? 'bg-red-500/20 text-red-400' :
                                                            'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                {tx.type}
                                            </span>
                                            {tx.isSpam && (
                                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-400">
                                                    ⚠️ SPAM
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {formatDate(tx.timestamp)}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedTxIndex(isExpanded ? null : index);
                                    }}
                                    className="text-gray-400 hover:text-white transition-transform"
                                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                >
                                    ▼
                                </button>
                            </div>

                            {/* Transaction Details */}
                            <div className="space-y-2">
                                {/* Sent */}
                                {tx.assetSent && sentAmount > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-400">Sent:</span>
                                        <div className="text-right">
                                            <div className="font-semibold text-red-400">
                                                {sentAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })} {tx.assetSent}
                                            </div>
                                            {displayCurrency === 'USD' && price > 0 && (
                                                <div className="text-xs text-gray-500">
                                                    ${(sentAmount * price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Received */}
                                {tx.assetReceived && receivedAmount > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-400">Received:</span>
                                        <div className="text-right">
                                            <div className="font-semibold text-green-400">
                                                {receivedAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })} {tx.assetReceived}
                                            </div>
                                            {displayCurrency === 'USD' && price > 0 && (
                                                <div className="text-xs text-gray-500">
                                                    ${(receivedAmount * price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Verify Link */}
                                <a
                                    href={`https://solscan.io/tx/${tx.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition"
                                >
                                    🔍 Verify on Solscan →
                                </a>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="mt-4 pt-4 border-t border-gray-700 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Platform:</span>
                                        <span className="text-gray-200">{tx.platform || 'Solana'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">TxHash:</span>
                                        <span className="text-gray-200 font-mono text-xs truncate max-w-[200px]">
                                            {tx.txHash}
                                        </span>
                                    </div>
                                    {tx.description && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Description:</span>
                                            <span className="text-gray-200">{tx.description}</span>
                                        </div>
                                    )}
                                    {tx.feeAmount && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Fee:</span>
                                            <span className="text-gray-200">
                                                {tx.feeAmount} {tx.feeCurrency || 'SOL'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Preview B Component - CSV Table View
function PreviewB({
    transactions,
    selectedTxIndex,
    setSelectedTxIndex,
    formatDate,
}: {
    transactions: NormalizedTransaction[];
    selectedTxIndex: number | null;
    setSelectedTxIndex: (index: number | null) => void;
    formatDate: (date: Date) => string;
}) {
    return (
        <div className="glass rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-green-400">📊</span> Preview B - CSV Format (Google Sheet)
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
                        {transactions.map((tx, index) => {
                            const isSelected = selectedTxIndex === index;
                            return (
                                <tr
                                    key={tx.id}
                                    onClick={() => setSelectedTxIndex(isSelected ? null : index)}
                                    className={`border-b border-gray-800 cursor-pointer transition-colors ${isSelected
                                            ? 'bg-purple-600/30'
                                            : 'hover:bg-gray-800/30'
                                        }`}
                                >
                                    <td className="py-2 px-2 text-gray-300 text-xs">{formatDate(tx.timestamp)}</td>
                                    <td className="py-2 px-2 text-gray-300 text-xs">{tx.platform || 'Solana'}</td>
                                    <td className="py-2 px-2 text-gray-300 text-xs">{tx.assetSent || '-'}</td>
                                    <td className="py-2 px-2 text-gray-300 text-xs">
                                        {tx.amountSent ? tx.amountSent.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '-'}
                                    </td>
                                    <td className="py-2 px-2 text-gray-300 text-xs">{tx.assetReceived || '-'}</td>
                                    <td className="py-2 px-2 text-gray-300 text-xs">
                                        {tx.amountReceived ? tx.amountReceived.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '-'}
                                    </td>
                                    <td className="py-2 px-2 text-gray-300 text-xs">{tx.feeCurrency || '-'}</td>
                                    <td className="py-2 px-2 text-gray-300 text-xs">{tx.feeAmount || '-'}</td>
                                    <td className="py-2 px-2 text-xs">
                                        <span className={`px-1.5 py-0.5 rounded ${tx.type === 'Trade' ? 'bg-blue-500/20 text-blue-400' :
                                                tx.type === 'Deposit' ? 'bg-green-500/20 text-green-400' :
                                                    tx.type === 'Withdrawal' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-gray-500/20 text-gray-400'
                                            }`}>
                                            {tx.type}
                                        </span>
                                    </td>
                                    <td className="py-2 px-2 text-gray-300 text-xs font-mono truncate max-w-[100px]">
                                        {tx.txHash.substring(0, 8)}...
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
