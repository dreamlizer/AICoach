import fs from "node:fs";

const constantsPath = "g:/Trea/AICoach/frontend/app/components/super-map/constants.ts";
const worldGeoPath = "g:/Trea/AICoach/frontend/public/geo/world.geo.json";

const source = fs.readFileSync(constantsPath, "utf8");

const extractMap = (name) => {
  const match = source.match(new RegExp(`const ${name}\\s*:[^=]*=\\s*\\{([\\s\\S]*?)\\n\\};`));
  if (!match) return {};
  return Function(`return ({${match[1]}\n});`)();
};

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\-,'’()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const worldZhMap = extractMap("WORLD_COUNTRY_ZH_MAP");
const worldAliasMap = extractMap("WORLD_NAME_ALIAS_TO_CANONICAL");
const worldCapitalZhMap = extractMap("WORLD_CAPITAL_ZH_MAP");

const worldZhNormalized = new Set(Object.keys(worldZhMap).map(normalize));
const worldCapitalNormalized = new Set(Object.keys(worldCapitalZhMap).map(normalize));

const worldGeo = JSON.parse(fs.readFileSync(worldGeoPath, "utf8"));
const worldGeoNames = [...new Set(worldGeo.features.map((feature) => String(feature?.properties?.name || "").trim()).filter(Boolean))].sort();

const missingGeoZh = [];
for (const name of worldGeoNames) {
  const canonical = worldAliasMap[name] || name;
  if (!worldZhNormalized.has(normalize(canonical)) && !worldZhNormalized.has(normalize(name))) {
    missingGeoZh.push({ name, canonical });
  }
}

const fetchRestData = async () => {
  const response = await fetch("https://restcountries.com/v3.1/all?fields=name,capital,translations");
  const rows = await response.json();
  const missingCapital = new Set();
  for (const row of rows) {
    const capital = String(row?.capital?.[0] || "").trim();
    if (!capital) continue;
    if (!worldCapitalNormalized.has(normalize(capital))) {
      missingCapital.add(capital);
    }
  }
  return [...missingCapital].sort((a, b) => a.localeCompare(b));
};

const main = async () => {
  console.log("missingGeoZh", missingGeoZh.length);
  console.log(JSON.stringify(missingGeoZh, null, 2));
  const missingCapital = await fetchRestData();
  console.log("missingCapital", missingCapital.length);
  console.log(JSON.stringify(missingCapital, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
