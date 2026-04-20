import { defaultOcrStylePresetId, type OcrStylePresetId } from "@/lib/ocr_style_presets";

export type OcrAiProvider = "deepseek";

export type OcrWorkbenchSettings = {
  provider: OcrAiProvider;
  preservePageDivider: boolean;
  autoSaveHistory: boolean;
  stylePresetId: OcrStylePresetId;
};

export const OCR_DRAFT_STORAGE_KEY = "ocr-workbench.text-draft";
export const OCR_HISTORY_STORAGE_KEY = "ocr-workbench.history";
export const OCR_SETTINGS_STORAGE_KEY = "ocr-workbench.settings";
export const OCR_SETTINGS_EVENT = "ocr-settings-changed";

export const defaultOcrWorkbenchSettings: OcrWorkbenchSettings = {
  provider: "deepseek",
  preservePageDivider: true,
  autoSaveHistory: true,
  stylePresetId: defaultOcrStylePresetId,
};

export function readOcrWorkbenchSettings(): OcrWorkbenchSettings {
  if (typeof window === "undefined") {
    return defaultOcrWorkbenchSettings;
  }

  try {
    const raw = window.localStorage.getItem(OCR_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return defaultOcrWorkbenchSettings;
    }

    return {
      ...defaultOcrWorkbenchSettings,
      ...(JSON.parse(raw) as Partial<OcrWorkbenchSettings>),
    };
  } catch {
    return defaultOcrWorkbenchSettings;
  }
}

export function writeOcrWorkbenchSettings(settings: OcrWorkbenchSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(OCR_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(OCR_SETTINGS_EVENT, { detail: settings }));
}
