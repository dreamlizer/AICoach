"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { usePreferences } from "@/context/preferences-context";
import { sitePalettes } from "@/lib/site_palette";
import {
  defaultOcrWorkbenchSettings,
  readOcrWorkbenchSettings,
  writeOcrWorkbenchSettings,
  type OcrWorkbenchSettings
} from "@/lib/ocr_workbench";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function SwitchRow(props: {
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const { title, description, checked, onToggle } = props;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-2xl border border-[var(--site-border)] bg-[var(--site-panel-strong)] px-4 py-3 text-left transition hover:border-[var(--site-border-strong)]"
    >
      <div>
        <div className="text-sm font-semibold text-[var(--site-text)]">{title}</div>
        <div className="mt-1 text-xs text-[var(--site-text-soft)]">{description}</div>
      </div>
      <span
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
          checked ? "bg-[var(--site-accent)]" : "bg-[var(--site-bg-soft)]"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.14)] transition ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { sitePalette, setSitePalette, fontSize, setFontSize } = usePreferences();
  const [mounted, setMounted] = useState(false);
  const [ocrSettings, setOcrSettings] = useState<OcrWorkbenchSettings>(defaultOcrWorkbenchSettings);
  const fontSizeIndex = fontSize === "default" ? 0 : fontSize === "medium" ? 1 : 2;
  const showOcrSettings = mounted && document.documentElement.dataset.workspaceMode === "ocr";

  useEffect(() => {
    setMounted(true);
    setOcrSettings(readOcrWorkbenchSettings());
  }, []);

  if (!isOpen || !mounted) return null;

  const updateOcrSettings = (nextSettings: OcrWorkbenchSettings) => {
    setOcrSettings(nextSettings);
    writeOcrWorkbenchSettings(nextSettings);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/25 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-[620px] max-w-[95vw] overflow-hidden rounded-[28px] border border-[var(--site-border-strong)] bg-[var(--site-panel-strong)] shadow-[0_30px_120px_rgba(44,21,39,0.18)] animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--site-border)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--site-text)]">站点设置</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[var(--site-text-soft)] transition-colors hover:bg-[var(--site-accent-soft)] hover:text-[var(--site-accent-strong)]"
            aria-label="关闭设置"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <section className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-panel)] p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-[var(--site-text)]">配色方案</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {sitePalettes.map((palette) => {
                const active = sitePalette === palette.id;
                return (
                  <button
                    key={palette.id}
                    onClick={() => setSitePalette(palette.id)}
                    className={`relative overflow-hidden rounded-[18px] border px-3 py-2.5 text-left transition-all ${
                      active
                        ? "border-[var(--site-accent-strong)] bg-[var(--site-panel-strong)] shadow-[0_10px_24px_rgba(44,21,39,0.12)]"
                        : "border-[var(--site-border)] bg-white/10 hover:-translate-y-0.5 hover:border-[var(--site-border-strong)]"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {palette.swatches.map((color) => (
                          <span
                            key={color}
                            className="h-3.5 w-3.5 rounded-full border border-black/5"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      {active ? <Check className="h-4 w-4 text-[var(--site-accent-strong)]" /> : null}
                    </div>
                    <div className="text-sm font-semibold text-[var(--site-text)]">{palette.name}</div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-panel)] p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-[var(--site-text)]">字体大小</h3>
            </div>
            <div className="relative flex rounded-full bg-[var(--site-bg-soft)] p-1">
              <div
                className="absolute inset-y-1 left-1 w-1/3 rounded-full bg-[var(--site-panel-strong)] shadow-sm transition-transform duration-300"
                style={{ transform: `translateX(${fontSizeIndex * 100}%)` }}
              />
              {[
                { id: "default", label: "标准" },
                { id: "medium", label: "偏大" },
                { id: "large", label: "更大" }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFontSize(item.id as typeof fontSize)}
                  className={`relative z-10 flex flex-1 items-center justify-center rounded-full py-2 text-xs font-medium transition-colors ${
                    fontSize === item.id
                      ? "text-[var(--site-accent-strong)]"
                      : "text-[var(--site-text-soft)] hover:text-[var(--site-text)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          {showOcrSettings ? (
            <section className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-panel)] p-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-[var(--site-text)]">OCR 工作台</h3>
              </div>

              <SwitchRow
                title="保留分页分隔线"
                description="汇总全文时保留每页标题和分隔线。"
                checked={ocrSettings.preservePageDivider}
                onToggle={() =>
                  updateOcrSettings({
                    ...ocrSettings,
                    preservePageDivider: !ocrSettings.preservePageDivider
                  })
                }
              />
            </section>
          ) : null}

          <button
            onClick={onClose}
            className="w-full rounded-full bg-[var(--site-accent)] px-4 py-3 text-sm font-medium text-[var(--site-button-text)] transition hover:bg-[var(--site-accent-strong)]"
          >
            完成
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
