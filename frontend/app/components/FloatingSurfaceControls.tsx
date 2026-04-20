"use client";

import { X } from "lucide-react";
import { UserMenu } from "@/app/components/UserMenu";

type FloatingSurfaceControlsProps = {
  showUserMenu?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
};

export function FloatingSurfaceControls({
  showUserMenu = false,
  showBackButton = false,
  onBack,
}: FloatingSurfaceControlsProps) {
  return (
    <>
      {showUserMenu ? (
        <div className="fixed right-4 top-4 z-[80] md:right-6 md:top-6">
          <div className="rounded-full border border-[var(--site-border)] bg-[var(--site-panel)] p-1 shadow-[0_18px_50px_rgba(45,23,35,0.12)] backdrop-blur">
            <UserMenu />
          </div>
        </div>
      ) : null}

      {showBackButton ? (
        <div className="fixed right-4 top-4 z-[85] md:right-6 md:top-6">
          <button
            onClick={onBack}
            aria-label="关闭并返回首页"
            className="site-hover-chip inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--site-border)] bg-[var(--site-panel)] text-[var(--site-text)] shadow-[0_18px_50px_rgba(45,23,35,0.12)] backdrop-blur transition hover:border-[var(--site-border-strong)] hover:bg-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : null}
    </>
  );
}
