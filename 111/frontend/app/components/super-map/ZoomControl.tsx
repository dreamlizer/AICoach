"use client";

type ZoomControlProps = {
  mapZoom: number;
  minZoom: number;
  maxZoom: number;
  onChange: (value: number) => void;
};

export function ZoomControl({ mapZoom, minZoom, maxZoom, onChange }: ZoomControlProps) {
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 px-0 py-0">
      <div className="h-32 flex items-center justify-center">
        <input
          type="range"
          min={minZoom}
          max={maxZoom}
          step={0.01}
          value={mapZoom}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-24 -rotate-90 zoom-slider"
        />
      </div>
      <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center mt-1">{mapZoom.toFixed(2)}x</div>
    </div>
  );
}
