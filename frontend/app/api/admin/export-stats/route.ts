import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'daily'; // 'daily' or 'tools'

    const db = getDb();
    let csvContent = "";
    let filename = "";

    if (type === 'tools') {
        filename = `tool_usage_stats_${new Date().toISOString().split('T')[0]}.csv`;
        const rows = db.prepare("SELECT * FROM daily_tool_usage ORDER BY date DESC, usage_count DESC").all();
        
        // Header
        csvContent = "Identifier,Date,Tool ID,Usage Count\n";
        
        // Rows
        rows.forEach((row: any) => {
            csvContent += `${row.identifier},${row.date},${row.tool_id},${row.usage_count}\n`;
        });

    } else {
        // Default: Daily Usage Stats
        filename = `daily_usage_stats_${new Date().toISOString().split('T')[0]}.csv`;
        const rows = db.prepare("SELECT * FROM daily_usage_stats ORDER BY date DESC").all();
        
        // Header
        csvContent = "Identifier,Date,Total Tokens,Input Tokens,Output Tokens,Message Count,Word Count\n";
        
        // Rows
        rows.forEach((row: any) => {
            csvContent += `${row.identifier},${row.date},${row.total_tokens},${row.input_tokens},${row.output_tokens},${row.message_count},${row.word_count}\n`;
        });
    }

    // Return as CSV file download
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error("Export Stats Error:", error);
    return NextResponse.json({ error: "Failed to export stats" }, { status: 500 });
  }
}
