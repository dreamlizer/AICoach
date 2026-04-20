"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  FileText,
  Gamepad2,
  Library,
  Map as MapIcon,
  MessageCircle,
  Orbit,
  Pencil,
} from "lucide-react";
import { StartupFeatureId } from "@/lib/startup_preload";

const normalizeFeatureOrder = (candidate: unknown, allIds: string[]): string[] | null => {
  if (!Array.isArray(candidate)) return null;
  const allIdSet = new Set(allIds);
  const deduped = candidate.filter((id): id is string => typeof id === "string" && allIdSet.has(id));
  const missing = allIds.filter((id) => !deduped.includes(id));
  const merged = [...deduped, ...missing];
  if (merged.length !== allIds.length) return null;
  return merged;
};

type FeatureHubProps = {
  onOpenSuperMap: () => void;
  onOpenDictionary: () => void;
  onOpenAssessments: () => void;
  onOpenConversationLab: () => void;
  onOpenOcr: () => void;
  onOpenSolarSystem: () => void;
  onOpenWinLinez: () => void;
  onOpenPikachuVolleyball: () => void;
  onOpenSuika: () => void;
  onOpenSkillHub: () => void;
  onFeatureIntent?: (featureId: StartupFeatureId) => void;
};

type FeatureCardItem = {
  id: string;
  title: string;
  description: string;
  accent: string;
  icon: React.ReactNode;
  onClick: () => void;
  compactTitle?: boolean;
  preloadFeatureId?: StartupFeatureId;
};

type FeatureCardProps = FeatureCardItem & {
  isEditing: boolean;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
  onIntent?: () => void;
};

function FeatureCard({
  title,
  description,
  accent,
  icon,
  onClick,
  compactTitle = false,
  isEditing,
  isDragging = false,
  dragHandleProps,
  onIntent,
}: FeatureCardProps) {
  return (
    <article
      onClick={() => {
        if (!isEditing) onClick();
      }}
      onKeyDown={(event) => {
        if (isEditing) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={() => {
        if (!isEditing) onIntent?.();
      }}
      onTouchStart={() => {
        if (!isEditing) onIntent?.();
      }}
      onFocus={() => {
        if (!isEditing) onIntent?.();
      }}
      role="button"
      tabIndex={isEditing ? -1 : 0}
      aria-label={isEditing ? `${title}（拖拽排序）` : title}
      className={`site-hover-card group relative flex h-[274px] flex-col overflow-hidden rounded-[28px] border border-[var(--site-border)] bg-[var(--site-panel-strong)] text-left shadow-[0_12px_30px_rgba(35,23,28,0.05)] ${
        isEditing ? "cursor-grab touch-none select-none" : "hover:border-[var(--site-border-strong)]"
      } ${isDragging ? "z-20 shadow-[0_26px_52px_rgba(35,23,28,0.22)]" : ""}`}
      {...dragHandleProps}
    >
      <div
        className="absolute inset-x-0 top-0 h-[5px]"
        style={{ background: `linear-gradient(90deg, ${accent} 0%, transparent 86%)` }}
      />
      <div
        className="pointer-events-none absolute -right-8 top-0 h-44 w-44 opacity-75 blur-3xl"
        style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: "linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.48) 24%, transparent 56%)" }}
      />

      <div className={`relative flex h-full flex-col p-6 ${isEditing && !isDragging ? "card-editing-wiggle-inner" : ""}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 pr-2">
            <h3
              className={`mt-1 font-semibold leading-[0.96] text-[var(--site-text)] whitespace-nowrap ${
                compactTitle
                  ? "text-[30px] tracking-[-0.05em] md:text-[34px]"
                  : "text-[36px] tracking-[-0.04em] md:text-[40px]"
              }`}
            >
              {title}
            </h3>
          </div>

          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-[var(--site-border)] text-[var(--site-text)] shadow-[0_10px_24px_rgba(35,23,28,0.07)]"
            style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.92) 0%, ${accent} 180%)` }}
          >
            {icon}
          </div>
        </div>

        <div
          className="mt-5 min-h-[5.2em] max-w-[24ch] overflow-hidden text-[15px] leading-[1.72] text-[var(--site-text-soft)]"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          }}
        >
          {description}
        </div>

        <div className="mt-auto flex justify-end pt-7">
          <div
            className={`site-hover-chip site-hover-chip-inverse flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold shadow-[0_12px_24px_rgba(35,23,28,0.14)] ${
              isEditing
                ? "bg-white/85 text-[var(--site-text)]"
                : "bg-[var(--site-text)] text-white group-hover:translate-x-0.5"
            }`}
          >
            <span>{isEditing ? "拖拽排序" : "进入模块"}</span>
            <ArrowRight className={`h-4 w-4 transition-transform duration-300 ${isEditing ? "" : "group-hover:translate-x-1"}`} />
          </div>
        </div>
      </div>
    </article>
  );
}

