import React from "react";

export function ProjectLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      aria-label="Project Logo"
    >
      <circle cx="66" cy="38" r="19.75" fill="none" stroke="#c1272d" strokeWidth="6.5" />
      <circle cx="38" cy="38" r="26" fill="white" stroke="none" />
      <circle cx="38" cy="38" r="22" fill="#c1272d" stroke="none" />
      <rect x="22" y="72" width="66" height="6.5" rx="3.25" fill="#c1272d" stroke="none" />
    </svg>
  );
}
