import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getUserFeatureOrder, updateUserFeatureOrder } from "@/lib/db";

const normalizeOrder = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  const filtered = value.filter((item): item is string => typeof item === "string" && item.length > 0);
  return filtered.length ? filtered : null;
};

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const raw = await getUserFeatureOrder(currentUser.id);
    if (!raw) return NextResponse.json({ order: null });

    try {
      const parsed = JSON.parse(raw);
      return NextResponse.json({ order: normalizeOrder(parsed) });
    } catch {
      return NextResponse.json({ order: null });
    }
  } catch (error) {
    console.error("Get feature order error:", error);
    return NextResponse.json({ error: "Failed to get feature order" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const order = normalizeOrder(body?.order);
    if (!order) {
      return NextResponse.json({ error: "Invalid order payload" }, { status: 400 });
    }

    await updateUserFeatureOrder(currentUser.id, JSON.stringify(order));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update feature order error:", error);
    return NextResponse.json({ error: "Failed to update feature order" }, { status: 500 });
  }
}

