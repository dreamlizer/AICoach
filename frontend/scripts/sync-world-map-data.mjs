import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT_PATH = path.join(process.cwd(), "public", "geo", "world-meta.snapshot.json");

const normalizeName = (name) =>
  String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\-,'’()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const canonicalAlias = {
  "dem rep congo": "democratic republic of the congo",
  "central african rep": "central african republic",
  "eq guinea": "equatorial guinea",
  "s sudan": "south sudan",
  "w sahara": "western sahara",
  "bosnia and herz": "bosnia and herzegovina",
  "dominican rep": "dominican republic",
  "solomon is": "solomon islands",
  "n cyprus": "northern cyprus",
  "falkland is": "falkland islands",
  "fr s antarctic lands": "french southern and antarctic lands",
  "br indian ocean ter": "british indian ocean territory",
  "cayman is": "cayman islands",
  "faeroe is": "faroe islands",
  "n mariana is": "northern mariana islands",
  "s geo and s sandw is": "south georgia and the south sandwich islands",
  "st pierre and miquelon": "saint pierre and miquelon",
  "st vin and gren": "saint vincent and the grenadines",
  "turks and caicos is": "turks and caicos islands",
  "us virgin is": "united states virgin islands",
  "heard i and mcdonald is": "heard island and mcdonald islands",
  "czech rep": "czechia",
  "lao pdr": "laos",
  "timor leste": "east timor",
  "dem rep korea": "north korea",
  "cape verde": "cabo verde",
  "swaziland": "eswatini",
  "cote divoire": "ivory coast",
  "antigua and barb": "antigua and barbuda",
  "aland": "åland islands",
  "fr polynesia": "french polynesia",
  "united states": "united states of america",
  "korea": "south korea",
  "congo": "republic of the congo"
};

const canonicalize = (name) => {
  const normalized = normalizeName(name);
  return canonicalAlias[normalized] || normalized;
};

const mergeEntity = (prev, next) => ({
  zhName: prev?.zhName || next?.zhName,
  capitalEn: prev?.capitalEn || next?.capitalEn,
  population: prev?.population || next?.population,
  area: prev?.area || next?.area,
  iso: prev?.iso || next?.iso,
  region: prev?.region || next?.region
});

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.json();
};

const loadMetaMaps = async () => {
  const urls = [
    "https://restcountries.com/v3.1/all?fields=name,translations,capital,population,area,cca2,altSpellings,region",
    "https://restcountries.com/v2/all?fields=name,translations,capital,population,area,alpha2Code,region",
    "https://cdn.jsdelivr.net/gh/mledoze/countries@master/countries.json"
  ];
  const byName = {};
  const byIso = {};
  for (const url of urls) {
    let rows = [];
    try {
      rows = await fetchJson(url);
    } catch {
      continue;
    }
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
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
        population: Number.isFinite(population) && population > 0 ? population : undefined,
        area: Number.isFinite(area) && area > 0 ? area : undefined,
        iso: iso.length === 2 ? iso : undefined,
        region: region || undefined
      };
      const nativeNames = Object.values(row?.name?.nativeName || {}).flatMap((item) => [item?.common, item?.official]);
      const names = [enName, official, ...(Array.isArray(row?.altSpellings) ? row.altSpellings : []), ...nativeNames]
        .map((name) => String(name || "").trim())
        .filter(Boolean);
      for (const name of names) {
        const key = canonicalize(name);
        byName[key] = mergeEntity(byName[key], entity);
      }
      if (entity.iso) {
        byIso[entity.iso] = mergeEntity(byIso[entity.iso], entity);
      }
    }
  }
  return { byName, byIso };
};

const loadGdpMap = async () => {
  const byName = {};
  const payload = await fetchJson("https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD?format=json&per_page=20000");
  const rows = Array.isArray(payload) ? payload[1] : [];
  for (const row of rows || []) {
    const name = String(row?.country?.value || "").trim();
    const iso = String(row?.country?.id || "").toUpperCase();
    const value = Number(row?.value);
    const year = Number(row?.date || 0);
    if (!name || !Number.isFinite(value) || value <= 0) continue;
    const keys = [canonicalize(name)];
    if (iso.length === 2) keys.push(`__iso_${iso}`);
    for (const key of keys) {
      const prev = byName[key];
      if (!prev || year > prev.year) {
        byName[key] = { year, value };
      }
    }
  }
  const result = {};
  for (const [key, row] of Object.entries(byName)) result[key] = row.value;
  return result;
};

const run = async () => {
  const [{ byName, byIso }, worldGdpByName] = await Promise.all([loadMetaMaps(), loadGdpMap()]);
  const snapshot = {
    generatedAt: new Date().toISOString(),
    worldMetaByName: byName,
    worldMetaByIso: byIso,
    worldGdpByName
  };
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(snapshot));
  console.log(`snapshot written: ${OUTPUT_PATH}`);
  console.log(`metaByName=${Object.keys(byName).length}, metaByIso=${Object.keys(byIso).length}, gdp=${Object.keys(worldGdpByName).length}`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
