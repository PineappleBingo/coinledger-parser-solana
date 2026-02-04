/**
 * Google Sheets Integration
 * Handles authentication and data writing to Google Sheets
 */

import { google } from 'googleapis';
import { CoinLedgerRow, NormalizedTransaction } from './types';
import { toCoinLedgerRow } from './solana-parser';

const SHEETS_BATCH_SIZE = parseInt(process.env.SHEETS_BATCH_SIZE || '10', 10);

/**
 * Initialize Google Sheets API client
 */
export async function getGoogleSheetsClient() {
    try {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');

        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient as any });

        return sheets;
    } catch (error) {
        console.error('Failed to initialize Google Sheets client:', error);
        throw new Error('Google Sheets authentication failed. Check GOOGLE_CREDENTIALS in .env');
    }
}

/**
 * Write transactions to Google Sheets
 */
export async function writeToGoogleSheets(
    transactions: NormalizedTransaction[],
    sheetId?: string,
    sheetName: string = 'CoinLedger Import',
    appendMode: boolean = true
): Promise<{
    success: boolean;
    rowsWritten: number;
    sheetUrl: string;
}> {
    const targetSheetId = sheetId || process.env.GOOGLE_SHEET_ID;

    if (!targetSheetId) {
        throw new Error('GOOGLE_SHEET_ID not configured');
    }

    const sheets = await getGoogleSheetsClient();

    // Convert to CoinLedger format
    const rows = transactions.map(toCoinLedgerRow);

    // Headers
    const headers = [
        'Date (UTC)',
        'Platform',
        'Asset Sent',
        'Amount Sent',
        'Asset Received',
        'Amount Received',
        'Fee Currency',
        'Fee Amount',
        'Type',
        'Description',
        'TxHash',
    ];

    // Convert rows to 2D array
    const values = rows.map((row) => [
        row['Date (UTC)'],
        row['Platform'],
        row['Asset Sent'],
        row['Amount Sent'],
        row['Asset Received'],
        row['Amount Received'],
        row['Fee Currency'],
        row['Fee Amount'],
        row['Type'],
        row['Description'],
        row['TxHash'],
    ]);

    try {
        // Check if sheet exists, create if not
        await ensureSheetExists(sheets, targetSheetId, sheetName);

        if (appendMode) {
            // Append to existing data
            await sheets.spreadsheets.values.append({
                spreadsheetId: targetSheetId,
                range: `${sheetName}!A:K`,
                valueInputOption: 'RAW',
                requestBody: {
                    values: values,
                },
            });
        } else {
            // Overwrite (write headers + data)
            await sheets.spreadsheets.values.update({
                spreadsheetId: targetSheetId,
                range: `${sheetName}!A1:K${values.length + 1}`,
                valueInputOption: 'RAW',
                requestBody: {
                    values: [headers, ...values],
                },
            });
        }

        return {
            success: true,
            rowsWritten: values.length,
            sheetUrl: `https://docs.google.com/spreadsheets/d/${targetSheetId}`,
        };
    } catch (error) {
        console.error('Failed to write to Google Sheets:', error);
        throw error;
    }
}

/**
 * Batch write transactions in chunks to avoid quota limits
 */
export async function batchWriteToGoogleSheets(
    transactions: NormalizedTransaction[],
    sheetId?: string,
    sheetName: string = 'CoinLedger Import'
): Promise<{
    success: boolean;
    totalRowsWritten: number;
    sheetUrl: string;
}> {
    const targetSheetId = sheetId || process.env.GOOGLE_SHEET_ID;

    if (!targetSheetId) {
        throw new Error('GOOGLE_SHEET_ID not configured');
    }

    let totalRowsWritten = 0;

    // Process in batches
    for (let i = 0; i < transactions.length; i += SHEETS_BATCH_SIZE) {
        const batch = transactions.slice(i, i + SHEETS_BATCH_SIZE);

        const result = await writeToGoogleSheets(
            batch,
            targetSheetId,
            sheetName,
            i > 0 // Append mode for all batches after first
        );

        totalRowsWritten += result.rowsWritten;

        console.log(
            `Batch ${Math.floor(i / SHEETS_BATCH_SIZE) + 1}: Wrote ${result.rowsWritten} rows`
        );

        // Small delay to avoid rate limits
        if (i + SHEETS_BATCH_SIZE < transactions.length) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }

    return {
        success: true,
        totalRowsWritten,
        sheetUrl: `https://docs.google.com/spreadsheets/d/${targetSheetId}`,
    };
}

/**
 * Ensure sheet exists, create if not
 */
async function ensureSheetExists(
    sheets: any,
    spreadsheetId: string,
    sheetName: string
): Promise<void> {
    try {
        const response = await sheets.spreadsheets.get({
            spreadsheetId,
        });

        const sheetExists = response.data.sheets?.some(
            (sheet: any) => sheet.properties?.title === sheetName
        );

        if (!sheetExists) {
            // Create new sheet
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                    requests: [
                        {
                            addSheet: {
                                properties: {
                                    title: sheetName,
                                },
                            },
                        },
                    ],
                },
            });

            console.log(`Created new sheet: ${sheetName}`);
        }
    } catch (error) {
        console.error('Error checking/creating sheet:', error);
        throw error;
    }
}

/**
 * Create a new Google Sheet for testing
 */
export async function createTestSheet(
    title: string = 'CoinLedger Import Test'
): Promise<string> {
    const sheets = await getGoogleSheetsClient();

    const response = await sheets.spreadsheets.create({
        requestBody: {
            properties: {
                title,
            },
        },
    });

    const sheetId = response.data.spreadsheetId!;
    console.log(`Created test sheet: ${response.data.spreadsheetUrl}`);

    return sheetId;
}
