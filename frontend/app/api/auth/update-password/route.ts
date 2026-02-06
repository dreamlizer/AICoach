import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { oldPassword, newPassword } = await request.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "原密码和新密码不能为空" }, { status: 400 });
    }

    const user = getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const db = getDb();
    const userRecord = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as any;

    if (!userRecord || !userRecord.password_hash) {
       return NextResponse.json({ error: "当前用户未设置密码" }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(oldPassword, userRecord.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: "原密码错误" }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashedPassword, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update Password Error:", error);
    return NextResponse.json({ error: "修改密码失败" }, { status: 500 });
  }
}
