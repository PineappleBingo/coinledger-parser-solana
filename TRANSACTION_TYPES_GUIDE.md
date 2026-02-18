# Solana Transaction Types: Educational Guide

## 📚 Understanding Your Solana Transactions

This guide explains the different types of transactions you'll encounter on the Solana blockchain, how to identify them, and their tax implications for CoinLedger reporting.

---

## 🎯 Transaction Types Overview

### 1. **Trade (Swap/Exchange)**

**What it is:**
A trade involves exchanging one token for another, typically through a decentralized exchange (DEX) like Jupiter, Raydium, or Orca.

**How to identify:**
- You send one token (Asset Sent)
- You receive a different token (Asset Received)
- Both amounts have value
- Usually happens through a DEX protocol

**Tax Implications:**
- **Taxable Event**: Yes
- This is a disposal of one asset and acquisition of another
- Capital gains/losses calculated on the asset you sold
- Cost basis for the received asset is its fair market value at time of receipt

**Example:**
```
Sent: 100 USDC
Received: 0.5 SOL
Type: Trade
```

**CoinLedger Handling:**
Label as "Trade" in the Type column. Both Asset Sent and Asset Received fields populated.

---

### 2. **Deposit (Incoming Transfer)**

**What it is:**
Tokens arriving in your wallet from another address without you sending anything in return.

**How to identify:**
- Asset Received has value
- Asset Sent is empty or negligible
- Common sources: transfers from exchanges, payments, airdrops

**Tax Implications:**
- **Taxable Event**: Depends on source
- From your own wallet: No tax (internal transfer)
- From exchange withdrawal: No tax (just moving assets)
- From airdrop/reward: Yes - counted as income
- From payment: Yes - counted as income

**Example:**
```
Sent: -
Received: 1000 USDC
Type: Deposit
```

**CoinLedger Handling:**
- If from exchange → Label as "Deposit" (non-taxable transfer)
- If earned/airdrop → Label as "Airdrop" or "Income"

---

### 3. **Withdrawal (Outgoing Transfer)**

**What it is:**
Tokens leaving your wallet to another address without receiving anything in return.

**How to identify:**
- Asset Sent has value
- Asset Received is empty
- Common destinations: sending to exchanges, moving to cold storage, payments

**Tax Implications:**
- **Taxable Event**: Depends on purpose
- To your own wallet: No tax (internal transfer)
- To exchange deposit: No tax (just moving assets)
- As payment/gift: Yes - capital gains on appreciated assets
- Selling for fiat: Yes - capital gains

**Example:**
```
Sent: 0.5 SOL
Received: -
Type: Withdrawal
```

**CoinLedger Handling:**
- If to your own wallet → Label as "Withdrawal" (non-taxable transfer)
- If as payment → Calculate cost basis and gains

---

### 4. **🚫 Spam / Dusting Attack → Ignored**

**What it is:**
Unsolicited tiny amounts of tokens sent to your wallet, often for tracking, phishing, or promotional purposes.

**How to identify:**
- Very small or zero value received
- Token you didn't request
- Often labeled "UNKNOWN" or has suspicious name
- No corresponding send transaction
- May have scam-related token names or symbols

**Common Patterns:**
1. **Dusting Attack**: Tiny amounts (<$0.01) to track wallet activity
2. **Spam NFTs**: Unsolicited NFT mints with phishing links
3. **Fake Tokens**: Tokens with names mimicking popular projects
4. **Airdrop Scams**: Tokens requiring you to "claim" via malicious website

**Example:**
```
Transaction: 3bfiP2q...fGat
Date: 2025-12-25 14:59:29
Sent: -
Received: 0 UNKNOWN
Label: 🚫 Ignored (Spam Dust)
```

**Tax Implications:**
- **Taxable Event**: No — mark as **Ignored** in CoinLedger
- CoinLedger's "Ignored" classification completely excludes transactions from tax reports
- No capital gains, no income, no cost basis tracking
- **Best Practice**: Always mark spam dust as "Ignored"

**How to Handle in CoinLedger:**
1. Navigate to **Transactions** page
2. Find the spam transaction
3. Click the **three dots (...)** → Select **Ignore**
4. Transaction appears crossed out and is excluded from all tax calculations
5. For multiple spam transactions: Use **Bulk Actions** → **Ignore**

**Security Risks:**
⚠️ **NEVER interact with spam tokens:**
- Don't visit linked websites — these are phishing scams
- Don't try to sell or swap spam tokens — malicious contracts may drain your wallet
- Don't connect wallet to "claim" pages
- **Just Ignore**: Hide in your wallet (Phantom/Solflare) and mark as Ignored in CoinLedger

