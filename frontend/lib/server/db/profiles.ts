import { UserProfile } from "@/lib/types";
import { execute, queryOne } from "./core";

export const getUserProfileFromDb = async (): Promise<UserProfile | null> => {
  const row = await queryOne<any>("SELECT * FROM user_profiles ORDER BY id DESC LIMIT 1");
  if (!row) return null;

  let rawTags = {};
  try {
    rawTags = JSON.parse(row.tags);
  } catch (e) {
    console.error("Failed to parse profile tags", e);
  }

  const demographics: Record<string, any> = {};
  for (const [key, val] of Object.entries(rawTags)) {
    if (typeof val === "string") {
      demographics[key] = { value: val, confidence: 50 };
    } else {
      demographics[key] = val;
    }
  }

  return {
    demographics,
    personality: row.personality,
    leadership_level: JSON.parse(row.leadership_level),
    last_updated: row.last_updated,
  };
};

export const saveUserProfileToDb = async (profile: UserProfile) => {
  await execute("INSERT INTO user_profiles (tags, personality, leadership_level, last_updated) VALUES (?, ?, ?, ?)", [
    JSON.stringify(profile.demographics),
    profile.personality,
    JSON.stringify(profile.leadership_level),
    new Date().toISOString(),
  ]);
};
