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
