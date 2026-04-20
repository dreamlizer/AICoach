import { NextResponse } from "next/server";
import { deleteAssessmentsForUser, listAssessmentsForUser, saveAssessmentForUser } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const history = await listAssessmentsForUser(user.id, type);
    return NextResponse.json({ history });
  } catch (error) {
    console.error("Fetch History Error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, result, metadata, title } = body;

    if (!type || !result) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await saveAssessmentForUser({
      userId: user.id,
      type,
      title,
      result,
      metadata,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save Assessment Error:", error);
    return NextResponse.json({ error: "Failed to save assessment" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }

    const count = await deleteAssessmentsForUser(user.id, ids);
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("Delete Assessment Error:", error);
    return NextResponse.json({ error: "Failed to delete assessments" }, { status: 500 });
  }
}
