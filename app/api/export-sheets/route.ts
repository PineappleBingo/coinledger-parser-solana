/**
 * API Route: /api/export-sheets
 * Exports transactions to Google Sheets
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { batchWriteToGoogleSheets } from '@/lib/google-sheets';
import { NormalizedTransaction } from '@/lib/types';

const requestSchema = z.object({
    transactions: z.array(z.any()),
    sheetId: z.string().optional(),
    sheetName: z.string().default('CoinLedger Import'),
    appendMode: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validated = requestSchema.parse(body);

        const { transactions, sheetId, sheetName, appendMode } = validated;

        console.log(`Exporting ${transactions.length} transactions to Google Sheets...`);

        // Write to Google Sheets in batches
        const result = await batchWriteToGoogleSheets(
            transactions as NormalizedTransaction[],
            sheetId,
            sheetName
        );

        console.log(`Successfully wrote ${result.totalRowsWritten} rows`);

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('Export error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    details: error.errors,
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to export to Google Sheets',
            },
            { status: 500 }
        );
    }
}
