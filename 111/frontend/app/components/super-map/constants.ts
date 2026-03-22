"use client";

import { FontFamilyOption, PersistedState, ProvinceProfile, ThemePreset, WorldCountryProfile } from "./types";

export const chinaGeoJson = (require("china-map-geojson") as any).ChinaData;
export const worldGeoJson = (require("geojson-world-map/lib/world").default || require("geojson-world-map/lib/world")) as any;

export const MIN_MAP_ZOOM = 0.7;
export const MAX_MAP_ZOOM = 5;

export const DEFAULT_STATE: PersistedState = {
  selectedNames: [],
  labelLanguage: "zh",
  highlightColor: "#F59E0B",
  baseColor: "#C7CCD4",
  borderColor: "#FFFFFF",
  hoverColor: "#FDBA74",
  fontColor: "#0F172A",
  fontSize: 11,
  fontWeight: 600,
  fontFamily: '"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif',
  themeId: "gold-slate",
  mapZoom: 1.05
};

export const THEME_PRESETS: ThemePreset[] = [
  { id: "gold-slate", name: "鎏金灰", highlightColor: "#F59E0B", baseColor: "#C7CCD4", borderColor: "#FFFFFF", hoverColor: "#FDE7B3" },
  { id: "ocean-cyan", name: "深海蓝", highlightColor: "#22D3EE", baseColor: "#CBD5E1", borderColor: "#0F172A", hoverColor: "#D5F8FF" },
  { id: "jade-ink", name: "青瓷绿", highlightColor: "#10B981", baseColor: "#D1D5DB", borderColor: "#1F2937", hoverColor: "#D9FBEF" },
  { id: "violet-mist", name: "暮山紫", highlightColor: "#8B5CF6", baseColor: "#D4D4D8", borderColor: "#312E81", hoverColor: "#EDE4FF" },
  { id: "ember-night", name: "极夜橙", highlightColor: "#FB923C", baseColor: "#9CA3AF", borderColor: "#111827", hoverColor: "#FFE6D3" }
];

export const COLOR_SWATCHES = {
  highlight: ["#F59E0B", "#22D3EE", "#10B981", "#8B5CF6", "#FB7185", "#F97316"],
  base: ["#E5E7EB", "#D1D5DB", "#CBD5E1", "#E2E8F0", "#D4D4D8", "#C7CCD4"],
  border: ["#FFFFFF", "#0F172A", "#1F2937", "#312E81", "#0B3B4D", "#2F2F2F"],
  hover: ["#FDBA74", "#67E8F9", "#34D399", "#A78BFA", "#FB7185", "#FCD34D"]
};

export const FONT_FAMILIES: FontFamilyOption[] = [
  { label: "系统黑体", value: '"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif' },
  { label: "宋体", value: '"SimSun","Songti SC",serif' },
  { label: "思源黑体", value: '"Noto Sans SC","Source Han Sans SC","Microsoft YaHei",sans-serif' },
  { label: "苹方", value: '"PingFang SC","Helvetica Neue",sans-serif' }
];

export const FONT_COLOR_SWATCHES = ["#0F172A", "#1E3A8A", "#334155", "#065F46", "#7C2D12", "#111827"];

export const REGION_EN_MAP: Record<string, string> = {
  北京: "Beijing",
  天津: "Tianjin",
  上海: "Shanghai",
  重庆: "Chongqing",
  河北: "Hebei",
  河南: "Henan",
  云南: "Yunnan",
  辽宁: "Liaoning",
  黑龙江: "Heilongjiang",
  湖南: "Hunan",
  安徽: "Anhui",
  山东: "Shandong",
  新疆: "Xinjiang",
  江苏: "Jiangsu",
  浙江: "Zhejiang",
  江西: "Jiangxi",
  湖北: "Hubei",
  广西: "Guangxi",
  甘肃: "Gansu",
  山西: "Shanxi",
  内蒙古: "Inner Mongolia",
  陕西: "Shaanxi",
  吉林: "Jilin",
  福建: "Fujian",
  贵州: "Guizhou",
  广东: "Guangdong",
  青海: "Qinghai",
  西藏: "Tibet",
  四川: "Sichuan",
  宁夏: "Ningxia",
  海南: "Hainan",
  台湾: "Taiwan",
  香港: "Hong Kong",
  澳门: "Macau"
};

