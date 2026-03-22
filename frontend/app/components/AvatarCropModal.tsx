"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Check, ZoomIn, ZoomOut, Move } from "lucide-react";
import { useLanguage } from "@/context/language-context";

interface AvatarCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onSave: (croppedImage: string) => void;
}

export function AvatarCropModal({ isOpen, onClose, imageUrl, onSave }: AvatarCropModalProps) {
  const { t } = useLanguage();
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const CROP_SIZE = 200; // 200px circle

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    if (!imageRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw circular mask (optional, but we want the output to be square usually, 
    // but displayed as circle. However, user asked for crop interface to have circular mask.
    // Usually avatar uploads are saved as squares and displayed as circles.
    // But if we want to burn in the circle:
    // ctx.beginPath(); ctx.arc(...); ctx.clip();
    
    // Calculate draw position
    // The view window is center of container.
    // Image is at center + position.
    // We need to map the 200x200 crop area (which is at center of screen) 
    // relative to the image.
    
    // Easier way: Draw image onto canvas transformed.
    // Center of canvas is (100, 100).
    // Center of image in view is (ViewWidth/2 + x, ViewHeight/2 + y).
    // We want the part of image that is under the crop area.
    
    // Let's assume container is 300x300. Crop area is center 200x200.
    // Image is drawn at (150+x, 150+y) with scale.
    
    // We want to draw into 200x200 canvas.
    // The point (0,0) of canvas corresponds to (ViewWidth/2 - 100, ViewHeight/2 - 100) in view.
    
    // Let's rely on the image's natural size.
    const img = imageRef.current;
    
    // Effective image draw props
    // We need to handle this carefully.
    
    // Strategy: 
    // 1. Clear canvas.
    // 2. Translate to center (100, 100).
    // 3. Scale.
    // 4. Translate by position (x, y).
    // 5. Draw image centered at (-imgWidth/2, -imgHeight/2).
    
    // Wait, position is the translation of the image from the center of the viewport.
    
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, CROP_SIZE, CROP_SIZE);
    
    ctx.save();
    ctx.translate(CROP_SIZE / 2, CROP_SIZE / 2);
    ctx.translate(position.x, position.y);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onSave(dataUrl);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseUp={handleMouseUp}
      onTouchEnd={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl overflow-hidden w-[400px] max-w-[95vw]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#333333]">
          <h2 className="text-lg font-bold text-[#202124] dark:text-white">
            {t('cropImage')}
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-[#2C2C2C]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace */}
        <div 
          className="relative h-[300px] bg-[#121212] overflow-hidden cursor-move touch-none select-none flex items-center justify-center"
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
        >
          {/* Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Crop target"
            draggable={false}
            className="max-w-none transition-transform duration-0"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: "center"
            }}
          />

          {/* Overlay Mask */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Dark overlay with clear circle */}
             <div 
               className="absolute inset-0"
               style={{
                 background: "radial-gradient(circle 100px at center, transparent 100px, rgba(0,0,0,0.6) 100px)"
               }}
             />
             {/* Circle Border */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border-2 border-white/50 shadow-sm" />
          </div>
        </div>

        {/* Controls */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <ZoomOut className="w-4 h-4 text-gray-500" />
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-gray-200 dark:bg-[#333333] rounded-lg appearance-none cursor-pointer accent-[#060E9F] dark:accent-blue-400"
            />
            <ZoomIn className="w-4 h-4 text-gray-500" />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#333333] hover:bg-gray-200 dark:hover:bg-[#3E3E3E] rounded-xl transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#060E9F] hover:bg-[#060E9F]/90 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {t('confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
