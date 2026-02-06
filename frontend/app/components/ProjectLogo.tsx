import React from "react";
import Image from "next/image";

export function ProjectLogo({ className }: { className?: string }) {
  return (
    <div className={`${className} relative`}>
      {/* New PNG Logo */}
      <Image 
        src="/logo2.png" 
        alt="Logo" 
        fill
        className="object-contain"
        priority
      />
    </div>
  );
}