export const PROVINCE_INFO: Record<string, ProvinceProfile> = {
  北京: { capital: "北京", area: "1.64万 km²", population: "2185万", gdp: "4.38万亿元", populationRank: "26", gdpRank: "13" },
  天津: { capital: "天津", area: "1.19万 km²", population: "1364万", gdp: "1.67万亿元", populationRank: "30", gdpRank: "17" },
  河北: { capital: "石家庄", area: "18.88万 km²", population: "7393万", gdp: "4.39万亿元", populationRank: "6", gdpRank: "12" },
  山西: { capital: "太原", area: "15.67万 km²", population: "3447万", gdp: "2.57万亿元", populationRank: "19", gdpRank: "20" },
  内蒙古: { capital: "呼和浩特", area: "118.3万 km²", population: "2396万", gdp: "2.46万亿元", populationRank: "23", gdpRank: "21" },
  辽宁: { capital: "沈阳", area: "14.8万 km²", population: "4259万", gdp: "3.03万亿元", populationRank: "14", gdpRank: "16" },
  吉林: { capital: "长春", area: "18.74万 km²", population: "2348万", gdp: "1.35万亿元", populationRank: "24", gdpRank: "24" },
  黑龙江: { capital: "哈尔滨", area: "47.3万 km²", population: "3062万", gdp: "1.65万亿元", populationRank: "20", gdpRank: "18" },
  上海: { capital: "上海", area: "0.63万 km²", population: "2488万", gdp: "4.72万亿元", populationRank: "22", gdpRank: "11" },
  江苏: { capital: "南京", area: "10.72万 km²", population: "8526万", gdp: "12.82万亿元", populationRank: "4", gdpRank: "2" },
  浙江: { capital: "杭州", area: "10.55万 km²", population: "6627万", gdp: "8.26万亿元", populationRank: "9", gdpRank: "4" },
  安徽: { capital: "合肥", area: "14.01万 km²", population: "6121万", gdp: "4.71万亿元", populationRank: "10", gdpRank: "10" },
  福建: { capital: "福州", area: "12.4万 km²", population: "4183万", gdp: "5.43万亿元", populationRank: "15", gdpRank: "8" },
  江西: { capital: "南昌", area: "16.69万 km²", population: "4518万", gdp: "3.22万亿元", populationRank: "13", gdpRank: "15" },
  山东: { capital: "济南", area: "15.79万 km²", population: "10123万", gdp: "9.20万亿元", populationRank: "2", gdpRank: "3" },
  河南: { capital: "郑州", area: "16.7万 km²", population: "9815万", gdp: "6.14万亿元", populationRank: "3", gdpRank: "5" },
  湖北: { capital: "武汉", area: "18.59万 km²", population: "5838万", gdp: "5.58万亿元", populationRank: "11", gdpRank: "7" },
  湖南: { capital: "长沙", area: "21.18万 km²", population: "6568万", gdp: "5.00万亿元", populationRank: "8", gdpRank: "9" },
  广东: { capital: "广州", area: "17.98万 km²", population: "12706万", gdp: "13.57万亿元", populationRank: "1", gdpRank: "1" },
  广西: { capital: "南宁", area: "23.76万 km²", population: "5027万", gdp: "2.72万亿元", populationRank: "12", gdpRank: "19" },
  海南: { capital: "海口", area: "3.54万 km²", population: "1043万", gdp: "0.76万亿元", populationRank: "31", gdpRank: "28" },
  重庆: { capital: "重庆", area: "8.24万 km²", population: "3213万", gdp: "3.01万亿元", populationRank: "18", gdpRank: "14" },
  四川: { capital: "成都", area: "48.6万 km²", population: "8368万", gdp: "6.00万亿元", populationRank: "5", gdpRank: "6" },
  贵州: { capital: "贵阳", area: "17.62万 km²", population: "3865万", gdp: "2.09万亿元", populationRank: "17", gdpRank: "22" },
  云南: { capital: "昆明", area: "39.41万 km²", population: "4673万", gdp: "2.89万亿元", populationRank: "16", gdpRank: "13" },
  西藏: { capital: "拉萨", area: "122.84万 km²", population: "364万", gdp: "0.24万亿元", populationRank: "34", gdpRank: "31" },
  陕西: { capital: "西安", area: "20.56万 km²", population: "3956万", gdp: "3.37万亿元", populationRank: "16", gdpRank: "14" },
  甘肃: { capital: "兰州", area: "42.58万 km²", population: "2465万", gdp: "1.18万亿元", populationRank: "22", gdpRank: "25" },
  青海: { capital: "西宁", area: "72.23万 km²", population: "595万", gdp: "0.40万亿元", populationRank: "33", gdpRank: "30" },
  宁夏: { capital: "银川", area: "6.64万 km²", population: "729万", gdp: "0.55万亿元", populationRank: "32", gdpRank: "29" },
  新疆: { capital: "乌鲁木齐", area: "166万 km²", population: "2587万", gdp: "1.92万亿元", populationRank: "21", gdpRank: "23" },
  台湾: { capital: "台北", area: "3.6万 km²", population: "2330万", gdp: "约5.3万亿元", populationRank: "24", gdpRank: "约9" },
  香港: { capital: "香港", area: "1114 km²", population: "750万", gdp: "约2.8万亿元", populationRank: "32", gdpRank: "约16" },
  澳门: { capital: "澳门", area: "33 km²", population: "68万", gdp: "约0.33万亿元", populationRank: "34", gdpRank: "约30" }
};

