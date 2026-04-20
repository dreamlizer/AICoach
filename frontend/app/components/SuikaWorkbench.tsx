"use client";

type SuikaWorkbenchProps = {
  onClose?: () => void;
};

export function SuikaWorkbench({ onClose }: SuikaWorkbenchProps) {
  return (
    <section className="mx-auto w-full max-w-[1720px]">
      <div className="relative overflow-hidden rounded-[32px] border border-[var(--site-border)] bg-[#16120f] shadow-[0_28px_64px_rgba(20,14,24,0.18)]">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close and go back"
            className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-black/38 text-white shadow-[0_12px_24px_rgba(0,0,0,0.22)] transition hover:bg-black/52"
          >
            ×
          </button>
        ) : null}

        <div className="relative flex h-[calc(100vh-96px)] min-h-[780px] max-h-[1120px] items-center justify-center bg-[#120e0d] p-3 md:p-5">
          <div className="relative h-full max-w-full aspect-[9/16] overflow-hidden rounded-[24px] border border-white/10 bg-[#0f0d0d]">
            <iframe
              src="/daxigua/index.html"
              title="Suika"
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
