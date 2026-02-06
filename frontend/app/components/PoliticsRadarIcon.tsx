import React from "react";

export function PoliticsRadarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Outer Rim */}
      <circle cx="50" cy="50" r="40" strokeWidth="8" />
      
      {/* Crosshairs (faint) */}
      <path d="M50 15 L50 85" strokeWidth="4" opacity="0.3" />
      <path d="M15 50 L85 50" strokeWidth="4" opacity="0.3" />

      {/* The Sweep (Sector) - Filled to show scanning area */}
      <path 
        d="M50 50 L50 10 A40 40 0 0 1 88 38 Z" 
        fill="currentColor" 
        stroke="none" 
        opacity="0.4" 
      />
      
      {/* The Sweep Line (Leading edge) */}
      <line x1="50" y1="50" x2="88" y2="38" strokeWidth="4" />

      {/* Blips (Targets found) - Filled dots */}
      <circle cx="65" cy="35" r="5" fill="currentColor" stroke="none" />
      <circle cx="30" cy="60" r="4" fill="currentColor" stroke="none" opacity="0.7" />
    </svg>
  );
}