export const WORLD_COUNTRY_INFO: Record<string, WorldCountryProfile> = {
  China: { capital: "Beijing", area: "960万 km²", population: "14.10亿", gdp: "17.89万亿美元", populationRank: "2", gdpRank: "2", timezone: "Asia/Shanghai" },
  "United States": { capital: "Washington, D.C.", area: "983万 km²", population: "3.34亿", gdp: "27.36万亿美元", populationRank: "3", gdpRank: "1", timezone: "America/New_York" },
  "United States of America": { capital: "Washington, D.C.", area: "983万 km²", population: "3.34亿", gdp: "27.36万亿美元", populationRank: "3", gdpRank: "1", timezone: "America/New_York" },
  India: { capital: "New Delhi", area: "328万 km²", population: "14.29亿", gdp: "3.57万亿美元", populationRank: "1", gdpRank: "5", timezone: "Asia/Kolkata" },
  Japan: { capital: "Tokyo", area: "37.8万 km²", population: "1.23亿", gdp: "4.21万亿美元", populationRank: "12", gdpRank: "4", timezone: "Asia/Tokyo" },
  Germany: { capital: "Berlin", area: "35.8万 km²", population: "8436万", gdp: "4.52万亿美元", populationRank: "19", gdpRank: "3", timezone: "Europe/Berlin" },
  France: { capital: "Paris", area: "64.3万 km²", population: "6800万", gdp: "3.05万亿美元", populationRank: "22", gdpRank: "7", timezone: "Europe/Paris" },
  "United Kingdom": { capital: "London", area: "24.3万 km²", population: "6770万", gdp: "3.39万亿美元", populationRank: "21", gdpRank: "6", timezone: "Europe/London" },
  Brazil: { capital: "Brasília", area: "851万 km²", population: "2.16亿", gdp: "2.17万亿美元", populationRank: "7", gdpRank: "9", timezone: "America/Sao_Paulo" },
  Russia: { capital: "Moscow", area: "1709万 km²", population: "1.44亿", gdp: "2.02万亿美元", populationRank: "9", gdpRank: "11", timezone: "Europe/Moscow" },
  Canada: { capital: "Ottawa", area: "998万 km²", population: "4020万", gdp: "2.14万亿美元", populationRank: "38", gdpRank: "10", timezone: "America/Toronto" },
  Australia: { capital: "Canberra", area: "769万 km²", population: "2660万", gdp: "1.72万亿美元", populationRank: "55", gdpRank: "13", timezone: "Australia/Sydney" },
  Mexico: { capital: "Mexico City", area: "196万 km²", population: "1.29亿", gdp: "1.81万亿美元", populationRank: "10", gdpRank: "12", timezone: "America/Mexico_City" },
  Indonesia: { capital: "Jakarta", area: "191万 km²", population: "2.77亿", gdp: "1.39万亿美元", populationRank: "4", gdpRank: "16", timezone: "Asia/Jakarta" },
  Turkey: { capital: "Ankara", area: "78.3万 km²", population: "8537万", gdp: "1.12万亿美元", populationRank: "18", gdpRank: "17", timezone: "Europe/Istanbul" },
  "Saudi Arabia": { capital: "Riyadh", area: "215万 km²", population: "3640万", gdp: "1.11万亿美元", populationRank: "41", gdpRank: "18", timezone: "Asia/Riyadh" },
  "South Africa": { capital: "Pretoria", area: "122万 km²", population: "6200万", gdp: "0.40万亿美元", populationRank: "24", gdpRank: "32", timezone: "Africa/Johannesburg" }
};

