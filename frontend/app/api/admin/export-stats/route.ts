import { NextResponse } from "next/server";
import { getDailyToolUsageRows, getDailyUsageStatsRows } from "@/lib/stats_db";
import { requireAdmin } from "@/lib/server/require-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "daily";

    let csvContent = "";
    let filename = "";

    if (type === "tools") {
      filename = `tool_usage_stats_${new Date().toISOString().split("T")[0]}.csv`;
      const rows = getDailyToolUsageRows() as any[];

      csvContent = "Identifier,Date,Tool ID,Usage Count\n";
      rows.forEach((row: any) => {
        csvContent += `${row.identifier},${row.date},${row.tool_id},${row.usage_count}\n`;
      });
    } else {
      filename = `daily_usage_stats_${new Date().toISOString().split("T")[0]}.csv`;
      const rows = getDailyUsageStatsRows() as any[];

      csvContent = "Identifier,Date,Total Tokens,Input Tokens,Output Tokens,Message Count,Word Count\n";
      rows.forEach((row: any) => {
        csvContent += `${row.identifier},${row.date},${row.total_tokens},${row.input_tokens},${row.output_tokens},${row.message_count},${row.word_count}\n`;
      });
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export Stats Error:", error);
    return NextResponse.json(
      { error: "Failed to export stats" },
      { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}
