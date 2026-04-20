"use client";

export async function loadEchartsGlobal() {
  if (typeof window === "undefined") throw new Error("window is undefined");
  const existing = (window as any).echarts;
  if (existing?.init) return existing;
  const candidates = [
    "https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js",
    "https://unpkg.com/echarts@5.6.0/dist/echarts.min.js",
    "https://cdn.bootcdn.net/ajax/libs/echarts/5.6.0/echarts.min.js"
  ];
  for (let index = 0; index < candidates.length; index += 1) {
    const scriptId = `echarts-cdn-script-${index}`;
    const src = candidates[index];
    const current = document.getElementById(scriptId) as HTMLScriptElement | null;
    try {
      if (!current) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.id = scriptId;
          script.src = src;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`failed to load echarts from ${src}`));
          document.head.appendChild(script);
        });
      } else if (!(window as any).echarts?.init) {
        await new Promise<void>((resolve, reject) => {
          current.addEventListener("load", () => resolve(), { once: true });
          current.addEventListener("error", () => reject(new Error(`failed to load echarts from ${src}`)), { once: true });
          window.setTimeout(() => {
            if ((window as any).echarts?.init) resolve();
            else reject(new Error(`timeout loading echarts from ${src}`));
          }, 3500);
        });
      }
      if ((window as any).echarts?.init) break;
    } catch {
    }
  }
  const echarts = (window as any).echarts;
  if (!echarts?.init) throw new Error("echarts unavailable");
  return echarts;
}
