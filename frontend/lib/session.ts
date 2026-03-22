import { cookies, headers } from "next/headers";
import { serialize } from "cookie";

const shouldUseSecureCookie = () => {
  try {
    const proto = headers().get("x-forwarded-proto");
    if (proto) {
      return proto.split(",")[0].trim() === "https";
    }
  } catch (error) {
    return process.env.NODE_ENV === "production";
  }
  return process.env.NODE_ENV === "production";
};

export const createAuthCookie = (user: { id: number | string; email: string }) => {
  const secure = shouldUseSecureCookie();
  return serialize("auth_token", encodeURIComponent(JSON.stringify({ userId: user.id, email: user.email })), {
    httpOnly: true,
    secure,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax"
  });
};

export const createLogoutCookie = () => {
  const secure = shouldUseSecureCookie();
  return serialize("auth_token", "", {
    httpOnly: true,
    secure,
    expires: new Date(0),
    path: "/",
    sameSite: "lax"
  });
};

export const validatePassword = (password: string) => {
  if (password.length < 6) {
    return "密码长度需至少 6 位";
  }
  let types = 0;
  if (/[a-z]/.test(password)) types += 1;
  if (/[A-Z]/.test(password)) types += 1;
  if (/[0-9]/.test(password)) types += 1;
  if (/[^a-zA-Z0-9]/.test(password)) types += 1;
  if (types < 2) {
    return "密码需包含大写字母、小写字母、数字或符号中的至少两种";
  }
  return null;
};

export function getCurrentUser() {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token");

  if (!token) return null;

  try {
    const decoded = JSON.parse(decodeURIComponent(token.value)) as { userId: number | string; email: string };
    const userId = typeof decoded.userId === "number" ? decoded.userId : Number(decoded.userId);
    if (!userId || Number.isNaN(userId)) return null;
    return { id: userId, email: decoded.email };
  } catch (error) {
    return null;
  }
}
