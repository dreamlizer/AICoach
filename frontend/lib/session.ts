import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret";

export function getCurrentUser() {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token");

  if (!token) return null;

  try {
    const decoded = jwt.verify(token.value, JWT_SECRET) as any;
    return { id: decoded.userId, email: decoded.email };
  } catch (error) {
    return null;
  }
}
