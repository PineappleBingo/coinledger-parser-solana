# 🧪 Test Mode Guide

## Current Configuration

Your `.env` file is configured for **TEST MODE**:

```bash
TEST_MODE=true
TEST_TRANSACTION_LIMIT=10
SOLSCAN_RATE_LIMIT_SECONDS=60
```

## What This Means

### 1. Transaction Limit
- **Maximum transactions**: 10 (regardless of UI input)
- **Purpose**: Safe testing without overwhelming the system
- **Override**: Set `TEST_MODE=false` to remove limit

### 2. Rate Limiting
- **Solscan API**: 1 request per 60 seconds
- **Automatic**: System enforces delays between requests
- **Logging**: Console shows countdown timer

## Testing Steps

### Step 1: Start Development Server
```bash
npm run dev
```

### Step 2: Open Browser
```
http://localhost:3000
```

### Step 3: Verify Test Mode
Look for this banner in the UI:
```
🧪 TEST MODE ENABLED - Limited to 10 transactions
```

### Step 4: Fetch Transactions
1. Click "🔍 Fetch & Preview"
2. Watch console for rate limiting messages:
   ```
   ⏳ Rate limit: Waiting 60s before next Solscan API call...
   📡 Solscan API Request #1
   Fetching page 1 (0/10 transactions)...
   ✓ Fetched 10 transactions (total: 10)
   ```

### Step 5: Review Results
- Check transaction preview table
- Verify only 10 transactions loaded
- Review spam detection results
- Check price discovery success rate

### Step 6: Test Export (Optional)
1. Click "📤 Export to Sheets"
2. Verify 10 rows written to Google Sheet
3. Check CoinLedger format is correct

## Expected Timing

With rate limiting enabled:
- **First request**: Immediate
- **Subsequent requests**: 60-second delay each
- **Total time for 10 transactions**: ~1-2 minutes (depends on pagination)

## Console Output Example

```
🧪 TEST MODE ENABLED: Limiting transactions to 10
📡 Solscan API Request #1
Fetching page 1 (0/10 transactions)...
✓ Fetched 10 transactions (total: 10)

📊 Total transactions fetched: 10

⚠️  TEST MODE: Review these 10 transactions before proceeding.
```

## Disabling Test Mode

To fetch full transaction history:

1. **Edit `.env`**:
   ```bash
   TEST_MODE=false
   # TEST_TRANSACTION_LIMIT=10  # This will be ignored
   ```

2. **Restart server**:
   ```bash
   # Press Ctrl+C to stop
   npm run dev
   ```

3. **Verify in UI**:
   - Test mode banner should disappear
   - Transaction limit input will be respected

## Rate Limiting Behavior

### Current Setting (60 seconds)
- **Safe for free tier**: Avoids quota issues
- **Recommended for testing**: Prevents accidental overuse

### Adjusting Rate Limit
```bash
# Faster (use with caution)
SOLSCAN_RATE_LIMIT_SECONDS=30

# Slower (extra safe)
SOLSCAN_RATE_LIMIT_SECONDS=120
```

## Troubleshooting

### "Rate limit: Waiting 60s..."
✅ **Normal behavior** - System is protecting your API quota

### "TEST MODE: Limiting to 10"
✅ **Expected** - Test mode is working correctly

### Want to test with different limits?
```bash
# Test with 5 transactions
TEST_TRANSACTION_LIMIT=5

# Test with 20 transactions
TEST_TRANSACTION_LIMIT=20
```

## Next Steps After Testing

Once you've verified the system works with 10 transactions:

1. **Disable test mode**: `TEST_MODE=false`
2. **Set desired limit**: Use UI input (1-1000)
3. **Run full sync**: Process complete wallet history
4. **Monitor console**: Watch for any errors
5. **Review results**: Check Google Sheet output

## Important Notes

⚠️ **Rate Limiting is ALWAYS Active**
- Even with `TEST_MODE=false`, rate limiting applies
- This protects your Solscan API quota
- Cannot be disabled (hardcoded protection)

✅ **Test Mode is Recommended**
- Always test with small datasets first
- Verify AI spam detection accuracy
- Check price discovery success rate
- Confirm Google Sheets export works

🔒 **API Quotas**
- Solscan Free: 5,000 requests/day
- With 60s rate limit: Max 1,440 requests/day
- Well within free tier limits

---

**Current Status**: ✅ Ready for testing with 10 transactions
**Next Command**: `npm run dev`