function SortableFeatureCard({
  card,
  isEditing,
  onIntent,
}: {
  card: FeatureCardItem;
  isEditing: boolean;
  onIntent?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: !isEditing,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition || "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        zIndex: isDragging ? 40 : 1,
        opacity: isDragging ? 0 : 1,
      }}
    >
      <FeatureCard
        {...card}
        isEditing={isEditing}
        isDragging={isDragging}
        dragHandleProps={isEditing ? { ...attributes, ...listeners } : undefined}
        onIntent={onIntent}
      />
    </div>
  );
}

export function FeatureHub({
  onOpenSuperMap,
  onOpenDictionary,
  onOpenAssessments,
  onOpenConversationLab,
  onOpenOcr,
  onOpenSolarSystem,
  onOpenWinLinez,
  onOpenPikachuVolleyball,
  onOpenSuika,
  onOpenSkillHub,
  onFeatureIntent,
}: FeatureHubProps) {
  const STORAGE_KEY = "dream_lab_feature_order_v1";
  const { user } = useAuth();

  const cards: FeatureCardItem[] = useMemo(
    () => [
      {
        id: "skill-hub",
        title: "Skill 仓库",
        description: "按来源汇总实用技能，先看简介和拆解，再决定是否下载与吸收。",
        accent: "rgba(122, 179, 155, 0.28)",
        icon: <Library className="h-5 w-5" />,
        onClick: onOpenSkillHub,
        compactTitle: true,
      },
      {
        id: "super-map",
        title: "超级地图",
        description: "按地区快速点选业务版图，做汇报时一眼看清覆盖范围。",
        accent: "rgba(111, 139, 224, 0.28)",
        icon: <MapIcon className="h-5 w-5" />,
        onClick: onOpenSuperMap,
        preloadFeatureId: "superMap",
      },
      {
        id: "word-lookup",
        title: "简易查词",
        description: "查单词、词组和短句，阅读写作时能快速确认用法。",
        accent: "rgba(108, 142, 196, 0.28)",
        icon: <BookOpen className="h-5 w-5" />,
        onClick: onOpenDictionary,
        compactTitle: true,
      },
      {
        id: "personality-assessments",
        title: "性格测评",
        description: "MBTI、DISC、PDP 集中查看，快速了解风格差异与协作偏好。",
        accent: "rgba(236, 176, 118, 0.28)",
        icon: <BrainCircuit className="h-5 w-5" />,
        onClick: onOpenAssessments,
        compactTitle: true,
      },
      {
        id: "ocr-studio",
        title: "OCR 工作台",
        description: "图片文字一键提取，可继续整理、润色并导出结果。",
        accent: "rgba(177, 152, 221, 0.28)",
        icon: <FileText className="h-5 w-5" />,
        onClick: onOpenOcr,
        compactTitle: true,
      },
      {
        id: "solar-system",
        title: "太阳系漫游",
        description: "沉浸式浏览行星轨道与运行状态，适合展示和科普探索。",
        accent: "rgba(117, 155, 237, 0.28)",
        icon: <Orbit className="h-5 w-5" />,
        onClick: onOpenSolarSystem,
        compactTitle: true,
        preloadFeatureId: "solarSystem",
      },
      {
        id: "conversation-lab",
        title: "对话实验室",
        description: "适合连续追问和长期任务，上下文与历史记录都能接着用。",
        accent: "rgba(157, 183, 162, 0.28)",
        icon: <MessageCircle className="h-5 w-5" />,
        onClick: onOpenConversationLab,
        compactTitle: true,
      },
      {
        id: "winlinez",
        title: "WINLINEZ",
        description: "经典连线消除玩法，支持分数、成就和历史记录查看。",
        accent: "rgba(228, 84, 69, 0.24)",
        icon: <Gamepad2 className="h-5 w-5" />,
        onClick: onOpenWinLinez,
        compactTitle: true,
      },
      {
        id: "pikachu-volleyball",
        title: "皮卡丘排球",
        description: "经典双人排球复刻，保留原版手感、菜单和声音效果。",
        accent: "rgba(249, 200, 78, 0.3)",
        icon: <Gamepad2 className="h-5 w-5" />,
        onClick: onOpenPikachuVolleyball,
        compactTitle: true,
        preloadFeatureId: "pikachuVolleyball",
      },
      {
        id: "suika",
        title: "合成大西瓜",
        description: "水果下落后相同可合成，节奏轻快，适合随手来一局。",
        accent: "rgba(243, 141, 84, 0.3)",
        icon: <Gamepad2 className="h-5 w-5" />,
        onClick: onOpenSuika,
        compactTitle: true,
        preloadFeatureId: "suika",
      },
    ],
    [
      onOpenSuperMap,
      onOpenDictionary,
      onOpenAssessments,
      onOpenConversationLab,
      onOpenOcr,
      onOpenSolarSystem,
      onOpenWinLinez,
      onOpenPikachuVolleyball,
      onOpenSuika,
      onOpenSkillHub,
    ]
  );

  const defaultOrder = useMemo(
    () => [
      "super-map",
      "skill-hub",
      "word-lookup",
      "solar-system",
      "winlinez",
      "ocr-studio",
      "pikachu-volleyball",
      "personality-assessments",
      "conversation-lab",
      "suika",
    ],
    []
  );

  const [cardOrder, setCardOrder] = useState<string[]>(defaultOrder);
  const [isEditing, setIsEditing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localOrderReady, setLocalOrderReady] = useState(false);
  const syncedUserIdRef = useRef<number | null>(null);
  const syncedOrderSignatureRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useLayoutEffect(() => {
    const allIds = cards.map((card) => card.id);
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const normalized = normalizeFeatureOrder(parsed, allIds);
        if (normalized) setCardOrder(normalized);
      } catch {
        // Keep default order when local cache is invalid.
      }
    }
    setLocalOrderReady(true);
  }, [cards]);

  useEffect(() => {
    if (!user?.id || !localOrderReady) return;
    const allIds = cards.map((card) => card.id);
    const localSignature = JSON.stringify(cardOrder);
    if (syncedUserIdRef.current === user.id && syncedOrderSignatureRef.current === localSignature) {
      return;
    }
    let cancelled = false;

    const syncFeatureOrder = async () => {
      try {
        const payload = await apiClient.auth.getFeatureOrder();
        const cloudOrder = normalizeFeatureOrder(payload?.order, allIds);
        if (cloudOrder) {
          if (!cancelled) {
            setCardOrder(cloudOrder);
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudOrder));
            syncedUserIdRef.current = user.id;
            syncedOrderSignatureRef.current = JSON.stringify(cloudOrder);
          }
          return;
        }

        const localRaw = window.localStorage.getItem(STORAGE_KEY);
        if (!localRaw) return;
        const parsedLocal = JSON.parse(localRaw);
        const localOrder = normalizeFeatureOrder(parsedLocal, allIds);
        if (!localOrder) return;
        await apiClient.auth.saveFeatureOrder(localOrder);
        syncedUserIdRef.current = user.id;
        syncedOrderSignatureRef.current = JSON.stringify(localOrder);
      } catch {
        // Keep local experience even when cloud sync fails.
      }
    };

    syncFeatureOrder();

    return () => {
      cancelled = true;
    };
  }, [user?.id, localOrderReady, cards, cardOrder]);

  const cardMap = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);

  const orderedCards = useMemo(() => {
    const byOrder = cardOrder.map((id) => cardMap.get(id)).filter((card): card is FeatureCardItem => Boolean(card));
    const missing = cards.filter((card) => !cardOrder.includes(card.id));
    return [...byOrder, ...missing];
  }, [cardMap, cardOrder, cards]);

  const activeCard = activeId ? cardMap.get(activeId) || null : null;

  const handleDragStart = (event: DragStartEvent) => {
    if (!isEditing) return;
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!isEditing || !over || active.id === over.id) return;

    setCardOrder((items) => {
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleEditToggle = () => {
    if (isEditing) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cardOrder));
      if (user?.id) {
        apiClient.auth.saveFeatureOrder(cardOrder).catch(() => {
          // Local save is already successful.
        });
        syncedUserIdRef.current = user.id;
        syncedOrderSignatureRef.current = JSON.stringify(cardOrder);
      }
      setIsEditing(false);
      setActiveId(null);
      return;
    }
    setIsEditing(true);
  };

  return (
    <section className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
      <div
        className="relative overflow-hidden rounded-[32px] border border-[var(--site-border)] px-7 py-6 shadow-[0_16px_36px_rgba(35,23,28,0.05)] md:px-8 md:py-7"
        style={{ background: "var(--site-hero)" }}
      >
        <button
          type="button"
          onClick={handleEditToggle}
          className={`absolute bottom-7 right-6 inline-flex h-10 items-center justify-center gap-2 rounded-full border px-3 text-sm font-semibold transition md:bottom-8 md:right-7 ${
            isEditing
              ? "border-[var(--site-border-strong)] bg-[var(--site-text)] text-white shadow-[0_10px_20px_rgba(35,23,28,0.18)]"
              : "border-[var(--site-border)] bg-white/80 text-[var(--site-text)] hover:bg-white"
          }`}
          aria-label={isEditing ? "完成卡片排序" : "编辑卡片排序"}
        >
          {isEditing ? (
            <span>完成</span>
          ) : (
            <>
              <Pencil className="h-4 w-4" />
              <span>编辑</span>
            </>
          )}
        </button>

        <div className="text-[11px] font-semibold tracking-[0.24em] text-[var(--site-accent-strong)]">DREAM LAB</div>
        <div className="mt-3">
          <h1 className="text-[40px] font-semibold tracking-[-0.07em] text-[var(--site-text)] md:text-[54px]">梦想实验站</h1>
        </div>
        {isEditing ? (
          <p className="mt-2 text-xs text-[var(--site-text-soft)]">拖动卡片可调整顺序，点击“完成”后保存布局。</p>
        ) : null}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={cardOrder} strategy={rectSortingStrategy}>
          <div
            className={`grid grid-cols-1 gap-4 transition-opacity duration-150 md:grid-cols-2 lg:grid-cols-3 ${
              localOrderReady ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {orderedCards.map((card) => (
              <SortableFeatureCard
                key={card.id}
                card={card}
                isEditing={isEditing}
                onIntent={card.preloadFeatureId ? () => onFeatureIntent?.(card.preloadFeatureId!) : undefined}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.2,0.8,0.2,1)" }}>
          {activeCard ? (
            <div className="w-full max-w-[380px] scale-[1.03]">
              <FeatureCard {...activeCard} isEditing={isEditing} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}
