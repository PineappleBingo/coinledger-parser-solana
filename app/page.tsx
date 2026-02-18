'use client';

import { useState, useMemo } from 'react';
import { NormalizedTransaction } from '@/lib/types';
import { getTransactionTypeInfo, getTransactionIcon } from '@/lib/transaction-education';
import { copyToClipboard, truncateAddress, formatAmount, getTokenDisplayName } from '@/lib/ui-utils';
import { PreviewA, PreviewB } from '@/components/TransactionPreviews';

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
    const [searchQuery, setSearchQuery] = useState('');

    // Progress state
    const [fetchProgress, setFetchProgress] = useState(0);
    const [fetchStatus, setFetchStatus] = useState('');

    // Cache state
    const [cachedData, setCachedData] = useState<any>(null);
    const fileInputRef = useState<HTMLInputElement | null>(null);

    // Date formatting functions
    const formatDate = (date: Date | string) => {
        // Ensure we have a Date object
        const dateObj = typeof date === 'string' ? new Date(date) : date;

        if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
            return 'Invalid Date';
        }

        if (timezone === 'UTC') {
            // Format as "YYYY-MM-DD HH:mm:ss" UTC
            return dateObj.toISOString().replace('T', ' ').substring(0, 19);
        } else {
            // Format as local time "YYYY-MM-DD HH:mm:ss"
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            const seconds = String(dateObj.getSeconds()).padStart(2, '0');
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
        setFetchProgress(0);
        setFetchStatus('Initializing...');

        try {
            setFetchProgress(10);
            setFetchStatus('Fetching raw transactions...');

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

            setFetchProgress(40);
            setFetchStatus('Processing transaction data...');

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch transactions');
            }

            setFetchProgress(70);
            setFetchStatus('Enriching with token metadata...');

            // Simulate brief delay for progress visibility
            await new Promise(resolve => setTimeout(resolve, 300));

            setFetchProgress(90);
            setFetchStatus('Finalizing...');

            setTransactions(data.data.transactions);
            setSummary(data.data.summary);

            setFetchProgress(100);
            setFetchStatus('Complete!');

            // Clear status after 2 seconds
            setTimeout(() => {
                setFetchStatus('');
                setFetchProgress(0);
            }, 2000);
        } catch (err: any) {
            setError(err.message);
            setFetchStatus('Error occurred');
            setFetchProgress(0);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadData = () => {
        if (transactions.length === 0) {
            alert('No transactions to download. Please fetch transactions first.');
            return;
        }

        const data = {
            version: '1.0',
            walletAddress,
            fetchedAt: new Date().toISOString(),
            filters: {
                startDate: startDate || null,
                endDate: endDate || null,
                limit,
                useAI,
                includeSpam,
            },
            transactions,
            summary,
            stats: {
                totalTransactions: transactions.length,
                tradeCount: transactions.filter(t => t.type === 'Trade').length,
                withdrawalCount: transactions.filter(t => t.type === 'Withdrawal').length,
                incomeCount: transactions.filter(t => t.type === 'Income').length,
            },
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `helius-data-${walletAddress.substring(0, 8)}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleUploadData = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);

                // Validate data structure
                if (!data.version || !data.transactions || !Array.isArray(data.transactions)) {
                    throw new Error('Invalid cache file format');
                }

                // Populate state
                setCachedData(data);
                setTransactions(data.transactions);
                setSummary(data.summary || null);
                setWalletAddress(data.walletAddress || walletAddress);

                // Populate filters if available
                if (data.filters) {
                    setStartDate(data.filters.startDate || '');
                    setEndDate(data.filters.endDate || '');
                    setLimit(data.filters.limit || 10);
                    setUseAI(data.filters.useAI ?? true);
                    setIncludeSpam(data.filters.includeSpam ?? false);
                }

                alert(`✅ Loaded ${data.transactions.length} cached transactions from ${new Date(data.fetchedAt).toLocaleString()}`);
            } catch (err: any) {
                alert(`❌ Error loading cache file: ${err.message}`);
                setError(err.message);
            }
        };
        reader.readAsText(file);

        // Reset file input so same file can be uploaded again
        event.target.value = '';
    };

    const handleClearCache = () => {
        setCachedData(null);
        setTransactions([]);
    };

    // Filter transactions based on spam toggle
    const visibleTransactions = useMemo(() => {
        if (includeSpam) {
            return transactions; // Show all
        }
        return transactions.filter(tx => !tx.isSpam); // Exclude spam
    }, [transactions, includeSpam]);

    // Calculate spam count for badge
    const filteredSpamCount = useMemo(() => {
        return transactions.filter(tx => tx.isSpam).length;
    }, [transactions]);

    // Filter transactions for search
    const filteredTransactions = visibleTransactions.filter((tx) => {
        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();
        return (
            tx.txHash.toLowerCase().includes(query) ||
            tx.type.toLowerCase().includes(query) ||
            tx.assetSent?.toLowerCase().includes(query) ||
            tx.assetReceived?.toLowerCase().includes(query)
        );
    });

    const handleExportToSheets = async () => {
        setLoading(true);
        setError(null);

        try {

            const response = await fetch('/api/export-sheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactions: visibleTransactions, // Respect spam toggle for exports
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
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-4">
                        {/* Primary Actions */}
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

                        {/* Cache Controls */}
                        <div className="flex gap-4 items-center">
                            <button
                                onClick={handleDownloadData}
                                disabled={transactions.length === 0}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium text-sm transition-all"
                                title="Download fetched data as JSON"
                            >
                                📥 Download Data
                            </button>

                            <label className="flex-1 cursor-pointer">
                                <div className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium text-sm transition-all text-center">
                                    📤 Upload Cached Data
                                </div>
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleUploadData}
                                    className="hidden"
                                />
                            </label>

                            {cachedData && (
                                <button
                                    onClick={handleClearCache}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium text-sm transition-all"
                                    title="Clear cached data"
                                >
                                    🗑️ Clear Cache
                                </button>
                            )}
                        </div>

                        {/* Cache Status Indicator */}
                        {cachedData && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded">
                                <span className="text-green-400 text-sm">✅ Using cached data from {new Date(cachedData.fetchedAt).toLocaleString()}</span>
                                <span className="text-gray-400 text-xs">({transactions.length} transactions)</span>
                            </div>
                        )}

                        {/* Spam Filter Toggle */}
                        {transactions.length > 0 && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeSpam}
                                        onChange={(e) => setIncludeSpam(e.target.checked)}
                                        className="w-4 h-4 accent-purple-500"
                                    />
                                    <span className="text-sm font-medium text-purple-300">
                                        {includeSpam ? '🗑️ Spam Included' : '✨ Spam Excluded'}
                                    </span>
                                </label>
                                {!includeSpam && filteredSpamCount > 0 && (
                                    <span className="text-xs text-gray-400">
                                        ({filteredSpamCount} spam hidden)
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {(loading || fetchProgress > 0) && (
                        <div className="mt-6 space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-300">{fetchStatus}</span>
                                <span className="text-gray-400">{fetchProgress}%</span>
                            </div>
                            <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-500 ease-out"
                                    style={{ width: `${fetchProgress}%` }}
                                />
                            </div>
                        </div>
                    )}
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

                {/* Summary - Uses visibleTransactions for real-time toggle updates */}
                {transactions.length > 0 && (
                    <div className="glass rounded-2xl p-8 mb-8">
                        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                            <span className="text-green-400">📊</span> Summary
                            {!includeSpam && filteredSpamCount > 0 && (
                                <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full">
                                    {filteredSpamCount} spam hidden
                                </span>
                            )}
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-purple-400">{transactions.length}</div>
                                <div className="text-sm text-gray-400 mt-1">Total Fetched</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-red-400">{filteredSpamCount}</div>
                                <div className="text-sm text-gray-400 mt-1">Spam Detected</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-yellow-400">{visibleTransactions.filter(tx => !tx.priceUSD).length}</div>
                                <div className="text-sm text-gray-400 mt-1">Missing Prices</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-400">{visibleTransactions.length}</div>
                                <div className="text-sm text-gray-400 mt-1">Showing / Ready</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Dual Preview */}
                {visibleTransactions.length > 0 && (
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

                        {/* Search Bar */}
                        <div className="mb-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search by transaction hash..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-4 py-3 pl-10 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                                />
                                <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-3 text-gray-400 hover:text-white transition"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Side-by-Side Previews */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Preview A - Interactive Cards */}
                            <PreviewA
                                transactions={visibleTransactions}
                                selectedTxIndex={selectedTxIndex}
                                setSelectedTxIndex={setSelectedTxIndex}
                                expandedTxIndex={expandedTxIndex}
                                setExpandedTxIndex={setExpandedTxIndex}
                                formatDate={formatDate}
                                displayCurrency={displayCurrency}
                                searchQuery={searchQuery}
                            />

                            {/* Preview B - CSV Table */}
                            <PreviewB
                                transactions={visibleTransactions}
                                selectedTxIndex={selectedTxIndex}
                                setSelectedTxIndex={setSelectedTxIndex}
                                formatDate={formatDate}
                                searchQuery={searchQuery}
                            />
                        </div>
                    </div>
                )}            </div>

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
