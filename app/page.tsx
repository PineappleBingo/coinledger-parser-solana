'use client';

import { useState } from 'react';
import { NormalizedTransaction } from '@/lib/types';

export default function Home() {
    const [walletAddress, setWalletAddress] = useState('xP1rrkVZ7g7Ten349zRDhJCvKfW8ak5LyAw11dBupRa');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [includeSpam, setIncludeSpam] = useState(false);
    const [useAI, setUseAI] = useState(true);
    const [limit, setLimit] = useState(100);
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState<NormalizedTransaction[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [exportLoading, setExportLoading] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(false);

    const handleFetchTransactions = async () => {
        setLoading(true);
        setError(null);
        setTransactions([]);
        setSummary(null);

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
        setExportSuccess(false);
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

            setExportSuccess(true);
            alert(`Successfully exported ${data.data.totalRowsWritten} rows!\n\nSheet URL: ${data.data.sheetUrl}`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setExportLoading(false);
        }
    };

    const handleOneClickSync = async () => {
        setLoading(true);
        setError(null);
        setExportSuccess(false);

        try {
            const response = await fetch('/api/sync', {
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
                throw new Error(data.error || 'Sync failed');
            }

            setTransactions(data.data.transactions);
            setSummary(data.data.summary);
            setExportSuccess(true);
            alert(
                `✅ Sync Complete!\n\n` +
                `Fetched: ${data.data.summary.totalFetched}\n` +
                `Processed: ${data.data.summary.totalProcessed}\n` +
                `Spam Filtered: ${data.data.summary.spamFiltered}\n` +
                `Exported: ${data.data.summary.exported}\n\n` +
                `Sheet URL: ${data.data.sheetUrl}`
            );
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                        Solana Tax Bridge
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Automated Meme Coin Transaction Parser for CoinLedger
                    </p>
                </div>

                {/* Configuration Panel */}
                <div className="glass rounded-2xl p-8 mb-8">
                    <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                        <span className="text-purple-400">⚙️</span> Configuration
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Wallet Address */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-2 text-gray-300">
                                Wallet Address
                            </label>
                            <input
                                type="text"
                                value={walletAddress}
                                onChange={(e) => setWalletAddress(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                                placeholder="Enter Solana wallet address"
                            />
                        </div>

                        {/* Start Date */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-300">
                                Start Date (Optional)
                            </label>
                            <input
                                type="datetime-local"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                            />
                        </div>

                        {/* End Date */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-300">
                                End Date (Optional)
                            </label>
                            <input
                                type="datetime-local"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                            />
                        </div>

                        {/* Limit */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-300">
                                Transaction Limit
                            </label>
                            <input
                                type="number"
                                value={limit}
                                onChange={(e) => setLimit(parseInt(e.target.value))}
                                min={1}
                                max={1000}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                            />
                        </div>

                        {/* Options */}
                        <div className="flex flex-col gap-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useAI}
                                    onChange={(e) => setUseAI(e.target.checked)}
                                    className="w-5 h-5 text-purple-500 bg-gray-800 border-gray-700 rounded focus:ring-2 focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-300">Use AI Classification & Spam Filter</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={includeSpam}
                                    onChange={(e) => setIncludeSpam(e.target.checked)}
                                    className="w-5 h-5 text-purple-500 bg-gray-800 border-gray-700 rounded focus:ring-2 focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-300">Include Spam Transactions</span>
                            </label>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 mt-8">
                        <button
                            onClick={handleFetchTransactions}
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all transform hover:scale-105 active:scale-95"
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

                {/* Transactions Table */}
                {transactions.length > 0 && (
                    <div className="glass rounded-2xl p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-semibold flex items-center gap-2">
                                <span className="text-blue-400">📋</span> Transactions Preview
                            </h2>
                            <button
                                onClick={handleExportToSheets}
                                disabled={exportLoading}
                                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
                            >
                                {exportLoading ? '⏳ Exporting...' : '📤 Export to Sheets'}
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-700">
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Date</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Type</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Sent</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Received</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Price</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Platform</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Spam</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.slice(0, 50).map((tx, idx) => (
                                        <tr key={tx.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition">
                                            <td className="px-4 py-3 text-sm text-gray-300">
                                                {new Date(tx.timestamp).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 bg-purple-900/50 text-purple-300 rounded text-xs">
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-300">
                                                {tx.assetSent ? `${tx.amountSent} ${tx.assetSent}` : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-300">
                                                {tx.assetReceived ? `${tx.amountReceived} ${tx.assetReceived}` : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-300">
                                                {tx.priceUSD ? `$${tx.priceUSD.toFixed(4)}` : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-400">{tx.platform}</td>
                                            <td className="px-4 py-3">
                                                {tx.isSpam ? (
                                                    <span className="text-red-400 text-xs">⚠️ Spam</span>
                                                ) : (
                                                    <span className="text-green-400 text-xs">✓</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {transactions.length > 50 && (
                                <div className="text-center py-4 text-gray-400 text-sm">
                                    Showing 50 of {transactions.length} transactions
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && transactions.length === 0 && !error && (
                    <div className="glass rounded-2xl p-16 text-center">
                        <div className="text-6xl mb-4">🚀</div>
                        <h3 className="text-2xl font-semibold mb-2">Ready to Start</h3>
                        <p className="text-gray-400">
                            Configure your settings above and click "Fetch & Preview" or "One-Click Sync"
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
