"use client";

import { useEffect, useState } from "react";
import { getLocalizedWorldCapital, getWorldCountryCanonicalName } from "./constants";
import { WorldRuntimeMeta } from "./types";
import { normalizeName } from "./world-utils";

type UseWorldMapDataParams = {
  isOpen: boolean;
  mapScope: "china" | "world";
};

export function useWorldMapData({ isOpen, mapScope }: UseWorldMapDataParams) {
  const [worldGdpByName, setWorldGdpByName] = useState<Record<string, number>>({});
  const [worldMetaByName, setWorldMetaByName] = useState<Record<string, WorldRuntimeMeta>>({});
  const [worldMetaByIso, setWorldMetaByIso] = useState<Record<string, WorldRuntimeMeta>>({});

  useEffect(() => {
    if (!isOpen || mapScope !== "world") return;
    if (Object.keys(worldMetaByName).length > 0 && Object.keys(worldGdpByName).length > 0) return;
    let cancelled = false;

    const fetchSnapshot = async () => {
      try {
        const response = await fetch("/geo/world-meta.snapshot.json", { cache: "force-cache" });
        if (!response.ok) return;
        const snapshot = await response.json();
        if (cancelled) return;

        const metaByName = snapshot?.worldMetaByName || {};
        const metaByIso = snapshot?.worldMetaByIso || {};
        const gdpByName = snapshot?.worldGdpByName || {};

        if (Object.keys(metaByName).length > 0 && Object.keys(worldMetaByName).length === 0) {
          setWorldMetaByName(metaByName);
        }
        if (Object.keys(metaByIso).length > 0 && Object.keys(worldMetaByIso).length === 0) {
          setWorldMetaByIso(metaByIso);
        }
        if (Object.keys(gdpByName).length > 0 && Object.keys(worldGdpByName).length === 0) {
          setWorldGdpByName(gdpByName);
        }
      } catch {
      }
    };

    fetchSnapshot();
    return () => {
      cancelled = true;
    };
  }, [isOpen, mapScope, worldMetaByName, worldMetaByIso, worldGdpByName]);

  useEffect(() => {
    if (!isOpen || mapScope !== "world") return;
    if (Object.keys(worldGdpByName).length > 0) return;
    let cancelled = false;

    const fetchGdp = async () => {
      try {
        const response = await fetch(
          "https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD?format=json&per_page=20000"
        );
        const payload = await response.json();
        const rows = Array.isArray(payload) ? payload[1] : [];
        const byName: Record<string, { year: number; value: number }> = {};

        (rows || []).forEach((row: any) => {
          const name = String(row?.country?.value || "").trim();
          const iso = String(row?.country?.id || "").toUpperCase();
          const value = Number(row?.value);
          const year = Number(row?.date || 0);
          if (!name || Number.isNaN(value) || value <= 0) return;

          const keys = [normalizeName(getWorldCountryCanonicalName(name))];
          if (iso.length === 2) keys.push(`__iso_${iso}`);

          keys.forEach((key) => {
            const prev = byName[key];
            if (!prev || year > prev.year) {
              byName[key] = { year, value };
            }
          });
        });

        if (cancelled) return;

        const result: Record<string, number> = {};
        Object.entries(byName).forEach(([key, row]) => {
          result[key] = row.value;
        });
        setWorldGdpByName(result);
      } catch {
      }
    };

    fetchGdp();
    return () => {
      cancelled = true;
    };
  }, [isOpen, mapScope, worldGdpByName]);

  useEffect(() => {
    if (!isOpen || mapScope !== "world") return;
    if (Object.keys(worldMetaByName).length > 0) return;
    let cancelled = false;

    const fetchWorldMeta = async () => {
      const urls = [
        "https://restcountries.com/v3.1/all?fields=name,translations,capital,population,area,cca2,altSpellings,region",
        "https://restcountries.com/v2/all?fields=name,translations,capital,population,area,alpha2Code,region",
        "https://cdn.jsdelivr.net/gh/mledoze/countries@master/countries.json"
      ];
      const mergeEntity = (prev: WorldRuntimeMeta | undefined, next: WorldRuntimeMeta): WorldRuntimeMeta => ({
        zhName: prev?.zhName || next.zhName,
        capitalEn: prev?.capitalEn || next.capitalEn,
        capitalZh: prev?.capitalZh || next.capitalZh,
        population: prev?.population || next.population,
        area: prev?.area || next.area,
        iso: prev?.iso || next.iso,
        region: prev?.region || next.region
      });

      const byName: Record<string, WorldRuntimeMeta> = {};
      const byIso: Record<string, WorldRuntimeMeta> = {};

      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const rows = await response.json();
          if (!Array.isArray(rows) || rows.length === 0) continue;

          rows.forEach((row: any) => {
            const hasV3Shape = typeof row?.name === "object" || !!row?.cca2;
            const enName = String(hasV3Shape ? row?.name?.common : row?.name || "").trim();
            const official = String(hasV3Shape ? row?.name?.official : "").trim();
            const iso = String(hasV3Shape ? row?.cca2 : row?.alpha2Code || "").toUpperCase();
            const capitalEn = String(hasV3Shape ? row?.capital?.[0] : row?.capital || "").trim();
            const translations = row?.translations || {};
            const zhName = String(
              (translations?.zho?.common || translations?.zho?.official || translations?.zh || translations?.cmn || "") || ""
            ).trim();
            const population = Number(row?.population);
            const area = Number(row?.area);
            const region = String(row?.region || "").trim();
            const entity = {
              zhName: zhName || undefined,
              capitalEn: capitalEn || undefined,
              capitalZh: capitalEn ? getLocalizedWorldCapital(capitalEn, "zh") : undefined,
              population: Number.isFinite(population) ? population : undefined,
              area: Number.isFinite(area) ? area : undefined,
              iso: iso || undefined,
              region: region || undefined
            };
            const nativeNames = Object.values(row?.name?.nativeName || {}).flatMap((item: any) => [item?.common, item?.official]);
            const names = [enName, official, ...(Array.isArray(row?.altSpellings) ? row.altSpellings : []), ...nativeNames]
              .map((name) => String(name || "").trim())
              .filter(Boolean);
            names.forEach((name) => {
              const key = normalizeName(getWorldCountryCanonicalName(name));
              byName[key] = mergeEntity(byName[key], entity);
            });
            if (iso.length === 2) byIso[iso] = mergeEntity(byIso[iso], entity);
          });
        } catch {
        }
      }

      if (!cancelled && Object.keys(byName).length > 0) {
        setWorldMetaByName(byName);
        setWorldMetaByIso(byIso);
      }
    };

    fetchWorldMeta();
    return () => {
      cancelled = true;
    };
  }, [isOpen, mapScope, worldMetaByName]);

  return {
    worldGdpByName,
    worldMetaByName,
    worldMetaByIso
  };
}
