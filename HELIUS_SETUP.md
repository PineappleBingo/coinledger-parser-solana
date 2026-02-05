# 🚀 Helius API Setup Guide

## Quick Setup (5 minutes)

### Step 1: Get FREE Helius API Key

1. **Visit**: https://www.helius.dev/
2. **Click "Start Building"** or "Sign Up"
3. **Create Account** (Google/GitHub login available)
4. **Create a Project**:
   - Click "Create New Project"
   - Name: "Solana Tax Bridge"
   - Network: Mainnet
5. **Copy API Key** from the dashboard

### Step 2: Update .env File

Add your Helius API key to `.env`:

```bash
HELIUS_API_KEY=your_actual_api_key_here
HELIUS_RPC_URL=https://mainnet.helius-rpc.com
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Test

```bash
npm run dev
```

Then click "🔍 Fetch & Preview" in the browser.

---

## ✅ What You Get (Free Tier)

- **1,000,000 credits/month** - More than enough for tax reporting
- **10 requests/second** - Fast and reliable
- **Parsed transactions** - Easy to work with
- **Token metadata** - Automatic symbol/name lookup
- **No blocking** - Works perfectly from code

---

## 🆚 Helius vs Solscan

| Feature | Helius | Solscan |
|---------|--------|---------|
| Free Tier | 1M credits/month | Blocked by Cloudflare |
| Rate Limit | 10 req/sec | N/A (403 errors) |
| Programmatic Access | ✅ Yes | ❌ No |
| Parsed Transactions | ✅ Built-in | ❌ N/A |
| Setup Time | 5 minutes | Doesn't work |

---

## 🔧 Technical Details

### API Endpoints Used

1. **getSignaturesForAddress** - Get transaction signatures
2. **getParsedTransaction** - Get parsed transaction details
3. **getAsset** - Get token metadata (DAS API)

### Rate Limiting

- The code automatically enforces a 60-second delay between batches
- Helius free tier allows 10 req/sec, but we're conservative
- Test mode limits to 10 transactions

### Error Handling

The code includes:
- ✅ Automatic retries with exponential backoff
- ✅ Detailed error messages
- ✅ Graceful degradation for missing data
- ✅ Rate limit protection

---

## 📊 Credit Usage

### Estimate for Test Mode (10 transactions)
- Get signatures: ~10 credits
- Get parsed transactions: ~100 credits (10 tx × 10 credits each)
- Total: ~110 credits

### Full Wallet Scan (1000 transactions)
- Get signatures: ~100 credits
- Get parsed transactions: ~10,000 credits
- Total: ~10,100 credits

**With 1M free credits, you can process ~99 full wallet scans per month!**

---

## 🎯 Next Steps

1. ✅ Get Helius API key
2. ✅ Update `.env` with your key
3. ✅ Run `npm install`
4. ✅ Start dev server: `npm run dev`
5. ✅ Test with "Fetch & Preview"

---

**Status**: Ready to use Helius API 🚀
