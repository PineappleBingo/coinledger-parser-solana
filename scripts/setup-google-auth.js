#!/usr/bin/env node

/**
 * Google Sheets Authentication Setup Script
 * Run: npm run setup
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CREDENTIALS_DIR = path.join(__dirname, '..', '.credentials');
const CREDENTIALS_PATH = path.join(CREDENTIALS_DIR, 'credentials.json');
const ENV_PATH = path.join(__dirname, '..', '.env.local');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function question(query) {
    return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
    console.log('\n=== Solana Tax Bridge Setup ===\n');

    // Check if credentials directory exists
    if (!fs.existsSync(CREDENTIALS_DIR)) {
        fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
        console.log('✓ Created .credentials directory');
    }

    // Check if credentials.json exists
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        console.log('\n❌ Missing credentials.json\n');
        console.log('Follow these steps to create a Google Service Account:\n');
        console.log('1. Go to https://console.cloud.google.com/apis/credentials');
        console.log('2. Create a new project (or select existing)');
        console.log('3. Enable Google Sheets API');
        console.log('4. Create Service Account credentials');
        console.log('5. Download the JSON key file');
        console.log('6. Save it as .credentials/credentials.json\n');

        const proceed = await question('Have you created credentials.json? (y/n): ');

        if (proceed.toLowerCase() !== 'y') {
            console.log('\nSetup cancelled. Please create credentials.json first.');
            rl.close();
            return;
        }

        if (!fs.existsSync(CREDENTIALS_PATH)) {
            console.log('\n❌ credentials.json still not found at .credentials/credentials.json');
            rl.close();
            return;
        }
    }

    console.log('✓ Found credentials.json');

    // Read credentials
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    console.log(`✓ Service Account: ${credentials.client_email}`);

    // Create or update .env.local
    let envContent = '';

    if (fs.existsSync(ENV_PATH)) {
        envContent = fs.readFileSync(ENV_PATH, 'utf8');
    } else {
        // Copy from .env.example
        const envExample = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8');
        envContent = envExample;
    }

    // Update GOOGLE_CREDENTIALS
    const credentialsJson = JSON.stringify(credentials).replace(/"/g, '\\"');

    if (envContent.includes('GOOGLE_CREDENTIALS=')) {
        envContent = envContent.replace(
            /GOOGLE_CREDENTIALS=.*/,
            `GOOGLE_CREDENTIALS="${credentialsJson}"`
        );
    } else {
        envContent += `\nGOOGLE_CREDENTIALS="${credentialsJson}"\n`;
    }

    // Prompt for other required variables
    console.log('\n--- Required API Keys ---\n');

    const solscanKey = await question('Solscan API Key (get from https://pro.solscan.io/): ');
    if (solscanKey) {
        envContent = envContent.replace(/SOLSCAN_API_KEY=.*/, `SOLSCAN_API_KEY=${solscanKey}`);
    }

    const geminiKey = await question('Gemini API Key (get from https://makersuite.google.com/app/apikey): ');
    if (geminiKey) {
        envContent = envContent.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${geminiKey}`);
    }

    const sheetId = await question('Google Sheet ID (optional, from sheet URL): ');
    if (sheetId) {
        envContent = envContent.replace(/GOOGLE_SHEET_ID=.*/, `GOOGLE_SHEET_ID=${sheetId}`);
    }

    // Write .env.local
    fs.writeFileSync(ENV_PATH, envContent);
    console.log('\n✓ Created/updated .env.local');

    console.log('\n=== Setup Complete! ===\n');
    console.log('Next steps:');
    console.log('1. npm install');
    console.log('2. npm run dev');
    console.log('3. Open http://localhost:3000\n');

    rl.close();
}

main().catch((error) => {
    console.error('Setup failed:', error);
    rl.close();
    process.exit(1);
});
