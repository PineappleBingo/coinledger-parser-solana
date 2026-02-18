# Transaction Analysis Report

**Generated:** February 18, 2026  
**Wallet:** xP1rrkVZ7g7Ten349zRDhJCvKfW8ak5LyAw11dBupRa  
**Analysis Tool:** Solana Tax Bridge v2.0

---

## 📊 Executive Summary

This report documents the current transaction analysis capabilities, classification system, and tax reporting workflow for the Solana Tax Bridge.

### Current Classification System:

| Type | Taxable? | Label in CoinLedger |
|------|----------|---------------------|
| **Trade** | ✅ Yes | Trade |
| **Deposit** | ⚠️ Depends | Deposit |
| **Withdrawal** | ⚠️ Depends | Withdrawal |
| **Income** | ✅ Yes | Income |
| **Rent Recovery** | ✅ Yes | Income |
| **Staking** | ✅ Yes | Staking |
| **Airdrop** | ✅ Yes | Airdrop/Income |
| **NFT Mint** | ✅ Yes | Trade |
| **Investment Loss** | ✅ Yes | Investment Loss |
| **Theft Loss** | ⚠️ Depends | Theft Loss |
| **Casualty Loss** | ⚠️ Depends | Casualty Loss |
| **Spam Dust** | ❌ No | **Ignored** |

---

## 🔍 Transaction Type Details

### Trade (DEX Swap)
- Send Token A, receive Token B (both with value)
- Through Raydium, Jupiter, Orca, etc.
- **Tax**: Disposal triggers capital gains/loss; acquisition establishes new cost basis

### Deposit (Incoming)
- Only receive tokens; nothing sent
- **Tax**: Internal transfers = not taxable; Airdrops/payments = taxable as income at FMV

### Withdrawal (Outgoing)
- Only send tokens; nothing received
- **Tax**: Internal transfers = not taxable; Payments for goods/services = taxable disposal

### 🚫 Spam / Dusting Attack → Ignored
- Unsolicited tokens with zero or minimal value
- Zero-amount or UNKNOWN token indicators
- **Tax**: Mark as **Ignored** in CoinLedger — completely excluded from all reports
- **Security**: Never interact with spam tokens (phishing risk)
- **Handling**: Use spam filter toggle in preview controls to show/hide

### 🏠 Rent Recovery (Account Closure)
- ~0.002 SOL returned from closing Solana token accounts
- Explicitly NOT marked as spam
- **Tax**: Classified as Income; establishes new cost basis at FMV
- Automatically detected by the system

### Loss Types
- **Investment Loss**: Sold at significant loss (>50% or >$100)
- **Theft Loss**: Unauthorized transfers, wallet compromises
- **Casualty Loss**: Protocol exploits, rug pulls

---

## 🛡️ Spam Detection System

### Detection Methods:

| Method | Description |
|--------|-------------|
| **Heuristic** | Rule-based: zero-amount, UNKNOWN token, small value detection |
| **AI (Gemini)** | Optional: smarter classification using Gemini API |

### Current Settings:
- **Toggle**: `Use AI Classification & Spam Filter` checkbox
  - 🤖 **ON**: Gemini AI for smarter spam detection + transaction classification
  - ⚡ **OFF**: Rule-based heuristic only (faster, no API key needed)
- **Spam Filter**: Toggle in preview controls to show/hide spam from Preview A & B
- **Download**: JSON includes ALL transactions (spam + legitimate) regardless of filter state
- **Upload**: Re-evaluates spam using heuristic detection on unclassified transactions

### Spam Scoring Rules:
1. Zero-amount transfer → spamScore +1.0
2. UNKNOWN token name → spamScore +0.4
3. Rent recovery (isSpam explicitly `false`) → protected from spam detection
4. Threshold configurable via `SPAM_FILTER_THRESHOLD` env var

---

## 📋 UI Preview System

### Preview A — Interactive Transaction Cards
- Expandable cards with token images
- Type badge with tooltip (hover ℹ️ for education)
- Spam transactions show `🚫 Ignored` with gray strikethrough
- Copy-to-clipboard for TxHash
- Solscan verification links
- Search bar for filtering by hash
- Cost analysis tab with gain/loss

### Preview B — CSV Table View
- Tabular format matching CoinLedger import schema
- Same `🚫 Ignored` label for spam rows
- Sortable columns

### Global Controls (Preview Header):
- **Spam Toggle**: Show/hide ignored transactions (with count badge)
- **UTC/Local**: Timezone switch
- **USD/SOL**: Currency display switch

---

## 💾 Data Management

### Download
- Saves ALL transactions as JSON (including spam)
- Includes: wallet address, fetch timestamp, filters, transactions, summary, stats
- Filename: `helius-data-{wallet}-{timestamp}.json`

### Upload
- Loads cached JSON data
- Re-evaluates unclassified transactions with heuristic spam detection
- Button disabled during active data fetch
- Shows cache status indicator with timestamp

---

## 🎯 CoinLedger Reporting Guidelines

### What TO Include:
✅ All trades/swaps with value  
✅ Legitimate airdrops with FMV > $0  
✅ Income/payments received  
✅ Staking rewards  
✅ NFT purchases/sales  
✅ Rent recovery (as Income)  

### What to Mark as Ignored:
🚫 Spam tokens (Ignored in CoinLedger)  
🚫 Zero-value dust attacks  
🚫 Unknown tokens you didn't request  

### What NOT to Include:
❌ Internal transfers between your own wallets  
❌ Failed transactions  

---

## 🛡️ Security Recommendations

### For Spam Tokens:
1. ✅ **Don't interact** — Never sell, swap, or click links
2. ✅ **Hide in wallet** — Use Phantom/Solflare's hide feature
3. ✅ **Mark as Ignored** — In CoinLedger for tax purposes
4. ✅ **Burn for rent** — Optional: use Sol Incinerator to reclaim ~0.002 SOL rent

### General Security:
1. 🔒 Use hardware wallet for significant holdings
2. 📝 Track deposit sources for tax documentation
3. 🔄 Review transactions monthly
4. 💼 Separate wallets (trading / holdings / burner)

---

## 📖 Additional Resources

- [TRANSACTION_TYPES_GUIDE.md](./TRANSACTION_TYPES_GUIDE.md) — Full transaction type documentation
- [Solscan](https://solscan.io) — Verify transactions on blockchain
- [CoinLedger Help](https://help.coinledger.io) — Tax reporting guidance
- Hover over ℹ️ icon in Preview A for contextual tooltips

---

## ⚠️ Disclaimers

**Tax**: Educational only — consult a licensed CPA for tax advice.  
**Data**: Transaction data from Helius RPC/DAS API; prices may have gaps.  
**Security**: Spam tokens indicate your address may be on scammer lists.

---

**Report Generated By:** Solana Tax Bridge v2.0  
**Last Updated:** February 18, 2026
