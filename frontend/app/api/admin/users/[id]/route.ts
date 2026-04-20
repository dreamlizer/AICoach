import { NextResponse } from "next/server";
import { clearUserPasswordById, deleteUserById } from "@/lib/db";
import { requireAdmin } from "@/lib/server/require-admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (!userId) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const { action } = await request.json();
    if (action !== "clear_password") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const changes = await clearUserPasswordById(userId);
    return NextResponse.json(
      { success: true, changes },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error) {
    console.error("Admin Update User Error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (!userId) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const changes = await deleteUserById(userId);
    return NextResponse.json(
      { success: true, changes },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error) {
    console.error("Admin Delete User Error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}
