import { NextResponse } from "next/server";
import { clearUserPasswordById, deleteUserById } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = parseInt(params.id);
    if (!userId) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const { action } = await request.json();
    if (action !== "clear_password") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const changes = clearUserPasswordById(userId);
    return NextResponse.json({ success: true, changes });
  } catch (error) {
    console.error("Admin Update User Error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = parseInt(params.id);
    if (!userId) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const changes = deleteUserById(userId);
    return NextResponse.json({ success: true, changes });
  } catch (error) {
    console.error("Admin Delete User Error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
