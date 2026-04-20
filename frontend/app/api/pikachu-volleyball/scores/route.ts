import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getPikachuVolleyballScoresForUser, savePikachuVolleyballScoreToDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type DifficultyId = "low" | "normal" | "high";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ history: [] });
  }

  try {
    const rows = await getPikachuVolleyballScoresForUser(user.id, 50);
    return NextResponse.json({
      history: rows.map((row) => ({
        id: `pvdb-${row.id}`,
        createdAt: row.created_at,
        p1Score: row.p1_score,
        p2Score: row.p2_score,
        winningScore: row.winning_score,
        difficulty: row.difficulty,
        themeId: row.theme_id,
        themePreviewSrc: row.theme_preview_src,
        synced: true,
      })),
    });
  } catch (error) {
    console.error("Pikachu history fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch Pikachu Volleyball history" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const p1Score = Number(body?.p1Score);
    const p2Score = Number(body?.p2Score);
    const winningScore = Number(body?.winningScore);
    const difficulty = body?.difficulty as DifficultyId;
    const themeId = String(body?.themeId || "default");
    const themePreviewSrc = String(body?.themePreviewSrc || "");

    if (!Number.isFinite(p1Score) || !Number.isFinite(p2Score) || !Number.isFinite(winningScore)) {
      return NextResponse.json({ error: "Invalid score payload" }, { status: 400 });
    }
    if (difficulty !== "low" && difficulty !== "normal" && difficulty !== "high") {
      return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
    }
    if (!themePreviewSrc) {
      return NextResponse.json({ error: "Missing theme preview source" }, { status: 400 });
    }

    const saved = await savePikachuVolleyballScoreToDb({
      userId: user.id,
      p1Score,
      p2Score,
      winningScore,
      difficulty,
      themeId,
      themePreviewSrc,
      metadata: body?.metadata ? JSON.stringify(body.metadata) : null,
    });

    return NextResponse.json({
      success: true,
      record: {
        id: `pvdb-${saved.id}`,
        createdAt: saved.created_at,
        p1Score,
        p2Score,
        winningScore,
        difficulty,
        themeId,
        themePreviewSrc,
        synced: true,
      },
    });
  } catch (error) {
    console.error("Pikachu history save error:", error);
    return NextResponse.json({ error: "Failed to save Pikachu Volleyball history" }, { status: 500 });
  }
}


