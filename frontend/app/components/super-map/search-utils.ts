"use client";

import {
  PROVINCE_INFO,
  getLocalizedWorldCapital,
  getWorldCountryCanonicalName,
  getWorldCountryProfile,
  getWorldCountryZhName
} from "./constants";
import { SearchItem } from "./types";
import { getFeatureAnchor, normalizeName } from "./world-utils";

export function buildSearchItems(params: {
  mapGeoJson: any;
  worldGeoJson: any;
  worldMetaByName: Record<string, { zhName?: string; capitalEn?: string }>;
  marineSearchItems: SearchItem[];
}) {
  const { mapGeoJson, worldGeoJson, worldMetaByName, marineSearchItems } = params;
  const items: SearchItem[] = [];

  Object.keys(PROVINCE_INFO).forEach((name) => {
    const feature = Array.isArray(mapGeoJson?.features)
      ? mapGeoJson.features.find((item: any) => String(item?.properties?.name || "") === name)
      : null;

    items.push({
      key: `china_${name}`,
      label: name,
      type: "china_region",
      targetName: name,
      targetScope: "china",
      coord: feature ? getFeatureAnchor(feature) : null
    });
  });

  const worldFeatures = Array.isArray(worldGeoJson?.features) ? worldGeoJson.features : [];
  const worldByCanonical: Record<string, { rawName: string; canonicalName: string; coord: [number, number] | null }> = {};

  worldFeatures.forEach((feature: any) => {
    const rawName = String(feature?.properties?.name || "");
    const canonicalName = getWorldCountryCanonicalName(rawName);
    const normalizedKey = normalizeName(canonicalName);
    if (worldByCanonical[normalizedKey]) return;

    worldByCanonical[normalizedKey] = {
      rawName,
      canonicalName,
      coord: getFeatureAnchor(feature)
    };
  });

  Object.values(worldByCanonical).forEach((item) => {
    const zhName =
      worldMetaByName[normalizeName(item.canonicalName)]?.zhName ||
      getWorldCountryZhName(item.canonicalName) ||
      item.canonicalName;

    items.push({
      key: `world_${item.rawName}`,
      label: zhName,
      type: "world_country",
      targetName: item.rawName,
      targetScope: "world",
      coord: item.coord
    });

    const profile = getWorldCountryProfile(item.canonicalName);
    const capitalEn = worldMetaByName[normalizeName(item.canonicalName)]?.capitalEn || profile.capital;
    const capitalZh = getLocalizedWorldCapital(capitalEn, "zh");

    if (capitalZh) {
      items.push({
        key: `capital_zh_${item.rawName}`,
        label: `${capitalZh} (Capital)`,
        type: "world_capital",
        targetName: item.rawName,
        targetScope: "world",
        coord: item.coord
      });
    }

    if (capitalEn) {
      items.push({
        key: `capital_en_${item.rawName}`,
        label: `${capitalEn} (Capital)`,
        type: "world_capital",
        targetName: item.rawName,
        targetScope: "world",
        coord: item.coord
      });
    }
  });

  return [...items, ...marineSearchItems];
}

export function filterSearchResults(searchItems: SearchItem[], keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword || normalizedKeyword.length < 2) return [];

  const matched = searchItems.filter((item) => item.label.toLowerCase().includes(normalizedKeyword));
  const order: Record<SearchItem["type"], number> = {
    china_region: 0,
    world_country: 1,
    world_capital: 2,
    marine: 3
  };

  return matched
    .sort((a, b) => {
      const oa = order[a.type];
      const ob = order[b.type];
      if (oa !== ob) return oa - ob;
      return a.label.length - b.label.length;
    })
    .slice(0, 10);
}
