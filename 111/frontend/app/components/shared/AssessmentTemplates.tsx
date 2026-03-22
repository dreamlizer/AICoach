import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Briefcase, User, RefreshCw, Activity, Target, Zap, Tag, BookOpen, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const REPORT_CARD_WIDTH_REM = 48;

export const REPORT_VIEW_DEFAULTS = {
  showRoleInImage: true,
  showRoleTag: true,
  infoFontSize: 14,
  reportScale: 0.75,
  reportScaleMin: 0.4,
  reportScaleMax: 1,
  reportScaleStep: 0.05
};

export const ReportCardFrame: React.FC<{ reportScale: number; widthScale?: number; children: React.ReactNode }> = ({ reportScale, widthScale = 1, children }) => (
  <div className="report-card-scroll">
    <div className="report-card-shell" style={{ width: `${REPORT_CARD_WIDTH_REM * widthScale}rem`, maxWidth: `${REPORT_CARD_WIDTH_REM * widthScale}rem` }}>
      <div className="relative w-full">
        <div style={{ position: 'relative', left: '50%', transform: `translateX(-50%) scale(${reportScale})`, transformOrigin: 'top center' }}>
          {children}
        </div>
      </div>
    </div>
  </div>
);

// --- Shared Markdown Components (Unified & Adjustable) ---

// Helper for Section Headers (Unified Logic for H2/H4)
const SectionHeader = ({ node, ...props }: any) => {
    let text = "";
    if (props.children) {
        if (typeof props.children === 'string') text = props.children;
        else if (Array.isArray(props.children)) text = props.children.map((c: any) => typeof c === 'string' ? c : '').join('');
    }

    // MBTI: Skip "Turnaround" header as it's handled separately
    if (text.includes("神转折")) return null;
    
    let Icon = Activity;
    // MBTI Keywords
    if (text.includes("出厂标签") || text.includes("Tags")) Icon = Tag;
    else if (text.includes("系统诊断") || text.includes("Diagnosis")) Icon = Activity;
    else if (text.includes("绝杀技") || text.includes("Superpower")) Icon = Zap;
    else if (text.includes("使用说明书") || text.includes("Manual")) Icon = BookOpen;
    // 4D Keywords
    else if (text.includes("底层操作系统")) Icon = Activity;
    else if (text.includes("团队生态位")) Icon = Target;
    else if (text.includes("宿命对家")) Icon = Zap;
    else if (text.includes("社交签名档")) Icon = Tag;

    return (
        <div 
        className="flex items-center gap-4 group first:mt-0"
        style={{
            marginTop: '16px',    // [可调] 小标题上方间距 (Header Top Margin)
            marginBottom: '16px'  // [可调] 小标题下方间距 (Header Bottom Margin)
        }}
        >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#151E32] flex items-center justify-center text-[#C5A059] shadow-lg shadow-[#151E32]/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                <Icon className="w-4 h-4"/>
            </div>
            <div className="flex-1 border-b border-[#C5A059]/30 pb-2 flex items-center">
                <h4 
                className="font-bold text-[#151E32] m-0 tracking-wide uppercase" 
                style={{
                    fontSize: '20px' // [可调] 小标题字号 (Header Font Size)
                }}
                {...props}
                />
            </div>
        </div>
    );
};