export const WORLD_COUNTRY_TIMEZONE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(WORLD_COUNTRY_INFO).map(([name, info]) => [name, info.timezone])
);

export const WORLD_DATA_SOURCE_TEXT = "World Bank Data (Population / GDP), Snapshot: 2024";

export const WORLD_COUNTRY_ZH_MAP: Record<string, string> = {
  China: "中国",
  "United States": "美国",
  "United States of America": "美国",
  India: "印度",
  Japan: "日本",
  Germany: "德国",
  France: "法国",
  "United Kingdom": "英国",
  Brazil: "巴西",
  Russia: "俄罗斯",
  Canada: "加拿大",
  Australia: "澳大利亚",
  Mexico: "墨西哥",
  Indonesia: "印度尼西亚",
  Turkey: "土耳其",
  "Saudi Arabia": "沙特阿拉伯",
  "South Africa": "南非",
  Italy: "意大利",
  Spain: "西班牙",
  Argentina: "阿根廷",
  Kazakhstan: "哈萨克斯坦",
  Mongolia: "蒙古",
  Greenland: "格陵兰",
  "South Korea": "韩国",
  "North Korea": "朝鲜",
  Ukraine: "乌克兰",
  Egypt: "埃及",
  Iran: "伊朗",
  Iraq: "伊拉克",
  Thailand: "泰国",
  Vietnam: "越南",
  Philippines: "菲律宾",
  Malaysia: "马来西亚",
  Singapore: "新加坡",
  "New Zealand": "新西兰"
};

const worldCountriesModule = require("world-countries");
const countriesAndTimezones = require("countries-and-timezones");
const countryPopulationRows = (require("country-json/src/country-by-population.json") || []) as any[];
const countryAreaRows = (require("country-json/src/country-by-surface-area.json") || []) as any[];
const countryCapitalRows = (require("country-json/src/country-by-capital-city.json") || []) as any[];
const worldCountries = (() => {
  if (Array.isArray(worldCountriesModule)) return worldCountriesModule;
  if (Array.isArray(worldCountriesModule?.default)) return worldCountriesModule.default;
  const firstArray = Object.values(worldCountriesModule || {}).find((value) =>
    Array.isArray(value)
  );
  return Array.isArray(firstArray) ? firstArray : [];
})() as any[];

