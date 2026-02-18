
import fs from 'fs';
import path from 'path';
import { Connection, PublicKey } from '@solana/web3.js';
import { extractTokenTransfers } from './lib/solscan-client';
import { parseGroupedTransfers } from './lib/solana-parser';

// Load .env manually
try {
    const envPath = path.resolve(process.cwd(), '.env');
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.warn('⚠️ Could not read .env file');
}

const TX_HASH = '2faE7vK1FP9dFig5LkZVcxUWRjfKwd8XHX7g848pjVX1c6zJbYJzEdB2kgDoyzy6JQz83SMtzvx9TBAvQ7tzDstT';
const WALLET_ADDRESS = 'xP1rrkVZ7g7Ten349zRDhJCvKfW8ak5LyAw11dBupRa';

async function main() {
    console.log('🚀 Starting Debug Script');
    console.log(`Target TX: ${TX_HASH}`);
    console.log(`Wallet: ${WALLET_ADDRESS}`);

    const apiKey = process.env.HELIUS_API_KEY;
    if (!apiKey) {
        console.error('❌ HELIUS_API_KEY not found in .env');
        process.exit(1);
    }

    const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
    const connection = new Connection(rpcUrl);

    try {
        console.log('Fetching transaction...');
        const tx = await connection.getParsedTransaction(TX_HASH, {
            maxSupportedTransactionVersion: 0,
        });

        if (!tx) {
            console.error('❌ Transaction not found!');
            return;
        }

        console.log('✅ Transaction fetched successfully');

        // Test Extraction
        console.log('\n--- Testing extractTokenTransfers ---');
        const transfers = extractTokenTransfers(tx, WALLET_ADDRESS, TX_HASH);

        console.log(`\n📊 Extracted ${transfers.length} transfers:`);
        transfers.forEach((t, i) => {
            console.log(`[${i}] ${t.flow} ${t.amount} (decimals: ${t.token_decimals}) token: ${t.token_address}`);
        });

        if (transfers.length === 0) {
            console.log('⚠️ No transfers extracted! Checking why...');
            // Manually logging balance changes to see what happened
            const preBalances = tx.meta?.preTokenBalances || [];
            const postBalances = tx.meta?.postTokenBalances || [];
            console.log(`Pre-balances: ${preBalances.length}`);
            console.log(`Post-balances: ${postBalances.length}`);

            postBalances.forEach((post, i) => {
                const pre = preBalances.find(p => p.accountIndex === post.accountIndex);
                const preAmount = pre?.uiTokenAmount.uiAmount || 0;
                const postAmount = post.uiTokenAmount.uiAmount || 0;
                const change = postAmount - preAmount;
                console.log(`Balance #${i}: Change ${change}, Owner: ${post.owner}, Mint: ${post.mint}`);
                console.log(`  Match Wallet? ${post.owner === WALLET_ADDRESS}`);
            });
        } else {
            // Test Parsing
            console.log('\n--- Testing parseGroupedTransfers ---');
            try {
                // Mock metadata map
                const metadataMap = new Map();
                // Add some dummy metadata if needed, or rely on defaults

                const parsed = parseGroupedTransfers(transfers, WALLET_ADDRESS, metadataMap);
                console.log('✅ Parse Result:');
                console.log(JSON.stringify(parsed, null, 2));

                if (parsed.type === 'Withdrawal' && parsed.assetReceived === undefined) {
                    console.error('❌ BROKEN: Still showing as Withdrawal!');
                } else if (parsed.type === 'Trade') {
                    console.log('✅ SUCCESS: Identified as Trade');
                }
            } catch (e: any) {
                console.error('❌ Parse Failed:', e.message);
            }
        }

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

main();
