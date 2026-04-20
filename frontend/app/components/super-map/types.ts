"use client";

export type LabelLanguage = "zh" | "en" | "none";

export type PersistedState = {
  selectedNames: string[];
  labelLanguage: LabelLanguage;
  highlightColor: string;
  baseColor: string;
  borderColor: string;
  hoverColor: string;
  fontColor: string;
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  themeId: string;
  mapZoom: number;
  showMarineLabels?: boolean;
};

export type ThemePreset = {
  id: string;
  name: string;
  highlightColor: string;
  baseColor: string;
  borderColor: string;
  hoverColor: string;
};

export type FontFamilyOption = {
  label: string;
  value: string;
};

export type ProvinceProfile = {
  capital: string;
  area: string;
  population: string;
  gdp: string;
  populationRank: string;
  gdpRank: string;
};

export type WorldCountryProfile = {
  capital: string;
  area: string;
  population: string;
  gdp: string;
  populationRank: string;
  gdpRank: string;
  timezone: string;
};

export type MapScope = "china" | "world";

export type WorldRuntimeMeta = {
  zhName?: string;
  capitalEn?: string;
  capitalZh?: string;
  population?: number;
  area?: number;
  iso?: string;
  region?: string;
};

export type WorldFocusRegion = "ALL" | "Africa" | "Asia" | "Europe" | "NorthAmerica" | "SouthAmerica" | "Oceania";

export type MarineLabelKind = "ocean" | "strait";

export type MarineLabel = {
  name: string;
  coord: [number, number];
  kind: MarineLabelKind;
  scopes: WorldFocusRegion[];
  minZoom?: number;
  maxZoom?: number;
  rotation?: number;
};

export type SearchItemType = "china_region" | "world_country" | "world_capital" | "marine";

export type SearchItem = {
  key: string;
  label: string;
  type: SearchItemType;
  targetName: string;
  targetScope: MapScope;
  coord: [number, number] | null;
};
