export type SitePaletteId =
  | "rose-dawn"
  | "ocr-amber"
  | "camellia-ink"
  | "moss-paper"
  | "coast-blue"
  | "midnight-plum";

export type SitePalette = {
  id: SitePaletteId;
  name: string;
  description: string;
  swatches: [string, string, string];
  isDark?: boolean;
  vars: Record<string, string>;
};

export const sitePalettes: SitePalette[] = [
  {
    id: "rose-dawn",
    name: "玫瑰晨雾",
    description: "柔和粉雾感，适合作为站点默认首页。",
    swatches: ["#f4c6d6", "#fff7f7", "#9d4b6a"],
    vars: {
      "--site-bg": "#fff8f6",
      "--site-bg-soft": "#fff0f2",
      "--site-panel": "rgba(255, 248, 247, 0.86)",
      "--site-panel-strong": "#fffdfc",
      "--site-border": "rgba(160, 95, 124, 0.16)",
      "--site-border-strong": "rgba(160, 95, 124, 0.28)",
      "--site-text": "#2b1d27",
      "--site-text-soft": "rgba(43, 29, 39, 0.68)",
      "--site-accent": "#b85f83",
      "--site-accent-strong": "#9f476d",
      "--site-accent-soft": "rgba(184, 95, 131, 0.12)",
      "--site-secondary": "#f3d7dc",
      "--site-button-text": "#fffdfc",
      "--site-hero": "linear-gradient(135deg, #fff8f7 0%, #fde8ec 45%, #fffdf9 100%)",
      "--site-glow": "radial-gradient(circle at top right, rgba(212, 126, 158, 0.28) 0%, transparent 42%)",
    },
  },
  {
    id: "ocr-amber",
    name: "琥珀纸页",
    description: "借用了 OCR 工作台的暖纸张气质，更适合文档和整理感。",
    swatches: ["#d88d5b", "#fbf2e6", "#7c4b30"],
    vars: {
      "--site-bg": "#f8efe3",
      "--site-bg-soft": "#f2e5d3",
      "--site-panel": "rgba(251, 243, 232, 0.9)",
      "--site-panel-strong": "#fff9f1",
      "--site-border": "rgba(124, 75, 48, 0.14)",
      "--site-border-strong": "rgba(124, 75, 48, 0.26)",
      "--site-text": "#2f2018",
      "--site-text-soft": "rgba(47, 32, 24, 0.7)",
      "--site-accent": "#c67a4a",
      "--site-accent-strong": "#9f5c35",
      "--site-accent-soft": "rgba(198, 122, 74, 0.12)",
      "--site-secondary": "#ead9c2",
      "--site-button-text": "#fffaf2",
      "--site-hero": "linear-gradient(135deg, #fbf3e8 0%, #f2dfc7 42%, #fffaf3 100%)",
      "--site-glow": "radial-gradient(circle at top right, rgba(211, 148, 95, 0.26) 0%, transparent 42%)",
    },
  },
  {
    id: "camellia-ink",
    name: "山茶墨韵",
    description: "更成熟一点的酒红色，适合偏静的页面。",
    swatches: ["#dca4b0", "#f7f0ef", "#7b394e"],
    vars: {
      "--site-bg": "#fbf5f3",
      "--site-bg-soft": "#f5e9ea",
      "--site-panel": "rgba(251, 246, 244, 0.88)",
      "--site-panel-strong": "#fffdfc",
      "--site-border": "rgba(123, 57, 78, 0.14)",
      "--site-border-strong": "rgba(123, 57, 78, 0.3)",
      "--site-text": "#27181d",
      "--site-text-soft": "rgba(39, 24, 29, 0.68)",
      "--site-accent": "#8e4660",
      "--site-accent-strong": "#73344d",
      "--site-accent-soft": "rgba(142, 70, 96, 0.12)",
      "--site-secondary": "#ebd4d9",
      "--site-button-text": "#fffdfc",
      "--site-hero": "linear-gradient(135deg, #fbf5f3 0%, #f3e1e4 44%, #fffdfa 100%)",
      "--site-glow": "radial-gradient(circle at top right, rgba(174, 91, 122, 0.26) 0%, transparent 42%)",
    },
  },
  {
    id: "moss-paper",
    name: "苔青纸页",
    description: "偏中性也更克制，适合地图和资料页。",
    swatches: ["#cfdac5", "#fafbf4", "#5b7058"],
    vars: {
      "--site-bg": "#fbfbf5",
      "--site-bg-soft": "#f0f3e6",
      "--site-panel": "rgba(250, 251, 246, 0.88)",
      "--site-panel-strong": "#fffffc",
      "--site-border": "rgba(91, 112, 88, 0.15)",
      "--site-border-strong": "rgba(91, 112, 88, 0.28)",
      "--site-text": "#20281f",
      "--site-text-soft": "rgba(32, 40, 31, 0.68)",
      "--site-accent": "#6b845e",
      "--site-accent-strong": "#526748",
      "--site-accent-soft": "rgba(107, 132, 94, 0.12)",
      "--site-secondary": "#e2e9d8",
      "--site-button-text": "#fffffc",
      "--site-hero": "linear-gradient(135deg, #fcfcf7 0%, #eef2e5 44%, #fffffb 100%)",
      "--site-glow": "radial-gradient(circle at top right, rgba(131, 160, 117, 0.24) 0%, transparent 42%)",
    },
  },
  {
    id: "coast-blue",
    name: "海岬蓝页",
    description: "偏冷静的蓝灰方案，更利落，也更偏中性和男性向。",
    swatches: ["#aac4df", "#f4f8fc", "#41617f"],
    vars: {
      "--site-bg": "#f3f8fc",
      "--site-bg-soft": "#e7eff7",
      "--site-panel": "rgba(245, 249, 253, 0.88)",
      "--site-panel-strong": "#fbfdff",
      "--site-border": "rgba(65, 97, 127, 0.15)",
      "--site-border-strong": "rgba(65, 97, 127, 0.28)",
      "--site-text": "#1d2732",
      "--site-text-soft": "rgba(29, 39, 50, 0.68)",
      "--site-accent": "#5c7ea3",
      "--site-accent-strong": "#446584",
      "--site-accent-soft": "rgba(92, 126, 163, 0.12)",
      "--site-secondary": "#d7e3ef",
      "--site-button-text": "#f8fbff",
      "--site-hero": "linear-gradient(135deg, #f5f9fd 0%, #e7eef6 44%, #fcfeff 100%)",
      "--site-glow": "radial-gradient(circle at top right, rgba(117, 153, 192, 0.22) 0%, transparent 42%)",
    },
  },
  {
    id: "midnight-plum",
    name: "夜紫幕布",
    description: "单独的一套深色方案，统一整站暗色视觉。",
    swatches: ["#1e1a2a", "#362846", "#d5b6d9"],
    isDark: true,
    vars: {
      "--site-bg": "#15131b",
      "--site-bg-soft": "#1b1825",
      "--site-panel": "rgba(27, 24, 37, 0.84)",
      "--site-panel-strong": "#201c2d",
      "--site-border": "rgba(214, 188, 221, 0.12)",
      "--site-border-strong": "rgba(214, 188, 221, 0.22)",
      "--site-text": "#f5ecf7",
      "--site-text-soft": "rgba(245, 236, 247, 0.66)",
      "--site-accent": "#c58fc8",
      "--site-accent-strong": "#deb2df",
      "--site-accent-soft": "rgba(197, 143, 200, 0.14)",
      "--site-secondary": "#2a2238",
      "--site-button-text": "#140f19",
      "--site-hero": "linear-gradient(135deg, #17141f 0%, #211b2d 42%, #15131b 100%)",
      "--site-glow": "radial-gradient(circle at top right, rgba(197, 143, 200, 0.16) 0%, transparent 42%)",
    },
  },
];

export const defaultSitePaletteId: SitePaletteId = "rose-dawn";

export const getSitePalette = (paletteId: SitePaletteId) =>
  sitePalettes.find((palette) => palette.id === paletteId) ?? sitePalettes[0];
