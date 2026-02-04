# Solana Tax Bridge - Quick Start Guide

## 🚀 Installation (5 Minutes)

### Step 1: Install Dependencies
```bash
cd /home/pineapplebingodev/gitprojects/coinledger-parser-solana
npm install
```

### Step 2: Get API Keys

#### Solscan API Key (Required)
1. Visit: https://pro.solscan.io/
2. Sign up and generate API key
3. Copy the key

#### Gemini API Key (Required)
1. Visit: https://makersuite.google.com/app/apikey
2. Create API key
3. Copy the key

#### Google Service Account (Required)
1. Visit: https://console.cloud.google.com/apis/credentials
2. Create new project or select existing
3. Enable "Google Sheets API"
4. Create Service Account
5. Download JSON key file
6. Save as `.credentials/credentials.json`

### Step 3: Run Setup
```bash
npm run setup
```

Follow the prompts to configure your API keys.

### Step 4: Create Google Sheet

1. Create a new Google Sheet
2. Copy the Sheet ID from URL:
   ```
   https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
   ```
3. Share the sheet with your service account email (found in credentials.json)
4. Add Sheet ID to `.env.local`:
   ```
   GOOGLE_SHEET_ID=your_sheet_id_here
   ```

### Step 5: Start Application
```bash
npm run dev
```

Open http://localhost:3000

---

## 📝 Usage

### One-Click Sync (Easiest)

1. Enter wallet address (default: xP1rrkVZ7g7Ten349zRDhJCvKfW8ak5LyAw11dBupRa)
2. Optional: Set date range
3. Click "⚡ One-Click Sync to Sheets"
4. Wait for completion
5. Check your Google Sheet!

### Preview Before Export

1. Enter wallet address
2. Click "🔍 Fetch & Preview"
3. Review transactions in table
4. Click "📤 Export to Sheets"

---

## ⚙️ Configuration

### Environment Variables (.env.local)

```bash
# Required
SOLSCAN_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
GOOGLE_CREDENTIALS={"type":"service_account",...}
GOOGLE_SHEET_ID=your_sheet_id

# Optional
BIRDEYE_API_KEY=your_key_here
SPAM_FILTER_THRESHOLD=0.5
SHEETS_BATCH_SIZE=10
```

### Options

- **Use AI Classification**: Enable smart spam detection (recommended)
- **Include Spam**: Show spam tokens in results
- **Transaction Limit**: 1-1000 (default: 100)
- **Date Range**: Filter by start/end date

---

## 🐛 Common Issues

### "API key not configured"
→ Check `.env.local` exists and contains all required keys
→ Restart dev server: `npm run dev`

### "Google Sheets authentication failed"
→ Verify `.credentials/credentials.json` exists
→ Check service account email has access to sheet

### "No transactions found"
→ Verify wallet address is correct
→ Check date range includes transactions
→ Ensure Solscan API key is valid

---

## 📊 Output Format

Transactions are exported to Google Sheets in CoinLedger format:

| Date (UTC) | Platform | Asset Sent | Amount Sent | Asset Received | Amount Received | Type | TxHash |
|------------|----------|------------|-------------|----------------|-----------------|------|--------|
| 04/20/2024 14:30:00 | Raydium | SOL | 0.5 | BONK | 1000000 | Trade | 5Kq7... |

---

## 🎯 Next Steps

1. Review exported transactions in Google Sheet
2. Import CSV to CoinLedger
3. Verify tax calculations
4. Adjust spam filter threshold if needed

---

**Need help?** Check README.md for detailed documentation.
