import { createHeliusConnection } from './lib/helius-client';
import { extractTokenTransfers } from './lib/solscan-client';
import * as fs from 'fs';
import * as path from 'path';

// Read .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');

for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.substring(0, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();

    if (key && !process.env[key]) {
        process.env[key] = value;
    }
}

const TX_HASH = '3bfiP2qXkU6RvWWU2B1tGKgaHAw9C4phARbMTiW5RpgNWiNzN6FcBNEbXgWZUzzNNF1VDBRt19qWRSFRTpgtfGat';
const WALLET = 'xP1rrkVZ7g7Ten349zRDhJCvKfW8ak5LyAw11dBupRa';

async function analyzeSpamDustTransaction() {
    console.log('🔍 Analyzing Spam Dust Transaction');
    console.log('='.repeat(60));
    console.log(`TX Hash: ${TX_HASH`);
    console.log(`Wallet: ${ WALLET }\n`);

    const connection = createHeliusConnection();

    try {
        const tx = await connection.getParsedTransaction(TX_HASH, {
            maxSupportedTransactionVersion: 0,
        });

        if (!tx || !tx.meta) {
            console.log('❌ Transaction not found or has no metadata');
            return;
        }

        console.log('\n📊 Transaction Metadata:');
        console.log(`Block Time: ${ tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : 'N/A' }`);
        console.log(`Fee: ${(tx.meta.fee / 1e9).toFixed(9)} SOL`);
        console.log(`Status: ${ tx.meta.err ? 'FAILED' : 'SUCCESS' } `);

        console.log('\n🔍 Token Balances:');
        console.log(`Pre - balances: ${ tx.meta.preTokenBalances?.length || 0 } `);
        console.log(`Post - balances: ${ tx.meta.postTokenBalances?.length || 0 } `);

        if (tx.meta.postTokenBalances && tx.meta.postTokenBalances.length > 0) {
            console.log('\nPost Token Balances:');
            for (const balance of tx.meta.postTokenBalances) {
                console.log(`  Mint: ${ balance.mint } `);
                console.log(`  Owner: ${ balance.owner } `);
                console.log(`  Amount: ${ balance.uiTokenAmount.uiAmount } `);
                console.log(`  Decimals: ${ balance.uiTokenAmount.decimals } `);
                console.log('  ---');
            }
        }

        console.log('\n🔍 Extracted Transfers:');
        const transfers = extractTokenTransfers(tx, WALLET, TX_HASH);
        console.log(`Total extracted: ${ transfers.length } `);

        for (const transfer of transfers) {
            console.log('\n  Transfer:');
            console.log(`    Token: ${ transfer.token_symbol } (${ transfer.token_address })`);
            console.log(`    Amount: ${ transfer.amount } `);
            console.log(`    Flow: ${ transfer.flow } `);
            console.log(`    From: ${ transfer.from_address || 'N/A' } `);
            console.log(`    To: ${ transfer.to_address || 'N/A' } `);
        }

        console.log('\n🎯 Analysis:');
        console.log(`Is this a spam / dust transaction ? `);
        console.log(`- Amount is 0: ${ transfers.some(t => t.amount === 0) } `);
        console.log(`- Token is UNKNOWN: ${ transfers.some(t => t.token_symbol === 'UNKNOWN') } `);
        console.log(`- Very small amount: ${ transfers.some(t => t.amount < 0.000001 && t.amount > 0) } `);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

analyzeSpamDustTransaction().then(() => {
    console.log('\n✅ Analysis complete');
    process.exit(0);
});