function normalizeWorldName(name: string) {
  return name.toLowerCase().replace(/[.\-,'’()]/g, " ").replace(/\s+/g, " ").trim();
}

const WORLD_NAME_ALIAS_TO_CANONICAL: Record<string, string> = {
  "Dem. Rep. Congo": "Democratic Republic of the Congo",
  "Central African Rep.": "Central African Republic",
  "Eq. Guinea": "Equatorial Guinea",
  "S. Sudan": "South Sudan",
  "W. Sahara": "Western Sahara",
  "Bosnia and Herz.": "Bosnia and Herzegovina",
  "Dominican Rep.": "Dominican Republic",
  "Solomon Is.": "Solomon Islands",
  "N. Cyprus": "Northern Cyprus",
  "Falkland Is.": "Falkland Islands",
  "Fr. S. Antarctic Lands": "French Southern and Antarctic Lands",
  "Lao PDR": "Laos",
  "Czech Rep.": "Czechia",
  Macedonia: "North Macedonia",
  "Sao Tome and Principe": "São Tomé and Príncipe",
  "Timor-Leste": "East Timor",
  "Dem. Rep. Korea": "North Korea",
  "Korea": "South Korea"
};

const WORLD_ZH_BY_NORMALIZED_NAME: Record<string, string> = {};
const WORLD_POPULATION_BY_NORMALIZED_NAME: Record<string, number> = {};
const WORLD_AREA_BY_NORMALIZED_NAME: Record<string, number> = {};
const WORLD_CAPITAL_BY_NORMALIZED_NAME: Record<string, string> = {};
worldCountries.forEach((country: any) => {
  const zhName =
    country?.translations?.zho?.common ||
    country?.translations?.zho?.official ||
    undefined;
  if (!zhName) return;
  const candidates = [
    country?.name?.common,
    country?.name?.official,
    ...(country?.altSpellings || [])
  ].filter(Boolean);
  candidates.forEach((name: string) => {
    WORLD_ZH_BY_NORMALIZED_NAME[normalizeWorldName(name)] = zhName;
  });
});

countryPopulationRows.forEach((row: any) => {
  if (!row?.country || typeof row?.population !== "number") return;
  WORLD_POPULATION_BY_NORMALIZED_NAME[normalizeWorldName(row.country)] = row.population;
});

countryAreaRows.forEach((row: any) => {
  if (!row?.country || typeof row?.area !== "number") return;
  WORLD_AREA_BY_NORMALIZED_NAME[normalizeWorldName(row.country)] = row.area;
});

countryCapitalRows.forEach((row: any) => {
  if (!row?.country || !row?.city) return;
  WORLD_CAPITAL_BY_NORMALIZED_NAME[normalizeWorldName(row.country)] = String(row.city);
});

Object.entries(WORLD_COUNTRY_ZH_MAP).forEach(([enName, zhName]) => {
  WORLD_ZH_BY_NORMALIZED_NAME[normalizeWorldName(enName)] = zhName;
});

Object.entries(WORLD_NAME_ALIAS_TO_CANONICAL).forEach(([alias, canonical]) => {
  const canonicalNormalized = normalizeWorldName(canonical);
  const aliasNormalized = normalizeWorldName(alias);
  if (WORLD_POPULATION_BY_NORMALIZED_NAME[canonicalNormalized]) {
    WORLD_POPULATION_BY_NORMALIZED_NAME[aliasNormalized] =
      WORLD_POPULATION_BY_NORMALIZED_NAME[canonicalNormalized];
  }
  if (WORLD_AREA_BY_NORMALIZED_NAME[canonicalNormalized]) {
    WORLD_AREA_BY_NORMALIZED_NAME[aliasNormalized] =
      WORLD_AREA_BY_NORMALIZED_NAME[canonicalNormalized];
  }
  if (WORLD_CAPITAL_BY_NORMALIZED_NAME[canonicalNormalized]) {
    WORLD_CAPITAL_BY_NORMALIZED_NAME[aliasNormalized] =
      WORLD_CAPITAL_BY_NORMALIZED_NAME[canonicalNormalized];
  }
});

export const WORLD_LABEL_PRIORITY = new Set<string>([
  "United States",
  "China",
  "United States of America",
  "Russia",
  "India",
  "Brazil",
  "Canada",
  "Australia",
  "Greenland",
  "Mexico",
  "Argentina",
  "Saudi Arabia",
  "Kazakhstan",
  "Mongolia",
  "South Africa",
  "Japan",
  "Germany",
  "France",
  "United Kingdom",
  "Indonesia"
]);

const WORLD_COUNTRY_ALIAS: Record<string, string> = {
  "United States": "United States of America"
};

export function getWorldCountryCanonicalName(name: string) {
  return WORLD_COUNTRY_ALIAS[name] || WORLD_NAME_ALIAS_TO_CANONICAL[name] || name;
}

export function getWorldCountryZhName(name: string) {
  const canonical = getWorldCountryCanonicalName(name);
  const normalized = normalizeWorldName(canonical);
  return WORLD_ZH_BY_NORMALIZED_NAME[normalized] || WORLD_ZH_BY_NORMALIZED_NAME[normalizeWorldName(name)] || undefined;
}

function formatPopulationZh(population: number) {
  if (population >= 100000000) return `${(population / 100000000).toFixed(2)}亿`;
  if (population >= 10000) return `${Math.round(population / 10000)}万`;
  return `${population}`;
}

function formatAreaZh(area: number) {
  if (area >= 10000) return `${(area / 10000).toFixed(2)}万 km²`;
  return `${area} km²`;
}

const WORLD_POPULATION_RANK_MAP: Record<string, number> = (() => {
  const rows = Object.entries(WORLD_POPULATION_BY_NORMALIZED_NAME)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const rankMap: Record<string, number> = {};
  rows.forEach((item, index) => {
    rankMap[item.name] = index + 1;
  });
  return rankMap;
})();

const ALL_WORLD_COUNTRIES = countriesAndTimezones.getAllCountries();
const WORLD_COUNTRY_ID_BY_NORMALIZED_NAME: Record<string, string> = {};
Object.entries(ALL_WORLD_COUNTRIES).forEach(([id, country]: any) => {
  const names = [country?.name].filter(Boolean) as string[];
  names.forEach((name) => {
    WORLD_COUNTRY_ID_BY_NORMALIZED_NAME[normalizeWorldName(name)] = id;
  });
});
WORLD_COUNTRY_ID_BY_NORMALIZED_NAME[normalizeWorldName("United States")] = "US";
WORLD_COUNTRY_ID_BY_NORMALIZED_NAME[normalizeWorldName("United States of America")] = "US";

export function getWorldCountryIdByName(name: string) {
  const canonical = getWorldCountryCanonicalName(name);
  return (
    WORLD_COUNTRY_ID_BY_NORMALIZED_NAME[normalizeWorldName(canonical)] ||
    WORLD_COUNTRY_ID_BY_NORMALIZED_NAME[normalizeWorldName(name)] ||
    null
  );
}

function getTimezoneByPoint(countryId: string | null, lng: number) {
  const oceanOffset = Math.max(-12, Math.min(14, Math.round(lng / 15)));
  if (!countryId) {
    return {
      timezoneName: `UTC${oceanOffset >= 0 ? "+" : ""}${oceanOffset}`,
      mode: "offset" as const
    };
  }
  const country = countriesAndTimezones.getCountry(countryId);
  if (!country?.timezones?.length) {
    return {
      timezoneName: `UTC${oceanOffset >= 0 ? "+" : ""}${oceanOffset}`,
      mode: "offset" as const
    };
  }
  if (country.timezones.length === 1) {
    return { timezoneName: country.timezones[0], mode: "iana" as const };
  }
  const targetOffsetMinutes = oceanOffset * 60;
  let bestTimezone = country.timezones[0];
  let bestDiff = Number.MAX_SAFE_INTEGER;
  country.timezones.forEach((timezoneName: string) => {
    const timezoneMeta = countriesAndTimezones.getTimezone(timezoneName);
    const timezoneOffset = Number(timezoneMeta?.utcOffset ?? targetOffsetMinutes);
    const diff = Math.abs(timezoneOffset - targetOffsetMinutes);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestTimezone = timezoneName;
    }
  });
  return { timezoneName: bestTimezone, mode: "iana" as const };
}

export function getWorldPointTimeInfo(countryName: string | null, lng: number, dateMs: number) {
  const canonicalName = countryName ? getWorldCountryCanonicalName(countryName) : null;
  if (canonicalName === "China") {
    const formatted = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(new Date(dateMs));
    return { timeText: formatted, timezoneText: "Asia/Shanghai" };
  }
  const countryId = canonicalName ? getWorldCountryIdByName(canonicalName) : null;
  const resolved = getTimezoneByPoint(countryId, lng);
  if (resolved.mode === "iana") {
    const formatted = new Intl.DateTimeFormat("zh-CN", {
      timeZone: resolved.timezoneName,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(new Date(dateMs));
    return { timeText: formatted, timezoneText: resolved.timezoneName };
  }
  const offsetHours = Number(resolved.timezoneName.replace("UTC", ""));
  const local = new Date(dateMs + offsetHours * 3600 * 1000);
  const timeText = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")} ${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}:${String(local.getUTCSeconds()).padStart(2, "0")}`;
  return { timeText, timezoneText: resolved.timezoneName };
}

export function getWorldCountryProfile(name: string): WorldCountryProfile {
  const canonical = getWorldCountryCanonicalName(name);
  if (WORLD_COUNTRY_INFO[canonical]) {
    return WORLD_COUNTRY_INFO[canonical];
  }
  if (WORLD_COUNTRY_INFO[name]) {
    return WORLD_COUNTRY_INFO[name];
  }
  const normalized = normalizeWorldName(canonical);
  const population = WORLD_POPULATION_BY_NORMALIZED_NAME[normalized];
  const area = WORLD_AREA_BY_NORMALIZED_NAME[normalized];
  const capital = WORLD_CAPITAL_BY_NORMALIZED_NAME[normalized];
  const populationRank = WORLD_POPULATION_RANK_MAP[normalized];
  const countryId = getWorldCountryIdByName(canonical);
  const timezone =
    countriesAndTimezones.getCountry(countryId || "")?.timezones?.[0] ||
    "UTC";
  return {
    capital: capital || "待补充",
    area: typeof area === "number" ? formatAreaZh(area) : "待补充",
    population:
      typeof population === "number" ? formatPopulationZh(population) : "待补充",
    gdp: "待补充",
    populationRank: populationRank ? String(populationRank) : "待补充",
    gdpRank: "待补充",
    timezone
  };
}

export function buildMapGeoJson() {
  const cloned = JSON.parse(JSON.stringify(chinaGeoJson));
  const cpOverrides: Record<string, [number, number]> = {
    河北: [114.72, 37.9],
    香港: [114.18, 22.15],
    澳门: [113.53, 22.02]
  };
  cloned.features?.forEach((feature: any) => {
    const regionName = String(feature?.properties?.name || "");
    if (cpOverrides[regionName]) {
      feature.properties.cp = cpOverrides[regionName];
    }
  });
  return cloned;
}

export function buildWorldGeoJson() {
  return JSON.parse(JSON.stringify(worldGeoJson));
}
