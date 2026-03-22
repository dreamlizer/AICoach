import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const db = getDb();
    let sql = "SELECT * FROM assessments WHERE user_id = ? ORDER BY created_at DESC";
    const params: any[] = [user.id];

    if (type) {
      sql = "SELECT * FROM assessments WHERE user_id = ? AND type = ? ORDER BY created_at DESC";
      params.push(type);
    }

    const history = db.prepare(sql).all(...params);
    return NextResponse.json({ history });
  } catch (error) {
    console.error("Fetch History Error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, result, metadata, title } = body;

    if (!type || !result) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getDb();
    const stmt = db.prepare(
      "INSERT INTO assessments (user_id, type, title, result, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    );
    
    const now = new Date().toISOString();
    stmt.run(
      user.id, 
      type, 
      title || `${type} Assessment`, 
      typeof result === 'string' ? result : JSON.stringify(result), 
      typeof metadata === 'string' ? metadata : JSON.stringify(metadata), 
      now
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save Assessment Error:", error);
    return NextResponse.json({ error: "Failed to save assessment" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body; // Array of IDs

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }

    const db = getDb();
    // Use transaction for batch delete
    const deleteTx = db.transaction((assessmentIds) => {
      const stmt = db.prepare("DELETE FROM assessments WHERE id = ? AND user_id = ?");
      let deletedCount = 0;
      for (const id of assessmentIds) {
        const result = stmt.run(id, user.id);
        deletedCount += result.changes;
      }
      return deletedCount;
    });

    const count = deleteTx(ids);

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("Delete Assessment Error:", error);
    return NextResponse.json({ error: "Failed to delete assessments" }, { status: 500 });
  }
}
