"use client";

import { WorldFocusRegion } from "./types";

export const WORLD_COVERAGE_REGIONS = [
  { key: "ALL", label: "全部" },
  { key: "Africa", label: "非洲" },
  { key: "Asia", label: "亚洲" },
  { key: "Europe", label: "欧洲" },
  { key: "Americas", label: "美洲" },
  { key: "Oceania", label: "大洋洲" }
] as const;

export const WORLD_FOCUS_REGIONS: Array<{ key: WorldFocusRegion; label: string }> = [
  { key: "ALL", label: "全球" },
  { key: "NorthAmerica", label: "北美洲" },
  { key: "SouthAmerica", label: "南美洲" },
  { key: "Europe", label: "欧洲" },
  { key: "Africa", label: "非洲" },
  { key: "Asia", label: "亚洲" },
  { key: "Oceania", label: "大洋洲" }
];
