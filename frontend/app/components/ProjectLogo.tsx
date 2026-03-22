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
        sizes="(max-width: 768px) 48px, 96px"
        className="object-contain dark:filter dark:grayscale dark:invert dark:mix-blend-screen"
        priority
      />
    </div>
  );
}
