import { cookies } from "next/headers";
import { serialize } from "cookie";
import jwt from "jsonwebtoken";

const DEFAULT_AUTH_SECRET = "dev-only-auth-secret-change-me";
const AUTH_SECRET_ENV_KEYS = ["AUTH_JWT_SECRET", "JWT_SECRET", "NEXTAUTH_SECRET"] as const;
const AUTH_TOKEN_VERSION = 2 as const;
export const AUTH_SECRET_MISSING_CODE = "AUTH_SECRET_MISSING";

type AuthJwtPayload = {
  v: typeof AUTH_TOKEN_VERSION;
  userId: number;
  email: string;
};

const isProduction = process.env.NODE_ENV === "production";

const getAuthSecrets = () => {
  const envSecrets = AUTH_SECRET_ENV_KEYS.map((key) => process.env[key]?.trim()).filter(
    (value): value is string => !!value
  );

  if (envSecrets.length === 0) {
    if (isProduction) {
      throw new Error(AUTH_SECRET_MISSING_CODE);
    }
    return [DEFAULT_AUTH_SECRET];
  }

  return envSecrets;
};

const shouldAllowLegacyUnsignedToken = () => {
  const raw = process.env.ALLOW_LEGACY_AUTH_TOKEN?.trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return !isProduction;
};

const getPrimaryAuthSecret = () => getAuthSecrets()[0];

const getCookieDomain = () => {
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim();
  return domain ? domain : undefined;
};

const getCookieMaxAgeSeconds = () => {
  const daysRaw = process.env.AUTH_COOKIE_MAX_AGE_DAYS?.trim();
  const days = daysRaw ? Number(daysRaw) : 30;
  if (!Number.isFinite(days) || days <= 0) return 60 * 60 * 24 * 30;
  return Math.floor(days * 24 * 60 * 60);
};

const shouldUseSecureCookie = () => {
  const raw = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return isProduction;
};

export const createAuthCookie = (user: { id: number | string; email: string }) => {
  const secure = shouldUseSecureCookie();
  const domain = getCookieDomain();
  const maxAge = getCookieMaxAgeSeconds();
  const userId = typeof user.id === "number" ? user.id : Number(user.id);

  if (!Number.isFinite(userId) || userId <= 0) {
    throw new Error("Invalid user id for auth cookie");
  }

  const tokenPayload: AuthJwtPayload = {
    v: AUTH_TOKEN_VERSION,
    userId,
    email: user.email,
  };

  const token = jwt.sign(tokenPayload, getPrimaryAuthSecret(), {
    algorithm: "HS256",
    expiresIn: maxAge,
  });

  return serialize("auth_token", token, {
    httpOnly: true,
    secure,
    maxAge,
    path: "/",
    sameSite: "lax",
    ...(domain ? { domain } : {}),
  });
};

export const createLogoutCookie = () => {
  const secure = shouldUseSecureCookie();
  const domain = getCookieDomain();
  return serialize("auth_token", "", {
    httpOnly: true,
    secure,
    expires: new Date(0),
    path: "/",
    sameSite: "lax",
    ...(domain ? { domain } : {}),
  });
};

export const validatePassword = (password: string) => {
  if (password.length < 6) {
    return "密码长度至少为 6 位";
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

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token");

  if (!token) return null;

  for (const secret of getAuthSecrets()) {
    try {
      const decoded = jwt.verify(token.value, secret) as AuthJwtPayload;
      const userId = Number(decoded.userId);
      if (!Number.isFinite(userId) || userId <= 0) continue;
      if (!decoded.email || typeof decoded.email !== "string") continue;
      return { id: userId, email: decoded.email };
    } catch {
      // Try next secret.
    }
  }

  if (!shouldAllowLegacyUnsignedToken()) {
    return null;
  }

  try {
    const decoded = JSON.parse(decodeURIComponent(token.value)) as { userId: number | string; email: string };
    const userId = typeof decoded.userId === "number" ? decoded.userId : Number(decoded.userId);
    if (!Number.isFinite(userId) || userId <= 0) return null;
    if (!decoded.email || typeof decoded.email !== "string") return null;
    return { id: userId, email: decoded.email };
  } catch {
    return null;
  }
}

export const isAuthSecretMissingError = (error: unknown) =>
  error instanceof Error && error.message === AUTH_SECRET_MISSING_CODE;
