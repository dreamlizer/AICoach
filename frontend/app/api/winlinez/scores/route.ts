import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  deleteWinlinezScoreById,
  getWinlinezScoresForUser,
  getWinlinezSummaryForUser,
  saveWinlinezScoreToDb,
} from "@/lib/db";

export const dynamic = "force-dynamic";

function parseWinlinezMetadata(metadataRaw: string | null | undefined) {
  try {
    const metadata = metadataRaw ? JSON.parse(metadataRaw) : null;
    const aid = metadata?.aidLevel;
    return {
      aidLevel: aid === "assist" || aid === "boost" ? aid : "none",
      durationSec: Number.isFinite(Number(metadata?.durationSec)) ? Number(metadata.durationSec) : undefined,
      speedPreset:
        metadata?.speedPreset === "slow" || metadata?.speedPreset === "normal" || metadata?.speedPreset === "fast"
          ? metadata.speedPreset
          : undefined,
      themeId:
        metadata?.themeId === "retro" || metadata?.themeId === "neon" || metadata?.themeId === "frost" || metadata?.themeId === "nova"
          ? metadata.themeId
          : undefined,
      toolUsage:
        metadata?.toolUsage &&
        Number.isFinite(Number(metadata.toolUsage.clearRandom)) &&
        Number.isFinite(Number(metadata.toolUsage.shuffle)) &&
        Number.isFinite(Number(metadata.toolUsage.rerollPreview)) &&
        Number.isFinite(Number(metadata.toolUsage.clearTarget))
          ? {
              clearRandom: Number(metadata.toolUsage.clearRandom),
              shuffle: Number(metadata.toolUsage.shuffle),
              rerollPreview: Number(metadata.toolUsage.rerollPreview),
              clearTarget: Number(metadata.toolUsage.clearTarget),
            }
          : undefined,
    };
  } catch {
    return { aidLevel: "none" as const };
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ history: [], summary: null });
  }

  try {
    const rows = await getWinlinezScoresForUser(user.id, 20);
    const history = rows.map((row) => {
      const metadata = parseWinlinezMetadata(row.metadata);
      return {
      id: row.id,
      score: row.score,
      linesCleared: row.lines_cleared,
      ballsCleared: row.balls_cleared,
      movesPlayed: row.moves_played,
      pieceStyle: row.piece_style === "glyph" ? "glyph" : "orb",
      aidLevel: metadata.aidLevel,
      durationSec: metadata.durationSec,
      speedPreset: metadata.speedPreset,
      themeId: metadata.themeId,
      toolUsage: metadata.toolUsage,
      created_at: row.created_at,
      };
    });

    return NextResponse.json({
      history,
      summary: await getWinlinezSummaryForUser(user.id),
    });
  } catch (error) {
    console.error("Winlinez score fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch WINLINEZ scores" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const score = Number(body?.score || 0);
    const linesCleared = Number(body?.linesCleared || 0);
    const ballsCleared = Number(body?.ballsCleared || 0);
    const movesPlayed = Number(body?.movesPlayed || 0);
    const pieceStyle = body?.pieceStyle === "glyph" ? "glyph" : "orb";

    if (!Number.isFinite(score) || score < 0) {
      return NextResponse.json({ error: "Invalid score" }, { status: 400 });
    }

    const saved = await saveWinlinezScoreToDb({
      userId: user.id,
      score,
      linesCleared,
      ballsCleared,
      movesPlayed,
      pieceStyle,
      metadata: body?.metadata ? JSON.stringify(body.metadata) : null,
    });

    const requestMeta = parseWinlinezMetadata(body?.metadata ? JSON.stringify(body.metadata) : null);
    return NextResponse.json({
      success: true,
      record: {
        id: saved.id,
        score,
        linesCleared,
        ballsCleared,
        movesPlayed,
        pieceStyle,
        aidLevel: requestMeta.aidLevel,
        durationSec: requestMeta.durationSec,
        speedPreset: requestMeta.speedPreset,
        themeId: requestMeta.themeId,
        toolUsage: requestMeta.toolUsage,
        created_at: saved.created_at,
      },
      summary: await getWinlinezSummaryForUser(user.id),
    });
  } catch (error) {
    console.error("Winlinez score save error:", error);
    return NextResponse.json({ error: "Failed to save WINLINEZ score" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const scoreId = Number(searchParams.get("id"));
    if (!Number.isFinite(scoreId) || scoreId <= 0) {
      return NextResponse.json({ error: "Invalid score id" }, { status: 400 });
    }

    const changes = await deleteWinlinezScoreById(user.id, scoreId);
    if (changes <= 0) {
      return NextResponse.json({ error: "Score not found" }, { status: 404 });
    }

    const rows = await getWinlinezScoresForUser(user.id, 20);
    const history = rows.map((row) => {
      const metadata = parseWinlinezMetadata(row.metadata);
      return {
      id: row.id,
      score: row.score,
      linesCleared: row.lines_cleared,
      ballsCleared: row.balls_cleared,
      movesPlayed: row.moves_played,
      pieceStyle: row.piece_style === "glyph" ? "glyph" : "orb",
      aidLevel: metadata.aidLevel,
      durationSec: metadata.durationSec,
      speedPreset: metadata.speedPreset,
      themeId: metadata.themeId,
      toolUsage: metadata.toolUsage,
      created_at: row.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      history,
      summary: await getWinlinezSummaryForUser(user.id),
    });
  } catch (error) {
    console.error("Winlinez score delete error:", error);
    return NextResponse.json({ error: "Failed to delete WINLINEZ score" }, { status: 500 });
  }
}


