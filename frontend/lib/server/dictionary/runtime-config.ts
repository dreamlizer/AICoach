import path from "path";
import { loadServerEnvValue } from "@/lib/server/chat/env";

export type DictionaryRuntimeProfile = "local" | "cloud";

export type DictionaryRuntimeConfig = {
  profile: DictionaryRuntimeProfile;
  defaultDbFile: string;
  onlineFallbackEnabled: boolean;
  runtimeBootstrapEnabled: boolean;
  remoteHydrationEnabled: boolean;
  remoteDbUrl: string | null;
};

const globalForDictionaryRuntime = global as unknown as {
  dictionaryRuntimeConfigCache: DictionaryRuntimeConfig | undefined;
};

function asBool(value: string | undefined | null, fallback: boolean) {
  if (value == null || value.trim() === "") return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function resolveProfile(): DictionaryRuntimeProfile {
  const raw = (loadServerEnvValue("DICTIONARY_RUNTIME_PROFILE") || "").trim().toLowerCase();
  if (raw === "cloud") return "cloud";
  if (raw === "local") return "local";
  // Conservative default: keep local behavior unless explicitly switched.
  return "local";
}

function buildRuntimeConfig(): DictionaryRuntimeConfig {
  const profile = resolveProfile();
  const defaultDbFile =
    loadServerEnvValue("DICTIONARY_DEFAULT_DB_FILE") ||
    (profile === "cloud" ? "dictionary-artifact.sqlite.db" : "dictionary-data.sqlite.db");

  const onlineFallbackEnabled = asBool(loadServerEnvValue("DICTIONARY_ENABLE_ONLINE_FALLBACK"), false);
  const runtimeBootstrapEnabled = asBool(loadServerEnvValue("DICTIONARY_ENABLE_RUNTIME_BOOTSTRAP"), false);
  const remoteHydrationEnabled = asBool(loadServerEnvValue("DICTIONARY_ENABLE_REMOTE_HYDRATION"), profile === "cloud");

  const remoteDbUrl = (loadServerEnvValue("DICTIONARY_DB_URL") || "").trim() || null;

  return {
    profile,
    defaultDbFile,
    onlineFallbackEnabled,
    runtimeBootstrapEnabled,
    remoteHydrationEnabled,
    remoteDbUrl,
  };
}

export function getDictionaryRuntimeConfig() {
  if (!globalForDictionaryRuntime.dictionaryRuntimeConfigCache) {
    globalForDictionaryRuntime.dictionaryRuntimeConfigCache = buildRuntimeConfig();
  }
  return globalForDictionaryRuntime.dictionaryRuntimeConfigCache;
}

export function getDictionaryRuntimeDefaultDbPath() {
  const config = getDictionaryRuntimeConfig();
  return path.isAbsolute(config.defaultDbFile)
    ? config.defaultDbFile
    : path.join(process.cwd(), config.defaultDbFile);
}

