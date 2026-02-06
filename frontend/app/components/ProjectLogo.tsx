import React from "react";

export function ProjectLogo({ className }: { className?: string }) {
  return (
    <div className={className}>
      {/* New PNG Logo */}
      <img src="/logo2.png" alt="Logo" className="w-full h-full object-contain" />

      {/* Original SVG Logo - Preserved
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="66" cy="38" r="19.75" fill="none" stroke="#c1272d" strokeWidth="4.5" />
        <circle cx="38" cy="38" r="26" fill="white" stroke="none" />
        <circle cx="38" cy="38" r="22" fill="#c1272d" stroke="none" />
        <rect x="22" y="72" width="66" height="4.5" rx="2.25" fill="#c1272d" stroke="none" />
      </svg>
      */}
    </div>
  );
}
