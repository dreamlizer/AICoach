"use client";

import { getWorldCountryCanonicalName, getWorldCountryZhName } from "./constants";
import { MapScope, WorldRuntimeMeta } from "./types";
import { normalizeName as normalizeWorldName } from "./world-utils";

const BATCH_INPUT_SPLIT_RE = /[,，;；、\s]+/g;
const BATCH_CHINA_SUFFIX_RE = /(省|市|壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|行政区)$/g;
const BATCH_WORLD_PREFIX_RE = /^the\s+/i;
const BATCH_WORLD_ZH_SUFFIX_RE = /(伊斯兰共和国|联邦共和国|人民共和国|共和国|王国|联邦|合众国|国)$/g;

const CHINA_ALIAS_PAIRS: Array<[string, string]> = [
  ["内蒙", "内蒙古"],
  ["广西壮族自治区", "广西"],
  ["宁夏回族自治区", "宁夏"],
  ["新疆维吾尔自治区", "新疆"],
  ["西藏自治区", "西藏"],
  ["香港特别行政区", "香港"],
  ["澳门特别行政区", "澳门"],
  ["北京市", "北京"],
  ["天津市", "天津"],
  ["上海市", "上海"],
  ["重庆市", "重庆"]
];

const WORLD_ALIAS_PAIRS: Array<[string, string]> = [
  ["美国", "United States"],
  ["美國", "United States"],
  ["中华人民共和国", "China"],
  ["中国", "China"],
  ["英国", "United Kingdom"],
  ["俄罗斯", "Russia"],
  ["南韩", "South Korea"],
  ["韩国", "South Korea"],
  ["朝鲜", "North Korea"],
  ["usa", "United States"],
  ["u.s.a", "United States"],
  ["u.s.", "United States"],
  ["uk", "United Kingdom"],
  ["uae", "United Arab Emirates"],
  ["korea", "South Korea"],
  ["republic of korea", "South Korea"],
  ["korea republic", "South Korea"],
  ["dprk", "North Korea"],
  ["north korea", "North Korea"],
  ["south korea", "South Korea"]
];

function normalizeBatchKey(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()（）'"`’‘“”.,，;；:：。！？!?、\-_/\\]+/g, "");
}

function normalizeChinaAlias(value: string) {
  let next = String(value || "").trim();
  if (!next) return "";
  let prev = "";
  while (next !== prev) {
    prev = next;
    next = next.replace(BATCH_CHINA_SUFFIX_RE, "");
  }
  return next.trim();
}

function normalizeWorldZhAlias(value: string) {
  let next = String(value || "").trim();
  if (!next) return "";
  let prev = "";
  while (next !== prev) {
    prev = next;
    next = next.replace(BATCH_WORLD_ZH_SUFFIX_RE, "");
  }
  return next.trim();
}

function addAlias(aliasMap: Map<string, string>, alias: string, target: string) {
  const key = normalizeBatchKey(alias);
  if (!key || aliasMap.has(key)) return;
  aliasMap.set(key, target);
}

export function parseBatchTokens(raw: string) {
  const tokens = String(raw || "")
    .split(BATCH_INPUT_SPLIT_RE)
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(tokens));
}

export function createScopeSummaryTitle(scope: MapScope) {
  return scope === "china" ? "中国地图批量选择结果" : "世界地图批量选择结果";
}

export function createScopeHint(scope: MapScope) {
  return scope === "china"
    ? "当前模式：中国地图（仅支持省级名称）"
    : "当前模式：世界地图（仅支持国家名称）";
}

export function buildChinaBatchAliasMap(params: {
  mapGeoJson: any;
  regionEnMap: Record<string, string>;
}) {
  const { mapGeoJson, regionEnMap } = params;
  const aliasMap = new Map<string, string>();

  const chinaNames: string[] = Array.from(
    new Set(
      (Array.isArray(mapGeoJson?.features) ? mapGeoJson.features : [])
        .map((feature: any) => String(feature?.properties?.name || "").trim())
        .filter(Boolean)
    )
  );

  chinaNames.forEach((name) => {
    const short = normalizeChinaAlias(name);
    addAlias(aliasMap, name, name);
    addAlias(aliasMap, short, name);
    addAlias(aliasMap, `${short}省`, name);
    addAlias(aliasMap, `${short}市`, name);
    addAlias(aliasMap, `${short}自治区`, name);
    addAlias(aliasMap, `${short}特别行政区`, name);
    const en = regionEnMap[name];
    if (en) addAlias(aliasMap, en, name);
  });

  CHINA_ALIAS_PAIRS.forEach(([alias, target]) => addAlias(aliasMap, alias, target));
  return aliasMap;
}

export function buildWorldBatchAliasMap(params: {
  activeWorldGeoJson: any;
  worldMetaByName: Record<string, WorldRuntimeMeta>;
}) {
  const { activeWorldGeoJson, worldMetaByName } = params;
  const aliasMap = new Map<string, string>();

  const worldNames: string[] = Array.from(
    new Set(
      (Array.isArray(activeWorldGeoJson?.features) ? activeWorldGeoJson.features : [])
        .map((feature: any) => String(feature?.properties?.name || "").trim())
        .filter(Boolean)
        .map((name: string) => getWorldCountryCanonicalName(name))
        .filter(Boolean)
    )
  );

  worldNames.forEach((canonical) => {
    const normalized = normalizeWorldName(canonical);
    const runtimeZh = worldMetaByName[normalized]?.zhName || getWorldCountryZhName(canonical);
    addAlias(aliasMap, canonical, canonical);
    addAlias(aliasMap, canonical.replace(BATCH_WORLD_PREFIX_RE, ""), canonical);
    addAlias(aliasMap, canonical.replace(/\bof\b/gi, ""), canonical);
    if (runtimeZh) {
      const zhShort = normalizeWorldZhAlias(runtimeZh);
      addAlias(aliasMap, runtimeZh, canonical);
      addAlias(aliasMap, zhShort, canonical);
      addAlias(aliasMap, `${zhShort}国`, canonical);
    }
  });

  WORLD_ALIAS_PAIRS.forEach(([alias, target]) =>
    addAlias(aliasMap, alias, getWorldCountryCanonicalName(target))
  );
  return aliasMap;
}

export function resolveBatchSelection(tokens: string[], aliasMap: Map<string, string>) {
  const matchedSet = new Set<string>();
  const missingSet = new Set<string>();

  tokens.forEach((token) => {
    const target =
      aliasMap.get(normalizeBatchKey(token)) ||
      aliasMap.get(normalizeBatchKey(normalizeChinaAlias(token))) ||
      aliasMap.get(normalizeBatchKey(normalizeWorldZhAlias(token)));
    if (target) matchedSet.add(target);
    else missingSet.add(token);
  });

  return {
    matched: Array.from(matchedSet),
    missing: Array.from(missingSet)
  };
}