**Reclaiming Rent (Advanced):**
If you have many spam tokens, you can burn them to reclaim ~0.002 SOL rent per token:
- Use tools like "Sol Incinerator" or Phantom's built-in burn feature
- The reclaimed SOL is classified as **Income** (Rent Recovery)
- See Section 8: Rent Recovery for details

**CoinLedger Handling:**
- **Label as**: "Ignored" (not Income, not Airdrop)
- Completely excluded from tax reports and calculations
- Our system automatically labels spam as 🚫 Ignored in previews

---

### 5. **Staking Rewards**

**What it is:**
Tokens earned by staking your assets on validators or DeFi protocols.

**How to identify:**
- Small regular amounts received
- From known staking contracts
- Same token as what you staked
- Occurs at regular intervals

**Tax Implications:**
- **Taxable Event**: Yes - counted as income
- Taxed at fair market value when received
- Establishes cost basis for future sales

**Example:**
```
Sent: -
Received: 0.05 SOL
Type: Staking
Source: Validator rewards
```

**CoinLedger Handling:**
Label as "Staking" in Type column. Fair market value at time of receipt is taxable income.

---

### 6. **NFT Mint / Purchase**

**What it is:**
Creating or purchasing a non-fungible token (NFT).

**How to identify:**
- Sent: SOL or other token for payment
- Received: NFT (shows as 1 unit of unique token)
- Transaction involves NFT marketplace or minting program

**Tax Implications:**
- **Taxable Event**: Depends
- Minting with SOL: Yes - disposal of SOL (capital gains)
- Buying with crypto: Yes - disposal of crypto used to pay
- Cost basis for NFT is the FMV of what you paid

**Example:**
```
Sent: 2 SOL
Received: 1 Degen Ape NFT
Type: Trade
```

**CoinLedger Handling:**
Label as "Trade". Asset sent is payment token, asset received is NFT identifier.

---

### 7. **Income / Airdrops**

**What it is:**
Legitimate tokens received as rewards, airdrops, or payments for services.

**How to identify:**
- Received tokens without sending anything
- From legitimate project airdrops
- Payment for goods/services
- Has actual market value

**Tax Implications:**
- **Taxable Event**: Yes - counted as ordinary income
- Taxed at fair market value when received
- If earned as compensation: subject to self-employment tax

**Example:**
```
Sent: -
Received: 500 JUP (Jupiter Airdrop)
Type: Airdrop
Value at receipt: $250
```

**CoinLedger Handling:**
Label as "Airdrop" or "Income". Must report FMV as income on tax return.

---

### 8. **🏠 Rent Recovery (Account Closure)**

**What it is:**
SOL returned from closing a Solana token account. Solana requires ~0.00203928 SOL as rent-exempt deposit when creating a token account. When the account is closed (e.g., after selling all of a token), this rent is returned to your wallet.

**How to identify:**
- Small SOL amount received (~0.002 SOL)
- No token sent or received
- Transaction involves `CloseAccount` instruction
- Originated from a token account you own

**Tax Implications:**
- **Taxable Event**: Yes - classified as Income
- The returned SOL establishes a new cost basis at fair market value when received
- Typically very small amounts ($0.30-$0.50)

**Example:**
```
Sent: -
Received: 0.00203928 SOL
Type: Income
Description: Rent recovery: 0.002039 SOL
```

**CoinLedger Handling:**
Label as "Income". The system automatically detects rent recovery and classifies it correctly. These are explicitly NOT marked as spam.

---

## 🔍 How to Identify Spam Transactions

### Visual Indicators:
1. ✅ **Token Symbol**: "UNKNOWN" or suspicious names
2. ✅ **Amount**: Zero or extremely small ($0.0001)
3. ✅ **Source**: Unknown sender address
4. ✅ **Frequency**: One-time unsolicited transfer
5. ✅ **Market Data**: No price data available

### Red Flags:
⚠️ Token name contains:
- "Airdrop", "Claim", "Free", "Bonus"
- Website URLs
- Promises of rewards
- Misspellings of popular tokens (e.g., "Soolana" instead of "Solana")

⚠️ Transaction instructions include:
- Links to external websites
- "Claim now" messages
- Time-limited offers

---

## 💡 Best Practices

### For Tax Reporting:
1. **Use AI Spam Filter**: Enable in settings to automatically detect spam
2. **Manual Review**: Check flagged transactions before export
3. **Document Decisions**: Note why you excluded spam transactions
4. **Be Conservative**: When in doubt, include it (even at $0 value)

