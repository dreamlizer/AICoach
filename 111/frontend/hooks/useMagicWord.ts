import { useState, useEffect } from 'react';

export function useMagicWord(magicWord: string = "showreview") {
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    let buffer = "";
    
    const handleKeyDown = (e: KeyboardEvent) => {
      buffer += e.key.toLowerCase();
      if (buffer.length > 20) buffer = buffer.slice(-20);
      
      if (buffer.endsWith(magicWord)) {
        setIsUnlocked(true);
        alert("Review Mode Unlocked! You can now review the questions.");
        buffer = ""; // Reset
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [magicWord]);

  return isUnlocked;
}