export const SharedReportMarkdownComponents = {
  // Main Title (H3) - Often handled separately, so we hide it here to avoid duplication
  h3: ({node, ...props}: any) => <h3 className="text-base font-bold text-[#151E32] mt-4 mb-2 flex items-center gap-2 before:content-[''] before:w-1 before:h-3 before:bg-[#C5A059] before:rounded-full" {...props}/>,
  
  // MBTI Hero Title (H1)
  h1: ({node, ...props}: any) => {
      let content = "";
      if (props.children) {
          if (typeof props.children === 'string') content = props.children;
          else if (Array.isArray(props.children)) content = props.children.map((c: any) => typeof c === 'string' ? c : '').join('');
      }

      const parts = content.split(/：|:/);
      const label = parts[0];
      const value = parts.slice(1).join('：');

      if (parts.length > 1) {
           return (
              <div className="relative mb-8 mt-2 text-center">
                  <div className="inline-block relative px-8 py-4">
                      {/* Top and Bottom subtle borders only */}
                      <div data-html2canvas-ignore="true" className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C5A059] to-transparent opacity-30"></div>
                      <div data-html2canvas-ignore="true" className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C5A059] to-transparent opacity-30"></div>
                      
                      <div className="text-[#C5A059] mb-1 flex flex-col items-center justify-center opacity-90 gap-1">
                          <Crown className="w-5 h-5" />
                          <span className="text-sm tracking-widest uppercase font-medium">{label}</span>
                      </div>
                      <h1 className="text-4xl font-extrabold text-[#151E32] m-0 tracking-tight font-serif leading-tight whitespace-nowrap">
                          {value}
                      </h1>
                  </div>
              </div>
           );
      }

      return (
      <div className="relative mb-6 mt-2 text-center">
          <div className="inline-block relative px-8 py-4">
              {/* Top and Bottom subtle borders only */}
              <div data-html2canvas-ignore="true" className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C5A059] to-transparent opacity-30"></div>
              <div data-html2canvas-ignore="true" className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C5A059] to-transparent opacity-30"></div>
              
              <div className="text-[#C5A059] mb-2 flex justify-center opacity-80">
                  <Crown className="w-5 h-5" />
              </div>
              <h1 className="text-4xl font-extrabold text-[#151E32] m-0 tracking-tight font-serif leading-tight whitespace-nowrap" {...props}/>
          </div>
      </div>
      );
  },

  // Section Headers (Unified)
  h2: SectionHeader,
  h4: SectionHeader,

  // Paragraphs
  p: ({node, ...props}: any) => (
    <p 
      className="text-[#2C3E50] font-medium" 
      style={{
        marginBottom: '12px',   // [可调] 正文段落间距 (Paragraph Margin Bottom)
        lineHeight: '1.6',      // [可调] 正文行高 (Paragraph Line Height)
        fontSize: '19px'        // [可调] 正文前号 (Paragraph Font Size)
      }} 
      {...props} 
    />
  ),
  
  // Lists
  ul: ({node, ...props}: any) => <ul className="space-y-2 my-4 list-none pl-2" {...props} />,
  ol: ({node, ...props}: any) => <ul className="space-y-2 my-4 list-none pl-2" {...props} />, // Map ol to ul for consistent look
  li: ({node, ...props}: any) => (
      <li 
        className="flex gap-2 text-[#2C3E50]" 
        style={{
          marginBottom: '6px',  // [可调] 列表项间距 (List Item Margin Bottom)
          fontSize: '19px',     // [可调] 列表字号 (List Item Font Size)
          lineHeight: '1.6'     // [可调] 列表行高 (List Item Line Height)
        }} 
        {...props}
      >
          <span className="text-[#C5A059] text-xs mt-1.5 flex-shrink-0">◆</span>
          <span className="flex-1">{props.children}</span>
      </li>
  ),
  
  // Highlight Marker Style
  strong: ({node, ...props}: any) => (
      <span className="relative inline-block px-1 mx-0.5">
          <span className="absolute inset-0 bg-[#C5A059]/10 rounded-sm -skew-x-6 transform"></span>
          <strong className="relative font-bold text-[#151E32]" {...props}/>
      </span>
  ),
  
  em: ({node, ...props}: any) => <em className="text-[#64748B] not-italic text-sm" {...props}/>,
  
  hr: ({node, ...props}: any) => <hr className="my-8 border-dashed border-gray-200" {...props} />,
};

export const MBTIReportMarkdownComponents = {
  ...SharedReportMarkdownComponents,
  h1: ({node, ...props}: any) => {
      let content = "";
      if (props.children) {
          if (typeof props.children === 'string') content = props.children;
          else if (Array.isArray(props.children)) content = props.children.map((c: any) => typeof c === 'string' ? c : '').join('');
      }

      const parts = content.split(/：|:/);
      const label = parts[0];
      const value = parts.slice(1).join('：');

      if (parts.length > 1) {
           return (
              <div className="relative mb-4 mt-1 text-center">
                  <div className="inline-block relative px-8 py-4">
                      <div data-html2canvas-ignore="true" className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C5A059] to-transparent opacity-30"></div>
                      <div data-html2canvas-ignore="true" className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C5A059] to-transparent opacity-30"></div>
                      
                      <div className="text-[#C5A059] mb-1 flex flex-col items-center justify-center opacity-90 gap-1">
                          <Crown className="w-5 h-5" />
                          <span className="text-sm tracking-widest uppercase font-medium">{label}</span>
                      </div>
                      <h1 className="text-4xl font-extrabold text-[#151E32] m-0 tracking-tight font-serif leading-tight whitespace-nowrap">
                          {value}
                      </h1>
                  </div>
              </div>
           );
      }

      return (
      <div className="relative mb-4 mt-1 text-center">
          <div className="inline-block relative px-8 py-4">
              <div data-html2canvas-ignore="true" className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C5A059] to-transparent opacity-30"></div>
              <div data-html2canvas-ignore="true" className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C5A059] to-transparent opacity-30"></div>
              
              <div className="text-[#C5A059] mb-2 flex justify-center opacity-80">
                  <Crown className="w-5 h-5" />
              </div>
              <h1 className="text-4xl font-extrabold text-[#151E32] m-0 tracking-tight font-serif leading-tight whitespace-nowrap" {...props}/>
          </div>
      </div>
      );
  },
  ul: ({node, ...props}: any) => <ul className="space-y-2 my-2 list-none pl-2" {...props} />
};

