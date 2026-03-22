"use client";

import { ProvinceProfile } from "./types";
import { WorldCountryProfile } from "./types";

type ProvinceInfoCardProps = {
  regionName: string | null;
  profile: ProvinceProfile | WorldCountryProfile | null;
  currentTime?: string | null;
  sourceText?: string;
  titleLabel?: string;
  isWorld?: boolean;
  uiLanguage?: "zh" | "en" | "none";
};

export function ProvinceInfoCard({ regionName, profile, currentTime, sourceText, titleLabel, isWorld, uiLanguage = "zh" }: ProvinceInfoCardProps) {
  if (!regionName) return null;

  const isEn = uiLanguage === "en";
  const rankSuffix = (rank: string) => {
    if (!rank || rank === "待补充") return "";
    return isEn ? ` (Rank ${rank})` : `（第${rank}）`;
  };

  return (
    <div className="absolute top-3 left-3 z-20 w-[220px] rounded-lg border border-gray-200 dark:border-[#333333] bg-white/92 dark:bg-[#171717]/92 backdrop-blur px-3 py-2 shadow-lg">
      <div className="text-xs font-semibold text-[#151E32] dark:text-white">{titleLabel ? `${titleLabel}：${regionName}` : regionName}</div>
      <div className="mt-1 space-y-0.5 text-[11px] text-gray-600 dark:text-gray-300">
        {profile && (
          <>
            <div>{isWorld && isEn ? "Capital" : "省会"}：{profile.capital}</div>
            <div>{isWorld && isEn ? "Area" : "面积"}：{profile.area}</div>
            <div>{isWorld && isEn ? "Population" : "人口"}：{profile.population}{rankSuffix(profile.populationRank)}</div>
            <div>{isWorld && isEn ? "GDP" : "GDP"}：{profile.gdp}{rankSuffix(profile.gdpRank)}</div>
          </>
        )}
        {currentTime && <div>{isWorld && isEn ? "Local Time" : "当前时间"}：{currentTime}</div>}
      </div>
      {sourceText && <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">{sourceText}</div>}
    </div>
  );
}
