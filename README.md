# Solana Tax Bridge 🚀

**Automated Meme Coin Transaction Parser for CoinLedger**

A powerful Next.js application that extracts Solana wallet transactions, applies AI-powered spam filtering, discovers token prices, and exports to Google Sheets in CoinLedger's Universal Import format.

![Status](https://img.shields.io/badge/status-production-green)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## ✨ Features

- 🔍 **Solscan Integration**: Fetch transactions directly from Solscan API v2.0
- 🤖 **AI-Powered Filtering**: Gemini Flash detects spam tokens and classifies transactions
- 💰 **Price Discovery**: Automatic price lookup via Jupiter & Birdeye APIs
- 📊 **Google Sheets Export**: Batch export to CoinLedger format with quota management
- 🎨 **Modern UI**: Beautiful glassmorphism design with dark mode
- ⚡ **One-Click Sync**: Complete pipeline from blockchain to spreadsheet
- 🛡️ **Local-First Security**: All processing happens locally, no third-party data sharing

---

## 🏗️ Architecture

```
┌─────────────┐
│   User UI   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│     Next.js API Routes              │
│  ┌─────────────────────────────┐   │
│  │ /api/fetch-transactions     │   │
│  │ /api/export-sheets          │   │
│  │ /api/sync (orchestrator)    │   │
│  └─────────────────────────────┘   │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│     Core Library Modules            │
│  ┌──────────────────────────────┐  │
│  │ solana-parser.ts             │  │
│  │ ai-filter.ts (Gemini)        │  │
│  │ price-discovery.ts           │  │
│  │ google-sheets.ts             │  │
│  │ solscan-client.ts            │  │
│  └──────────────────────────────┘  │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│     External APIs                   │
│  • Solscan API v2.0                 │
│  • Jupiter Price API                │
│  • Birdeye API                      │
│  • Google Gemini AI                 │
│  • Google Sheets API                │
└─────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm or yarn
- Google Cloud Project with Sheets API enabled
- Solscan API key
- Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   cd /home/pineapplebingodev/gitprojects/coinledger-parser-solana
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run setup script**
   ```bash
   npm run setup
   ```

   This will guide you through:
   - Creating Google Service Account credentials
   - Configuring API keys
   - Setting up `.env.local`

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   ```
   http://localhost:3000
   ```

---

## 🔑 API Keys Setup

### 1. Solscan API Key

1. Visit [https://pro.solscan.io/](https://pro.solscan.io/)
2. Sign up for an account
3. Generate API key
4. Add to `.env.local`: `SOLSCAN_API_KEY=your_key_here`

### 2. Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or select existing)
3. Enable **Google Sheets API**
4. Create **Service Account** credentials
5. Download JSON key file
6. Save as `.credentials/credentials.json`
7. Share your Google Sheet with the service account email

### 3. Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Add to `.env.local`: `GEMINI_API_KEY=your_key_here`

### 4. Birdeye API (Optional)

1. Visit [Birdeye](https://birdeye.so/)
2. Sign up and get API key
3. Add to `.env.local`: `BIRDEYE_API_KEY=your_key_here`

---

## 📝 Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Required
SOLSCAN_API_KEY=your_solscan_api_key
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CREDENTIALS={"type":"service_account",...}
GOOGLE_SHEET_ID=your_google_sheet_id

# Optional
BIRDEYE_API_KEY=your_birdeye_api_key
TARGET_WALLET_ADDRESS=xP1rrkVZ7g7Ten349zRDhJCvKfW8ak5LyAw11dBupRa
SPAM_FILTER_THRESHOLD=0.5
SHEETS_BATCH_SIZE=10
```

---

## 🎯 Usage

### Method 1: One-Click Sync (Recommended)

1. Enter wallet address
2. Set date range (optional)
3. Click **"⚡ One-Click Sync to Sheets"**
4. Done! Transactions are automatically exported

### Method 2: Preview Before Export

1. Enter wallet address
2. Click **"🔍 Fetch & Preview"**
3. Review transactions in the table
4. Click **"📤 Export to Sheets"**

### Configuration Options

- **Use AI Classification**: Enable Gemini-powered spam detection and transaction categorization
- **Include Spam Transactions**: Show spam tokens in results
- **Transaction Limit**: Max number of transactions to fetch (1-1000)
- **Date Range**: Filter transactions by start/end date

---

## 📊 CoinLedger Format

The system exports transactions in CoinLedger's Universal Import format:

| Column | Description | Example |
|--------|-------------|---------|
| Date (UTC) | Transaction timestamp | 04/20/2024 14:30:00 |
| Platform | Exchange/DEX name | Raydium |
| Asset Sent | Token sold | SOL |
| Amount Sent | Quantity sold | 0.5 |
| Asset Received | Token bought | BONK |
| Amount Received | Quantity bought | 1000000 |
| Fee Currency | Fee token | SOL |
| Fee Amount | Fee paid | 0.000005 |
| Type | Transaction type | Trade |
| Description | Human-readable description | Swapped 0.5 SOL for 1M BONK |
| TxHash | Transaction hash | 5Kq7... |

---

## 🤖 AI Features

### Spam Detection

The AI analyzes tokens for spam indicators:
- Suspicious keywords ("claim", "visit", "winner")
- Extremely low value (<$0.0001)
- Unsolicited airdrops
- Excessive special characters
- Known scam token patterns

### Transaction Classification

Automatically categorizes transactions:
- **Trade**: Swaps, buys, sells
- **Income**: Staking rewards, airdrops
- **Deposit**: Wallet transfers in
- **Withdrawal**: Wallet transfers out
- **Gift Sent/Received**: Gifts
- **Merchant Payment**: Payments

---

## 🛠️ Development

### Project Structure

```
coinledger-parser-solana/
├── app/
│   ├── api/
│   │   ├── fetch-transactions/route.ts
│   │   ├── export-sheets/route.ts
│   │   └── sync/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── types.ts
│   ├── solana-parser.ts
│   ├── ai-filter.ts
│   ├── price-discovery.ts
│   ├── google-sheets.ts
│   └── solscan-client.ts
├── scripts/
│   └── setup-google-auth.js
├── .env.example
├── package.json
└── README.md
```

### Available Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
npm run setup     # Run setup wizard
```

---

## 🔒 Security

- ✅ **Local-First**: All processing happens on your machine
- ✅ **No Third-Party Sharing**: API keys never leave your environment
- ✅ **Service Account Auth**: Secure Google Sheets access
- ✅ **Environment Variables**: Sensitive data in `.env.local` (gitignored)
- ✅ **HTTPS Only**: Production deployment uses HTTPS

### Important Notes

- Never commit `.env.local` or `.credentials/` to version control
- Keep your API keys secure
- Share Google Sheets only with your service account email
- Review transactions before exporting

---

## 📈 Performance

- **Batch Processing**: Transactions processed in chunks of 10
- **Rate Limiting**: Automatic delays to avoid API quotas
- **Retry Logic**: Exponential backoff for failed requests
- **Caching**: Token metadata cached to reduce API calls
- **Parallel Processing**: Price discovery runs concurrently

### Quota Limits

| Service | Free Tier | Rate Limit |
|---------|-----------|------------|
| Solscan API | 5,000 req/day | 10 req/sec |
| Gemini Flash | 1,500 req/day | 15 req/min |
| Google Sheets | 300 req/min | Per project |
| Jupiter API | Unlimited | No limit |

---

## 🐛 Troubleshooting

### "SOLSCAN_API_KEY not configured"

- Check `.env.local` exists and contains `SOLSCAN_API_KEY`
- Restart development server after adding env vars

### "Google Sheets authentication failed"

- Verify `credentials.json` is in `.credentials/` directory
- Check `GOOGLE_CREDENTIALS` in `.env.local` is valid JSON
- Ensure Sheets API is enabled in Google Cloud Console

### "No price data found"

- Some new tokens may not have price data yet
- Try enabling Birdeye API for historical prices
- Manually review transactions with missing prices

### "Rate limit exceeded"

- Reduce transaction limit
- Increase `SHEETS_BATCH_SIZE` delay
- Wait 24 hours for quota reset

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- [Solscan](https://solscan.io/) - Solana blockchain explorer
- [Jupiter](https://jup.ag/) - Solana DEX aggregator
- [Birdeye](https://birdeye.so/) - Crypto analytics
- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI model
- [CoinLedger](https://coinledger.io/) - Tax reporting platform

---

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review technical specification in `technical_specification.md`

---

**Built with ❤️ for the Solana community**