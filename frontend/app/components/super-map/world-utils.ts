"use client";

import { getWorldCountryCanonicalName } from "./constants";
import { WorldFocusRegion, WorldRuntimeMeta } from "./types";

export function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const fullHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;
  const int = parseInt(fullHex, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function normalizeName(name: string) {
  return name.toLowerCase().replace(/[.\-,'’)]/g, " ").replace(/\s+/g, " ").trim();
}

const SOUTH_AMERICA_COUNTRIES = new Set([
  "Argentina",
  "Bolivia",
  "Brazil",
  "Chile",
  "Colombia",
  "Ecuador",
  "Guyana",
  "Paraguay",
  "Peru",
  "Suriname",
  "Uruguay",
  "Venezuela",
  "Falkland Islands",
  "French Guiana"
]);

const NORTH_AMERICA_COUNTRIES = new Set([
  "Canada",
  "United States of America",
  "Mexico",
  "Greenland",
  "Guatemala",
  "Belize",
  "Honduras",
  "El Salvador",
  "Nicaragua",
  "Costa Rica",
  "Panama",
  "Cuba",
  "Jamaica",
  "Haiti",
  "Dominican Republic",
  "The Bahamas",
  "Trinidad and Tobago",
  "Barbados",
  "Saint Lucia",
  "Antigua and Barbuda",
  "Dominica",
  "Saint Vincent and the Grenadines",
  "Grenada",
  "Puerto Rico"
]);

export function getWorldFeaturesByRegion(
  region: WorldFocusRegion,
  sourceGeoJson: any,
  worldMetaByName: Record<string, WorldRuntimeMeta>
) {
  const features = Array.isArray(sourceGeoJson?.features) ? sourceGeoJson.features : [];
  if (region === "ALL") return features;
  const primaryMatches = features.filter((feature: any) => {
    const rawName = String(feature?.properties?.name || "");
    const canonicalName = getWorldCountryCanonicalName(rawName);
    if (region === "NorthAmerica") return NORTH_AMERICA_COUNTRIES.has(canonicalName);
    if (region === "SouthAmerica") return SOUTH_AMERICA_COUNTRIES.has(canonicalName);
    const regionRaw = String(
      worldMetaByName[normalizeName(canonicalName)]?.region ||
        worldMetaByName[normalizeName(rawName)]?.region ||
        ""
    );
    const normalizedRegion = regionRaw === "Americas" ? "Americas" : regionRaw;
    return normalizedRegion === region;
  });
  if (primaryMatches.length > 0) return primaryMatches;
  if (Object.keys(worldMetaByName).length > 0) return primaryMatches;
  const fallbackBounds: Record<Exclude<WorldFocusRegion, "ALL">, { lng: [number, number]; lat: [number, number] }> = {
    Africa: { lng: [-25, 60], lat: [-38, 38] },
    Asia: { lng: [25, 180], lat: [-12, 80] },
    Europe: { lng: [-30, 65], lat: [32, 73] },
    NorthAmerica: { lng: [-170, -15], lat: [5, 84] },
    SouthAmerica: { lng: [-93, -30], lat: [-58, 16] },
    Oceania: { lng: [110, 180], lat: [-55, 10] }
  };
  const scope = fallbackBounds[region];
  return features.filter((feature: any) => {
    const cp = feature?.properties?.cp;
    if (!Array.isArray(cp) || cp.length < 2) return false;
    const lng = Number(cp[0]);
    const lat = Number(cp[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false;
    return lng >= scope.lng[0] && lng <= scope.lng[1] && lat >= scope.lat[0] && lat <= scope.lat[1];
  });
}

function extractCoordinates(geometry: any, collector: [number, number][]) {
  const walk = (value: any) => {
    if (!Array.isArray(value) || value.length === 0) return;
    if (typeof value[0] === "number" && typeof value[1] === "number") {
      collector.push([value[0], value[1]]);
      return;
    }
    value.forEach((item) => walk(item));
  };
  walk(geometry?.coordinates);
}

export function getFeatureAnchor(feature: any): [number, number] | null {
  const cp = feature?.properties?.cp;
  if (
    Array.isArray(cp) &&
    cp.length >= 2 &&
    Number.isFinite(Number(cp[0])) &&
    Number.isFinite(Number(cp[1]))
  ) {
    return [Number(cp[0]), Number(cp[1])];
  }
  const points: [number, number][] = [];
  extractCoordinates(feature?.geometry, points);
  if (points.length === 0) return null;
  let sumLng = 0;
  let sumLat = 0;
  points.forEach((point) => {
    sumLng += point[0];
    sumLat += point[1];
  });
  return [sumLng / points.length, sumLat / points.length];
}

export function computeWorldFocusCamera(
  features: any[],
  fallback: { center: [number, number]; zoom: number },
  minZoom: number,
  maxZoom: number
) {
  if (!Array.isArray(features) || features.length === 0) return fallback;
  const points: [number, number][] = [];
  features.forEach((feature) => {
    const anchor = getFeatureAnchor(feature);
    if (anchor) points.push(anchor);
  });
  if (points.length === 0) return fallback;
  const latitudes = points.map((point) => point[1]).filter((value) => Number.isFinite(value));
  if (latitudes.length === 0) return fallback;
  const lngValues = points.map((point) => point[0]).filter((value) => Number.isFinite(value));
  if (lngValues.length === 0) return fallback;

  const lngMinA = Math.min(...lngValues);
  const lngMaxA = Math.max(...lngValues);
  const lngSpanA = Math.max(1, lngMaxA - lngMinA);

  const shiftedLng = lngValues.map((value) => (value < 0 ? value + 360 : value));
  const lngMinB = Math.min(...shiftedLng);
  const lngMaxB = Math.max(...shiftedLng);
  const lngSpanB = Math.max(1, lngMaxB - lngMinB);
  const useShifted = lngSpanB < lngSpanA;

  const lngMin = useShifted ? lngMinB : lngMinA;
  const lngMax = useShifted ? lngMaxB : lngMaxA;
  const latMin = Math.min(...latitudes);
  const latMax = Math.max(...latitudes);
  const lngSpan = Math.max(6, lngMax - lngMin);
  const latSpan = Math.max(5, latMax - latMin);
  const centerLngRaw = (lngMin + lngMax) / 2;
  const centerLng = useShifted && centerLngRaw > 180 ? centerLngRaw - 360 : centerLngRaw;
  const centerLat = (latMin + latMax) / 2;
  const zoomByLng = 360 / (lngSpan * 1.25);
  const zoomByLat = 180 / (latSpan * 1.4);
  const zoom = Math.max(minZoom, Math.min(maxZoom, Number(Math.min(zoomByLng, zoomByLat).toFixed(2))));
  return {
    center: [Number(centerLng.toFixed(2)), Number(centerLat.toFixed(2))] as [number, number],
    zoom
  };
}

export const WORLD_REGION_CAMERA: Record<WorldFocusRegion, { center: [number, number]; zoom: number }> = {
  ALL: { center: [0, 10], zoom: 1 },
  Africa: { center: [20, 5], zoom: 1.55 },
  Asia: { center: [95, 34], zoom: 1.45 },
  Europe: { center: [15, 52], zoom: 2.2 },
  NorthAmerica: { center: [-98, 45], zoom: 1.5 },
  SouthAmerica: { center: [-60, -17], zoom: 1.75 },
  Oceania: { center: [140, -22], zoom: 1.85 }
};
