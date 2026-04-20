"use client";

import { StartupFeatureId, getWarmFrameSrc } from "@/lib/startup_preload";

type StartupWarmFrameProps = {
  featureId: StartupFeatureId | null;
};

export function StartupWarmFrame({ featureId }: StartupWarmFrameProps) {
  const src = getWarmFrameSrc(featureId);

  if (!src) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-[-200vw] top-[-200vh] h-px w-px overflow-hidden opacity-0"
    >
      <iframe src={src} title={`warm-frame-${featureId}`} className="h-full w-full border-0" tabIndex={-1} />
    </div>
  );
}
