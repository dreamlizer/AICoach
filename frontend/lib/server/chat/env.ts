import fs from "fs";
import path from "path";

function readEnvValue(key: string) {
  const envFiles = [".env.local", ".env"];

  for (const file of envFiles) {
    try {
      const envPath = path.resolve(process.cwd(), file);
      if (!fs.existsSync(envPath)) continue;
      const content = fs.readFileSync(envPath, "utf-8");
      for (const rawLine of content.split("\n")) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const [k, ...v] = line.split("=");
        if (k !== key) continue;
        return v.join("=").trim();
      }
    } catch (e) {
      console.error(`[EnvLoader] Failed to read ${file}:`, e);
    }
  }

  return "";
}

export function loadServerEnv() {
  const keys = {
    deepseek: process.env.DEEPSEEK_API_KEY || "",
    doubao: process.env.DOUBAO_API_KEY || "",
  };

  if (!keys.deepseek || !keys.doubao) {
    if (!keys.deepseek) keys.deepseek = readEnvValue("DEEPSEEK_API_KEY");
    if (!keys.doubao) keys.doubao = readEnvValue("DOUBAO_API_KEY");
  }

  return keys;
}

export function loadServerEnvValue(key: string) {
  return process.env[key] || readEnvValue(key);
}