### For Security:
1. **Never Click Spam Links**: Ignore all unsolicited tokens
2. **Don't Try to Sell Spam**: May trigger contract that drains wallet
3. **Use Hardware Wallet**: For significant holdings
4. **Revoke Approvals**: Regularly check and revoke token approvals

### For CoinLedger Import:
1. **Filter Spam**: Use "Include Spam Transactions" toggle carefully
2. **Review Preview**: Check Preview A and B before export
3. **Verify Amounts**: Ensure token amounts match blockchain
4. **Check Dates**: Confirm UTC timestamps are correct

---

## 📊 Transaction Classification Decision Tree

```
Did you receive tokens?
├─ YES
│  ├─ Did you send tokens in same transaction?
│  │  ├─ YES → Trade
│  │  └─ NO
│  │     ├─ Did you request/expect this?
│  │     │  ├─ YES
│  │     │  │  ├─ From your wallet → Deposit
│  │     │  │  ├─ Airdrop from project → Airdrop/Income
│  │     │  │  └─ Staking rewards → Staking
│  │     │  └─ NO
│  │     │     ├─ Has value → Research (possible airdrop)
│  │     │     └─ No/minimal value → Spam
│  │     ├─ Is it ~0.002 SOL from account closure?
│  │     │  └─ YES → Rent Recovery (Income)
└─ NO (only sent)
   └─ Withdrawal or Fee
```

---

## 🎓 Your Transaction Analysis

**Transaction Hash:** `3bfiP2qXkU6RvWWU2B1tGKgaHAw9C4phARbMTiW5RpgNWiNzN6FcBNEbXgWZUzzNNF1VDBRt19qWRSFRTpgtfGat`

**Classification:** ⚠️ **SPAM DUSTING**

**Analysis:**
- **Received:** 0 UNKNOWN tokens
- **Sent:** Nothing
- **Value:** $0.00
- **Solscan Label:** SPAM Dusting

**Explanation:**
This is a classic dusting attack. Someone sent you worthless tokens (0 quantity) to:
1. Track your wallet activity across different addresses
2. Attempt phishing by including malicious metadata
3. Spam promotional material

**Tax Treatment:**
❌ **Exclude from tax report**
- Zero value received
- Clearly unsolicited spam
- No market for token
- Would add unnecessary complexity to tax filing

**Action Required:**
✅ Leave it alone - do not interact
✅ Enable spam filter for future transactions
✅ This transaction will be filtered out by AI if "Include Spam" is unchecked

---

## 📝 Summary Table

| Type | Sent | Received | Taxable? | Report As |
|------|------|----------|----------|-----------|
| **Trade** | Token A | Token B | ✅ Yes | Trade |
| **Deposit** | - | Tokens | ⚠️ Depends | Deposit |
| **Withdrawal** | Tokens | - | ⚠️ Depends | Withdrawal |
| **Spam Dust** | - | $0 tokens | ❌ No | **Ignored** |
| **Staking** | - | Rewards | ✅ Yes | Staking |
| **Airdrop** | - | Tokens | ✅ Yes | Airdrop/Income |
| **NFT Mint** | Payment | NFT | ✅ Yes | Trade |
| **Rent Recovery** | - | ~0.002 SOL | ✅ Yes | Income |
| **Investment Loss** | Token | Less value | ✅ Yes | Investment Loss |
| **Theft Loss** | Token | - (stolen) | ⚠️ Depends | Theft Loss |
| **Casualty Loss** | Token | - (exploit) | ⚠️ Depends | Casualty Loss |

---

## 🔗 Additional Resources

- **IRS Virtual Currency Guidance**: [irs.gov/cryptocurrency](https://www.irs.gov/businesses/small-businesses-self-employed/virtual-currencies)
- **CoinLedger Support**: [help.coinledger.io](https://help.coinledger.io)
- **Solana Explorer**: [solscan.io](https://solscan.io)
- **Token Security**: [rugcheck.xyz](https://rugcheck.xyz)

---

## ⚖️ Legal Disclaimer

This guide is for educational purposes only and does not constitute tax, legal, or financial advice. Cryptocurrency taxation is complex and varies by jurisdiction. Always consult with a qualified tax professional or CPA familiar with cryptocurrency taxation before making tax-related decisions.

---

**Last Updated:** February 18, 2026
**Version:** 2.0
**Maintained by:** Solana Tax Bridge Project