const extractStreamSegments = (text: string) => {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return [];

  const matches = cleaned.match(/[^。！？.!?]+[。！？.!?]?/g) || [];
  const filtered = matches.map(segment => segment.trim()).filter(segment => segment.length >= 8);
  const unique: string[] = [];
  filtered.forEach(segment => {
    if (!unique.includes(segment)) unique.push(segment);
  });
  return unique;
};

export const useStreamingReportText = ({
  sourceText,
  initialText,
  intervalMs = 6000,
  initialDelayMs = 6000,
  resetKey = 0,
  fallbackSegments,
  fallbackUntilLength = 0
}: {
  sourceText: string;
  initialText: string;
  intervalMs?: number;
  initialDelayMs?: number;
  resetKey?: number;
  fallbackSegments?: string[];
  fallbackUntilLength?: number;
}) => {
  const [displayText, setDisplayText] = useState(initialText);
  const indexRef = useRef(0);
  const segments = useMemo(() => extractStreamSegments(sourceText), [sourceText]);
  const segmentsRef = useRef<string[]>(segments);
  const modeRef = useRef<"fallback" | "source">("source");
  const sourceTextRef = useRef(sourceText);
  const fallbackSegmentsRef = useRef<string[] | undefined>(fallbackSegments);
  const fallbackUntilLengthRef = useRef(fallbackUntilLength);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  useEffect(() => {
    sourceTextRef.current = sourceText;
  }, [sourceText]);

  useEffect(() => {
    fallbackSegmentsRef.current = fallbackSegments;
  }, [fallbackSegments]);

  useEffect(() => {
    fallbackUntilLengthRef.current = fallbackUntilLength;
  }, [fallbackUntilLength]);

  useEffect(() => {
    setDisplayText(initialText);
    indexRef.current = 0;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const timeoutId = setTimeout(() => {
      const tick = () => {
        const fallbackList = fallbackSegmentsRef.current;
        const shouldUseFallback = fallbackList && fallbackList.length > 0 && sourceTextRef.current.length < fallbackUntilLengthRef.current;
        const nextMode: "fallback" | "source" = shouldUseFallback ? "fallback" : "source";
        if (modeRef.current !== nextMode) {
          modeRef.current = nextMode;
          indexRef.current = 0;
        }
        const list = shouldUseFallback ? fallbackList : segmentsRef.current;
        if (!list || list.length === 0) {
          setDisplayText(initialText);
          return;
        }
        const idx = Math.min(indexRef.current, list.length - 1);
        const next = list[idx];
        if (next) {
          const withPrefix = next.startsWith("正在") ? next : `正在${next}`;
          setDisplayText(withPrefix.replace(/正在正在/g, "正在"));
        }
        if (indexRef.current < list.length - 1) {
          indexRef.current += 1;
        }
      };

      tick();
      intervalId = setInterval(tick, intervalMs);
    }, initialDelayMs);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [initialText, intervalMs, initialDelayMs, resetKey]);

  return displayText;
};

export const ReportStreamingStatus = ({ active, text, subText = "生成报告约需1-2分钟" }: { active: boolean; text: string; subText?: string }) => {
  if (!active) return null;
  return (
    <div className="bg-[#FFF6DB] text-[#9A6B00] px-4 py-2 text-sm flex items-start gap-3 border-b border-[#F0E0B8]">
      <span className="w-2 h-2 rounded-full bg-[#FFBF3F] animate-pulse mt-1" />
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">{text}</span>
        <span className="text-xs text-[#B07C00]">{subText}</span>
      </div>
    </div>
  );
};

// --- Assessment Modal Template ---

interface AssessmentModalTemplateProps {
  title: string;
  icon?: React.ReactNode; // Optional, defaults will be handled by usage or passed explicitly
  onClose: () => void;
  children: React.ReactNode;
  headerColorClass?: string; // e.g. "text-blue-600" for the title
  iconBgClass?: string; // e.g. "bg-blue-600"
  maxWidthClass?: string; // e.g. "max-w-5xl"
}

export const AssessmentModalTemplate: React.FC<AssessmentModalTemplateProps> = ({
  title,
  icon,
  onClose,
  children,
  headerColorClass = "text-blue-600",
  iconBgClass = "bg-blue-600",
  maxWidthClass = "max-w-5xl",
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`bg-white dark:bg-zinc-900 w-full ${maxWidthClass} h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-zinc-200 dark:border-zinc-800`}
      >
        {/* Header */}
        <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${iconBgClass} flex items-center justify-center`}>
              {icon}
            </div>
            <div>
              <h2 className={`text-lg font-bold ${headerColorClass}`}>{title}</h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto relative bg-[#FDFBF7] custom-scrollbar">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

// --- Report Card Template ---

interface ReportCardTemplateProps {
  id?: string; // for html2canvas
  toolName: string; // e.g. "4D 高管坐标"
  toolIcon?: React.ReactNode;
  userProfile: {
    name: string;
    role?: string;
    industry?: string;
    level?: string;
  };
  showRoleTag?: boolean;
  showRoleInImage?: boolean;
  infoFontSize?: number;
  onNameChange?: (name: string) => void;
  children: React.ReactNode;
}

export const prepareReportCardExport = (source: HTMLElement, widthScale = 1) => {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.id = `${source.id || "report-card"}-export`;
  const baseWidth = Math.max(source.scrollWidth, source.offsetWidth);
  const baseHeight = Math.max(source.scrollHeight, source.offsetHeight);
  clone.style.position = "fixed";
  clone.style.left = "-10000px";
  clone.style.top = "0";
  clone.style.width = `${baseWidth * widthScale}px`;
  clone.style.height = `${baseHeight}px`;
  clone.style.maxWidth = "none";
  clone.style.margin = "0";
  clone.style.overflow = "visible";
  clone.style.transform = "none";
  clone.style.pointerEvents = "none";
  clone.style.boxSizing = "border-box";
  document.body.appendChild(clone);

  const sourceInputs = Array.from(source.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
  const cloneInputs = Array.from(clone.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
  sourceInputs.forEach((input, index) => {
    const cloneInput = cloneInputs[index];
    if (!cloneInput) return;
    const span = document.createElement("span");
    span.textContent = input.value || input.placeholder || "";
    const style = window.getComputedStyle(input);
    span.style.fontFamily = style.fontFamily;
    span.style.fontSize = style.fontSize;
    span.style.fontWeight = style.fontWeight;
    span.style.letterSpacing = style.letterSpacing;
    span.style.color = style.color;
    span.style.lineHeight = style.lineHeight;
    span.style.padding = style.padding;
    span.style.display = "inline-block";
    span.style.whiteSpace = "pre-wrap";
    span.style.minWidth = style.minWidth;
    span.style.borderBottom = "1px solid transparent";
    span.style.boxSizing = "border-box";
    cloneInput.parentElement?.replaceChild(span, cloneInput);
  });

  const serializer = new XMLSerializer();
  const svgImages: HTMLImageElement[] = [];
  const parseLineHeight = (value: string, fontSize: string) => {
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed)) return parsed;
    const font = parseFloat(fontSize);
    if (!Number.isNaN(font)) return font * 1.4;
    return 16;
  };

  const createSvgImage = (sourceSvg: SVGSVGElement | null, alignHeight?: number, extraOffset?: number) => {
    if (!sourceSvg) return null;
    const sourceRect = sourceSvg.getBoundingClientRect();
    const width = Math.max(1, Math.round(sourceRect.width || 16));
    const height = Math.max(1, Math.round(sourceRect.height || 16));
    const svgClone = sourceSvg.cloneNode(true) as SVGSVGElement;
    const sourceColor = window.getComputedStyle(sourceSvg).color;
    svgClone.setAttribute("width", String(width));
    svgClone.setAttribute("height", String(height));
    svgClone.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgClone.setAttribute("color", sourceColor);
    svgClone.style.color = sourceColor;
    const svgString = serializer.serializeToString(svgClone);
    const img = document.createElement("img");
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    img.width = width;
    img.height = height;
    img.style.width = `${width}px`;
    img.style.height = `${height}px`;
    img.style.display = "inline-block";
    img.style.verticalAlign = "middle";
    img.style.position = "relative";
    if (typeof alignHeight === "number") {
      const offset = Math.max(0, Math.round((alignHeight - height) / 2));
      const extra = Math.round(extraOffset || 0);
      img.style.top = `${offset + extra}px`;
    } else {
      img.style.top = "0";
    }
    img.decoding = "sync";
    svgImages.push(img);
    return img;
  };

  const sourceHeader = source.querySelector("[data-report-header]") as HTMLElement | null;
  const cloneHeader = clone.querySelector("[data-report-header]") as HTMLElement | null;
  if (sourceHeader && cloneHeader) {
    const sourceHeaderSvgs = Array.from(sourceHeader.querySelectorAll("svg")) as SVGSVGElement[];
    const cloneHeaderSvgs = Array.from(cloneHeader.querySelectorAll("svg")) as SVGSVGElement[];
    const sourceHeaderIconBox = sourceHeader.querySelector("[data-report-header-icon]") as HTMLElement | null;
    const cloneHeaderIconBox = cloneHeader.querySelector("[data-report-header-icon]") as HTMLElement | null;
    if (sourceHeaderIconBox && cloneHeaderIconBox) {
      const headerBoxHeight = sourceHeaderIconBox.getBoundingClientRect().height;
      const headerOffset = Math.max(1, Math.round(headerBoxHeight * 0.18));
      cloneHeaderIconBox.style.position = "relative";
      cloneHeaderIconBox.style.top = `${headerOffset}px`;
    }
    cloneHeaderSvgs.forEach((svg, index) => {
      const sourceSvg = sourceHeaderSvgs[index] || null;
      const parent = sourceSvg?.parentElement;
      const parentHeight = parent ? parent.getBoundingClientRect().height : 0;
      const headerIconOffset = parentHeight ? -Math.round(parentHeight * 0.26) : 0;
      const img = createSvgImage(sourceSvg, parentHeight || undefined, headerIconOffset);
      if (img) {
        img.style.display = "block";
        img.style.margin = "auto";
        svg.replaceWith(img);
      }
    });
  }

  const sourceInfo = source.querySelector("[data-report-info]") as HTMLElement | null;
  const cloneInfo = clone.querySelector("[data-report-info]") as HTMLElement | null;
  if (sourceInfo && cloneInfo) {
    const gap = parseFloat(window.getComputedStyle(sourceInfo).columnGap || "0");
    if (!Number.isNaN(gap) && gap > 0) {
      cloneInfo.style.columnGap = "0";
      cloneInfo.style.rowGap = "0";
      const children = Array.from(cloneInfo.children) as HTMLElement[];
      children.forEach((child, i) => {
        if (i < children.length - 1) {
          child.style.marginRight = `${gap}px`;
        }
      });
    }

    const infoStyle = window.getComputedStyle(sourceInfo);
    const infoLineHeight = parseLineHeight(infoStyle.lineHeight, infoStyle.fontSize);
    const infoExtraOffset = Math.max(1, Math.round(infoLineHeight * 0.18));
    const tagExtraOffset = Math.max(1, Math.round(infoLineHeight * 0.22));
    const tagTextLift = Math.max(1, Math.round(infoLineHeight * 0.26));
    const exportRow = document.createElement("div");
    exportRow.style.display = "block";
    exportRow.style.fontSize = infoStyle.fontSize;
    exportRow.style.lineHeight = infoStyle.lineHeight;
    exportRow.style.color = infoStyle.color;
    exportRow.style.whiteSpace = "normal";

    const itemGap = !Number.isNaN(gap) && gap > 0 ? gap : 6;
    const createItem = () => {
      const item = document.createElement("span");
      item.style.display = "inline-block";
      item.style.verticalAlign = "middle";
      item.style.lineHeight = infoStyle.lineHeight;
      item.style.marginRight = `${itemGap}px`;
      return item;
    };

    const createTextSpan = (text: string, styleSource?: HTMLElement | null) => {
      const span = document.createElement("span");
      span.textContent = text;
      span.style.display = "inline-block";
      span.style.verticalAlign = "middle";
      if (styleSource) {
        const style = window.getComputedStyle(styleSource);
        span.style.fontSize = style.fontSize;
        span.style.fontWeight = style.fontWeight;
        span.style.lineHeight = style.lineHeight;
        span.style.color = style.color;
        span.style.letterSpacing = style.letterSpacing;
      }
      return span;
    };

    const sourceSvgs = sourceInfo.querySelectorAll("svg");
    const sourceInput = sourceInfo.querySelector('input[type="text"]') as HTMLInputElement | null;
    const sourceTags = Array.from(sourceInfo.querySelectorAll("[data-report-tag]")) as HTMLElement[];
    const sourceDate = sourceInfo.querySelector(".text-gray-400") as HTMLElement | null;
    const nameText = sourceInput?.value || sourceInput?.placeholder || "";
    const nameWidth = sourceInput ? sourceInput.getBoundingClientRect().width : 0;

    if (sourceSvgs.length > 0) {
      const nameItem = createItem();
      const icon = createSvgImage(sourceSvgs[0] as SVGSVGElement, infoLineHeight, infoExtraOffset);
      if (icon) {
        icon.style.marginRight = "6px";
        nameItem.appendChild(icon);
      }
      const nameSpan = createTextSpan(nameText, sourceInput);
      nameSpan.style.paddingLeft = "2px";
      nameSpan.style.paddingRight = "2px";
      nameSpan.style.borderBottom = "1px solid transparent";
      if (nameWidth > 0) {
        nameSpan.style.minWidth = `${Math.round(nameWidth)}px`;
        nameSpan.style.display = "inline-block";
      }
      nameItem.appendChild(nameSpan);
      exportRow.appendChild(nameItem);
    }

    if (sourceSvgs.length > 1 && sourceTags.length > 0) {
      const roleItem = createItem();
      const icon = createSvgImage(sourceSvgs[1] as SVGSVGElement, infoLineHeight, infoExtraOffset);
      if (icon) {
        icon.style.marginRight = "6px";
        roleItem.appendChild(icon);
      }
      const roleTag = sourceTags[0];
      if (roleTag) {
        const roleSpan = createTextSpan(roleTag.textContent || "", roleTag);
        roleSpan.style.paddingTop = "2px";
        roleSpan.style.paddingBottom = "2px";
        roleSpan.style.paddingLeft = "8px";
        roleSpan.style.paddingRight = "8px";
        roleSpan.style.borderRadius = window.getComputedStyle(roleTag).borderRadius;
        roleSpan.style.borderWidth = window.getComputedStyle(roleTag).borderWidth;
        roleSpan.style.borderStyle = window.getComputedStyle(roleTag).borderStyle;
        roleSpan.style.borderColor = window.getComputedStyle(roleTag).borderColor;
        roleSpan.style.backgroundColor = window.getComputedStyle(roleTag).backgroundColor;
        roleSpan.style.color = window.getComputedStyle(roleTag).color;
        roleSpan.style.position = "relative";
        roleSpan.style.top = `${tagExtraOffset}px`;
        roleSpan.style.display = "inline-flex";
        roleSpan.style.alignItems = "center";
        const roleText = roleSpan.textContent || "";
        roleSpan.textContent = "";
        const roleInner = document.createElement("span");
        roleInner.textContent = roleText;
        roleInner.style.position = "relative";
        roleInner.style.top = `${-tagTextLift}px`;
        roleSpan.appendChild(roleInner);
        roleItem.appendChild(roleSpan);
      }
      exportRow.appendChild(roleItem);
    }

    sourceTags.slice(1).forEach((tag) => {
      const tagItem = createItem();
      const tagSpan = createTextSpan(tag.textContent || "", tag);
      const tagStyle = window.getComputedStyle(tag);
      tagSpan.style.paddingTop = tagStyle.paddingTop;
      tagSpan.style.paddingBottom = tagStyle.paddingBottom;
      tagSpan.style.paddingLeft = tagStyle.paddingLeft;
      tagSpan.style.paddingRight = tagStyle.paddingRight;
      tagSpan.style.borderRadius = tagStyle.borderRadius;
      tagSpan.style.borderWidth = tagStyle.borderWidth;
      tagSpan.style.borderStyle = tagStyle.borderStyle;
      tagSpan.style.borderColor = tagStyle.borderColor;
      tagSpan.style.backgroundColor = tagStyle.backgroundColor;
      tagSpan.style.color = tagStyle.color;
      tagSpan.style.position = "relative";
      tagSpan.style.top = `${tagExtraOffset}px`;
      tagSpan.style.display = "inline-flex";
      tagSpan.style.alignItems = "center";
      const tagText = tagSpan.textContent || "";
      tagSpan.textContent = "";
      const tagInner = document.createElement("span");
      tagInner.textContent = tagText;
      tagInner.style.position = "relative";
      tagInner.style.top = `${-tagTextLift}px`;
      tagSpan.appendChild(tagInner);
      tagItem.appendChild(tagSpan);
      exportRow.appendChild(tagItem);
    });

    if (sourceDate) {
      const dateItem = document.createElement("span");
      dateItem.style.display = "inline-block";
      dateItem.style.verticalAlign = "middle";
      dateItem.textContent = sourceDate.textContent || "";
      const dateStyle = window.getComputedStyle(sourceDate);
      dateItem.style.color = dateStyle.color;
      dateItem.style.fontSize = dateStyle.fontSize;
      dateItem.style.lineHeight = dateStyle.lineHeight;
      exportRow.appendChild(dateItem);
    }

    cloneInfo.innerHTML = "";
    cloneInfo.style.display = "block";
    cloneInfo.style.flexWrap = "initial";
    cloneInfo.style.alignItems = "initial";
    cloneInfo.style.gap = "0";
    cloneInfo.style.columnGap = "0";
    cloneInfo.style.rowGap = "0";
    cloneInfo.appendChild(exportRow);
  }

  const clonedImages = Array.from(clone.querySelectorAll("img")) as HTMLImageElement[];
  clonedImages.forEach((img) => {
    img.loading = "eager";
    img.decoding = "sync";
  });

  const ready = Promise.all([
    ...svgImages.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    }),
    ...clonedImages.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  ]);

  return {
    node: clone,
    ready,
    cleanup: () => {
      clone.remove();
    }
  };
};

export const ReportCardTemplate: React.FC<ReportCardTemplateProps> = ({
  id = "report-card",
  toolName,
  toolIcon = <Briefcase className="w-4 h-4" />,
  userProfile,
  showRoleTag = true,
  showRoleInImage = true,
  infoFontSize = 14,
  onNameChange,
  children
}) => {
  return (
    <div 
      id={id}
      className="bg-[#FDFBF7] relative min-h-[800px] flex flex-col mx-auto"
      style={{ width: `${REPORT_CARD_WIDTH_REM}rem`, maxWidth: '100%' }}
    >
      {/* Giant Watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.03] z-0 select-none">
          <div className="text-[120px] font-black text-[#151E32] rotate-[-30deg] whitespace-nowrap tracking-tighter">
              EXECUTIVE INSIDER
          </div>
      </div>

      {/* Header */}
      <div 
        data-report-header
        className="bg-[#151E32] px-10 text-white relative z-10 overflow-hidden"
        style={{
          paddingTop: '20px',
          paddingBottom: '24px',
          minHeight: '170px'
        }}
      >
          {/* Decorative Elements */}
          <div data-html2canvas-ignore="true" className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059] opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10 flex flex-col">
              <div className="flex items-center gap-3" style={{ marginBottom: '10px' }}>
                  <div data-report-header-icon className="w-8 h-8 bg-[#C5A059] rounded flex items-center justify-center text-[#151E32] shadow-lg shadow-[#C5A059]/20">
                      {toolIcon}
                  </div>
                  <span className="text-[#C5A059] font-medium tracking-widest text-xs uppercase">Executive Insider</span>
              </div>

              <div data-report-title style={{ paddingBottom: '12px' }}>
                  <h1 
                    className="text-2xl font-bold text-white tracking-tight"
                    style={{
                      lineHeight: '1.3',
                      wordBreak: 'break-word',
                      whiteSpace: 'normal',
                      maxWidth: '100%'
                    }}
                  >
                    {toolName}
                  </h1>
              </div>

              <div 
                data-report-info
                className="flex flex-wrap items-center text-gray-300 font-medium transition-all duration-200"
                style={{ 
                  fontSize: infoFontSize,
                  gap: '6px',
                  lineHeight: '1.4',
                  paddingTop: '2px'
                }}
              >
                  <div className="flex items-center gap-1">
                      <User className="w-[1.1em] h-[1.1em] text-[#C5A059]" />
                      <input
                          type="text"
                          value={userProfile.name}
                          onChange={onNameChange ? (e) => onNameChange(e.target.value) : undefined}
                          readOnly={!onNameChange}
                          className={`bg-transparent border-b border-transparent focus:outline-none text-white transition-all px-1 py-0.5 text-left ${onNameChange ? 'hover:border-gray-500 focus:border-[#C5A059]' : ''}`}
                          style={{ 
                              fontSize: 'inherit',
                              width: `${Math.max(2, (userProfile.name || '').length + 3)}em`,
                              minWidth: '2em'
                          }}
                          placeholder="User"
                      />
                  </div>
                  
                  <div className="flex items-center gap-2">
                      <Briefcase className="w-[1.1em] h-[1.1em] text-[#C5A059]" />
                      {showRoleTag && userProfile.role && (
                          <span data-report-tag className="px-2 py-0.5 rounded bg-[#1e2b45] border border-blue-500/30 text-blue-200 text-[0.85em]">
                              {userProfile.role}
                          </span>
                      )}
                  </div>

                  {showRoleTag && userProfile.industry && (
                      <span data-report-tag className="px-2 py-0.5 rounded bg-[#1e2b45] border border-blue-500/30 text-blue-200 text-[0.85em]">
                          {userProfile.industry}
                      </span>
                  )}

                  {showRoleInImage && userProfile.level && (
                      <span data-report-tag className="px-2 py-0.5 rounded bg-[#1e2b45] border border-blue-500/30 text-blue-200 text-[0.85em]">
                          {userProfile.level}
                      </span>
                  )}
                  
                  <div className="w-px h-[1em] bg-gray-600 hidden sm:block"></div>
                  
                  <div className="text-gray-400">
                      {new Date().toLocaleDateString(undefined, {year:'numeric', month:'numeric', day:'numeric'})}
                  </div>
              </div>
          </div>
      </div>

      {/* Middle Content - Dynamic */}
      {children}

      {/* Footer */}
      <div className="bg-[#151E32] px-8 py-6 border-t border-white/5 flex flex-col items-center justify-center gap-2 mt-auto">
           <div className="text-[10px] text-[#C5A059] font-light tracking-[0.2em] uppercase opacity-60">Powered by Dreamlizer</div>
           <div className="text-[10px] text-blue-200/30 tracking-wider">Executive Insider · {toolName}</div>
      </div>
    </div>
  );
};

// --- Profile Form Template ---

import { Hash } from 'lucide-react';

interface AssessmentProfileFormProps {
  title: string;
  description: string;
  profile: {
    nickname: string;
    role: string;
    level: string;
    gender: string;
    background: string;
  };
  setProfile: (key: string, value: string) => void;
  onStart: () => void;
  themeColor?: "blue" | "indigo";
  modelSelector?: React.ReactNode;
}

export const AssessmentProfileForm: React.FC<AssessmentProfileFormProps> = ({
  title,
  description,
  profile,
  setProfile,
  onStart,
  themeColor = "blue",
  modelSelector
}) => {
  // Theme helpers
  const isBlue = themeColor === "blue";
  const bgLight = isBlue ? "bg-blue-50" : "bg-indigo-50";
  const borderLight = isBlue ? "border-blue-100" : "border-indigo-100";
  const textDark = isBlue ? "text-blue-800" : "text-indigo-800";
  const focusRing = isBlue ? "focus:ring-blue-500" : "focus:ring-indigo-500";
  const btnActive = isBlue ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-indigo-600 text-white border-indigo-600 shadow-md";
  const btnInactive = isBlue ? "hover:border-blue-300 hover:bg-blue-50" : "hover:border-indigo-300 hover:bg-indigo-50";
  const btnGradient = isBlue ? "bg-gradient-to-r from-blue-600 to-indigo-700 hover:shadow-blue-500/30" : "bg-gradient-to-r from-indigo-600 to-violet-700 hover:shadow-indigo-500/30";

  return (
    <div className="h-full min-h-0 flex flex-col items-center justify-start p-6 max-w-md mx-auto overflow-y-auto">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold mb-1 text-zinc-900 dark:text-zinc-100">{title}</h3>
        <p className="text-zinc-500 text-[0.875rem] leading-snug">{description}</p>
      </div>
      
      <div className="w-full space-y-3 relative">
        <div className={`${bgLight} ${borderLight} border rounded-lg p-3 mb-4 text-[0.8125rem] leading-snug ${textDark} flex items-start gap-1`}>
          <div className="mt-0.5"><Briefcase className="w-3.5 h-3.5" /></div>
          <div>
            <span className="font-bold">重要提示：</span>
            <p className="mt-1 opacity-90 leading-snug">“职场角色”与“级别”将直接决定题目的场景复杂度。请务必真实填写，否则生成的题目可能过于简单或脱离实际。</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[0.8125rem] font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 leading-snug">您的昵称 (将显示在报告中)</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={profile.nickname}
                onChange={(e) => setProfile('nickname', e.target.value)}
                className={`w-full pl-10 pr-4 py-1.5 text-[0.875rem] leading-snug border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 ${focusRing} focus:border-transparent outline-none transition-all bg-white dark:bg-zinc-800`}
                placeholder="例如：Alex、王总..."
              />
            </div>
          </div>

          <div>
              <label className="block text-[0.8125rem] font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 leading-snug">当前职级 </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                      "快乐打工人", 
                      "小组长/主管", 
                      "部门经理", 
                      "总监/VP", 
                      "CEO/创始人"
                  ].map((lvl) => (
                      <button
                          key={lvl}
                          onClick={() => setProfile('level', lvl)}
                          className={`py-1.5 px-3 rounded-lg text-[0.8125rem] border transition-all ${
                              profile.level === lvl 
                              ? btnActive
                              : `bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 ${btnInactive}`
                          }`}
                      >
                          {lvl}
                      </button>
                  ))}
              </div>
          </div>

          <div>
            <label className="block text-[0.8125rem] font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 leading-snug">您的职场角色 / 岗位</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={profile.role}
                onChange={(e) => setProfile('role', e.target.value)}
                className={`w-full pl-10 pr-4 py-1.5 text-[0.875rem] leading-snug border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 ${focusRing} focus:border-transparent outline-none transition-all bg-white dark:bg-zinc-800`}
                placeholder="例如：产品经理、人力资源总监..."
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="text-[0.8125rem] font-medium text-zinc-700 dark:text-zinc-300 leading-snug whitespace-nowrap">性别 (用于调整情境语境)</label>
            <div className="flex items-center gap-2">
              {[
                { label: "男", value: "Male" },
                { label: "女", value: "Female" }
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setProfile("gender", item.value)}
                  className={`py-1.5 px-3 rounded-lg text-[0.8125rem] border transition-all ${
                    profile.gender === item.value
                      ? btnActive
                      : `bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 ${btnInactive}`
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[0.8125rem] font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 leading-snug">所在行业 / 背景</label>
            <div className="relative">
              <Hash className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={profile.background}
                onChange={(e) => setProfile('background', e.target.value)}
                className={`w-full pl-10 pr-4 py-1.5 text-[0.875rem] leading-snug border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 ${focusRing} focus:border-transparent outline-none transition-all bg-white dark:bg-zinc-800`}
                placeholder="例如：互联网、制造业、金融..."
              />
            </div>
          </div>

          <button
            onClick={onStart}
            disabled={!profile.role || !profile.level || !profile.gender || !profile.background || !profile.nickname}
            className={`w-full py-2.5 rounded-xl font-semibold text-[0.875rem] text-white transition-all duration-300 transform hover:scale-[1.02] shadow-lg ${
              !profile.role || !profile.level || !profile.gender || !profile.background || !profile.nickname
                ? 'bg-zinc-300 cursor-not-allowed'
                : btnGradient
            }`}
          >
            开始生成模拟战
          </button>

          {modelSelector && (
            <div className="absolute -bottom-10 right-0 flex items-center gap-2">
              {modelSelector}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
