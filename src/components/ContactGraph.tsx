"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { forceCollide } from "d3-force";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ForceGraphInstance = any;

// react-force-graph-2d's generic props don't infer well against our node/link
// shapes — cast to any at the import boundary rather than fighting the types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
}) as any;

export type GraphNode = {
  id: string;
  name: string;
  headline?: string;
  isMe?: boolean;
  avatarUrl?: string;
  shareContacts?: boolean;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
};

export type GraphLink = {
  source: string;
  target: string;
  status: "pending" | "confirmed";
  comment?: string;
};

type Props = {
  nodes: GraphNode[];
  links: GraphLink[];
  onNodeClick?: (node: GraphNode) => void;
  onExpandClick?: (node: GraphNode) => void;
  onAddContactClick?: (node: GraphNode) => void;
  expandedIds?: Set<string>;
  highlightIds?: Set<string>;
};

const NODE_RADIUS = 14;

const imageCache = new Map<string, HTMLImageElement>();

function getAvatarImage(url: string): HTMLImageElement {
  let img = imageCache.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    imageCache.set(url, img);
  }
  return img;
}

const BADGE_OFFSET = 0.72;

export default function ContactGraph({
  nodes,
  links,
  onNodeClick,
  onExpandClick,
  onAddContactClick,
  expandedIds,
  highlightIds,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphInstance>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const applyForces = useCallback((instance: ForceGraphInstance | null) => {
    fgRef.current = instance;
    if (!instance) return;
    // сильнее отталкиваем узлы друг от друга и не даём кружкам накладываться
    instance.d3Force("charge").strength(-140).distanceMax(400);
    instance.d3Force("link").distance(60);
    instance.d3Force(
      "collide",
      forceCollide((n: GraphNode) => (n.isMe ? NODE_RADIUS * 1.7 : NODE_RADIUS) + 14)
    );
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(
    () => ({
      // "Вы" закрепляем в центре симуляции — так себя всегда легко найти
      nodes: nodes.map((n) => (n.isMe ? { ...n, fx: 0, fy: 0 } : { ...n })),
      links: links.map((l) => ({ ...l })),
    }),
    [nodes, links]
  );

  const radiusOf = (node: GraphNode) => (node.isMe ? NODE_RADIUS * 1.7 : NODE_RADIUS);
  const badgeRadiusOf = (node: GraphNode) => (node.isMe ? 6 : 5);

  const paintNode = useCallback(
    (node: GraphNode & { x?: number; y?: number }, ctx: CanvasRenderingContext2D) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const r = radiusOf(node);

      const img = node.avatarUrl ? getAvatarImage(node.avatarUrl) : null;
      const imgReady = !!img && img.complete && img.naturalWidth > 0;

      const isHighlighted = !node.isMe && highlightIds?.has(node.id);

      if (node.isMe) {
        // мягкое свечение вокруг своего узла, чтобы он сразу бросался в глаза
        const glow = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 1.9);
        glow.addColorStop(0, "rgba(79, 70, 229, 0.35)");
        glow.addColorStop(1, "rgba(79, 70, 229, 0)");
        ctx.beginPath();
        ctx.fillStyle = glow;
        ctx.arc(x, y, r * 1.9, 0, 2 * Math.PI);
        ctx.fill();
      } else if (isHighlighted) {
        // подсветка узлов, найденных поиском — не нужно перекрывать граф модалкой,
        // достаточно увидеть нужных людей прямо на графе
        const glow = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 1.8);
        glow.addColorStop(0, "rgba(245, 158, 11, 0.4)");
        glow.addColorStop(1, "rgba(245, 158, 11, 0)");
        ctx.beginPath();
        ctx.fillStyle = glow;
        ctx.arc(x, y, r * 1.8, 0, 2 * Math.PI);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI, false);
      if (imgReady) {
        ctx.save();
        ctx.clip();
        ctx.drawImage(img!, x - r, y - r, r * 2, r * 2);
        ctx.restore();
      } else {
        ctx.fillStyle = node.isMe ? "#4f46e5" : "#0ea5e9";
        ctx.fill();
      }
      ctx.lineWidth = node.isMe || isHighlighted ? 3 : 1.5;
      ctx.strokeStyle = node.isMe ? "#4f46e5" : isHighlighted ? "#f59e0b" : "#ffffff";
      ctx.stroke();

      if (!imgReady) {
        ctx.font = `${node.isMe ? 8 : 6}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        const initials = node.name
          .split(" ")
          .map((p) => p[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();
        ctx.fillText(initials, x, y);
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      let labelY = y + r + 6;
      if (node.headline) {
        ctx.font = "3.2px sans-serif";
        ctx.fillStyle = "#6b7280";
        ctx.fillText(node.headline, x, labelY);
        labelY += 5;
      }

      ctx.font = node.isMe ? "bold 5px sans-serif" : "4px sans-serif";
      ctx.fillStyle = node.isMe ? "#4f46e5" : "#111827";
      ctx.fillText(node.name, x, labelY + 2);

      // бейдж-кнопка "раскрыть контакты" на краю аватара
      if (onExpandClick) {
        const isExpanded = expandedIds?.has(node.id);
        const badgeR = badgeRadiusOf(node);
        const bx = x + r * BADGE_OFFSET;
        const by = y + r * BADGE_OFFSET;

        ctx.beginPath();
        ctx.arc(bx, by, badgeR, 0, 2 * Math.PI);
        ctx.fillStyle = isExpanded ? "#ffffff" : "#4f46e5";
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = isExpanded ? "#4f46e5" : "#ffffff";
        ctx.stroke();

        // иконка "сеть" — три узла, соединённые линиями, вместо +/-
        const iconColor = isExpanded ? "#4f46e5" : "#ffffff";
        const p1 = { x: bx, y: by - badgeR * 0.5 };
        const p2 = { x: bx - badgeR * 0.45, y: by + badgeR * 0.35 };
        const p3 = { x: bx + badgeR * 0.45, y: by + badgeR * 0.35 };
        const dotR = Math.max(badgeR * 0.16, 0.8);

        ctx.beginPath();
        ctx.strokeStyle = iconColor;
        ctx.lineWidth = 1;
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();

        ctx.fillStyle = iconColor;
        for (const p of [p1, p2, p3]) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, dotR, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      // бейдж-кнопка "добавить контакт" — только на своём узле, снизу,
      // на одном уровне с кнопкой раскрытия, но с другой стороны
      if (onAddContactClick && node.isMe) {
        const badgeR = badgeRadiusOf(node);
        const bx = x - r * BADGE_OFFSET;
        const by = y + r * BADGE_OFFSET;

        ctx.beginPath();
        ctx.arc(bx, by, badgeR, 0, 2 * Math.PI);
        ctx.fillStyle = "#4f46e5";
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        // иконка "плюс"
        ctx.strokeStyle = "#ffffff";
        const half = badgeR * 0.45;
        ctx.lineCap = "round";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(bx - half, by);
        ctx.lineTo(bx + half, by);
        ctx.moveTo(bx, by - half);
        ctx.lineTo(bx, by + half);
        ctx.stroke();
      }
    },
    [onExpandClick, onAddContactClick, expandedIds, highlightIds]
  );

  const handleNodeClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any, event: MouseEvent) => {
      const n = node as GraphNode & { x?: number; y?: number };

      if (onExpandClick && fgRef.current && event) {
        const target = event.target as HTMLElement | null;
        const rect = target?.getBoundingClientRect?.();
        const offsetX = (event as unknown as { offsetX?: number }).offsetX ?? (rect ? event.clientX - rect.left : 0);
        const offsetY = (event as unknown as { offsetY?: number }).offsetY ?? (rect ? event.clientY - rect.top : 0);
        const coords = fgRef.current.screen2GraphCoords(offsetX, offsetY);
        const r = radiusOf(n);
        const bx = (n.x ?? 0) + r * BADGE_OFFSET;
        const by = (n.y ?? 0) + r * BADGE_OFFSET;
        const hitR = badgeRadiusOf(n) + 3; // небольшой запас для удобства попадания пальцем
        if (Math.hypot(coords.x - bx, coords.y - by) <= hitR) {
          onExpandClick(n);
          return;
        }
      }

      if (onAddContactClick && n.isMe && fgRef.current && event) {
        const target = event.target as HTMLElement | null;
        const rect = target?.getBoundingClientRect?.();
        const offsetX = (event as unknown as { offsetX?: number }).offsetX ?? (rect ? event.clientX - rect.left : 0);
        const offsetY = (event as unknown as { offsetY?: number }).offsetY ?? (rect ? event.clientY - rect.top : 0);
        const coords = fgRef.current.screen2GraphCoords(offsetX, offsetY);
        const r = radiusOf(n);
        const abx = (n.x ?? 0) - r * BADGE_OFFSET;
        const aby = (n.y ?? 0) + r * BADGE_OFFSET;
        const hitR = badgeRadiusOf(n) + 3;
        if (Math.hypot(coords.x - abx, coords.y - aby) <= hitR) {
          onAddContactClick(n);
          return;
        }
      }

      onNodeClick?.(n);
    },
    [onNodeClick, onExpandClick, onAddContactClick]
  );

  return (
    <div ref={containerRef} className="h-full w-full">
      <ForceGraph2D
        ref={applyForces}
        width={size.width || undefined}
        height={size.height || undefined}
        graphData={graphData}
        nodeLabel={(n: GraphNode) => n.headline ?? n.name}
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={(node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
          const n = node as GraphNode & { x?: number; y?: number };
          const x = n.x ?? 0;
          const y = n.y ?? 0;
          const r = radiusOf(n);
          // хит-зона чуть больше аватара, чтобы захватить бейдж на его краю
          const hasBadge = onExpandClick || (onAddContactClick && n.isMe);
          const hitR = hasBadge ? r * BADGE_OFFSET + badgeRadiusOf(n) + 3 : r;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, hitR, 0, 2 * Math.PI, false);
          ctx.fill();
        }}
        linkColor={(l: GraphLink) => (l.status === "confirmed" ? "#94a3b8" : "#e2e8f0")}
        linkLineDash={(l: GraphLink) => (l.status === "pending" ? [3, 3] : [])}
        linkWidth={1.5}
        onNodeClick={handleNodeClick}
        onEngineStop={() => {
          const fg = fgRef.current;
          if (!fg) return;
          fg.zoomToFit(400, 60);
          // при одном-двух узлах zoomToFit зумит слишком сильно (круг
          // перекрывает интерфейс) — ограничиваем максимальный масштаб
          setTimeout(() => {
            if (fg.zoom() > 4) fg.zoom(4, 300);
          }, 450);
        }}
        cooldownTicks={100}
      />
    </div>
  );
}
