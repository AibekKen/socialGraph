"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { forceCollide } from "d3-force-3d";
import type { GraphLink, GraphNode } from "./ContactGraph";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ForceGraphInstance = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
}) as any;

type Props = {
  nodes: GraphNode[];
  links: GraphLink[];
  onNodeClick?: (node: GraphNode) => void;
};

const TEXTURE_SIZE = 128;

const textureCache = new Map<string, any>();

function drawAvatarCanvas(
  canvas: HTMLCanvasElement,
  node: GraphNode,
  img: HTMLImageElement | null
) {
  const ctx = canvas.getContext("2d")!;
  const r = TEXTURE_SIZE / 2;
  ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  ctx.save();
  ctx.beginPath();
  ctx.arc(r, r, r - 4, 0, 2 * Math.PI);
  ctx.closePath();
  ctx.clip();

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, 0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  } else {
    ctx.fillStyle = node.isMe ? "#4f46e5" : "#0ea5e9";
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
    ctx.font = "bold 40px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const initials = node.name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    ctx.fillText(initials, r, r);
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(r, r, r - 4, 0, 2 * Math.PI);
  ctx.lineWidth = 6;
  ctx.strokeStyle = node.isMe ? "#4f46e5" : "#ffffff";
  ctx.stroke();
}

function getAvatarTexture(node: GraphNode): any {
  const key = node.avatarUrl ?? node.id;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set(key, texture);

  drawAvatarCanvas(canvas, node, null);
  texture.needsUpdate = true;

  if (node.avatarUrl) {
    const img = new Image();
    img.onload = () => {
      drawAvatarCanvas(canvas, node, img);
      texture.needsUpdate = true;
    };
    img.src = node.avatarUrl;
  }

  return texture;
}

export default function ContactGraph3D({ nodes, links, onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphInstance>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const applyForces = useCallback((instance: ForceGraphInstance | null) => {
    fgRef.current = instance;
    if (!instance) return;
    instance.d3Force("charge").strength(-90).distanceMax(500);
    instance.d3Force("link").distance(50);
    instance.d3Force("collide", forceCollide((n: GraphNode) => (n.isMe ? 22 : 14)));
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
      nodes: nodes.map((n) => (n.isMe ? { ...n, fx: 0, fy: 0, fz: 0 } : { ...n })),
      links: links.map((l) => ({ ...l })),
    }),
    [nodes, links]
  );

  const nodeThreeObject = useCallback((node: GraphNode) => {
    const texture = getAvatarTexture(node);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    const scale = node.isMe ? 18 : 10;
    sprite.scale.set(scale, scale, 1);

    const group = new THREE.Group();

    if (node.isMe) {
      // подсветка вокруг своего узла — полупрозрачный светящийся диск позади аватара
      const glowMaterial = new THREE.SpriteMaterial({
        color: 0x4f46e5,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      });
      const glow = new THREE.Sprite(glowMaterial);
      glow.scale.set(scale * 2.2, scale * 2.2, 1);
      group.add(glow);
    }

    const label = document.createElement("canvas");
    label.width = 256;
    label.height = 48;
    const lctx = label.getContext("2d")!;
    lctx.font = "24px sans-serif";
    lctx.textAlign = "center";
    lctx.fillStyle = "#111827";
    lctx.fillText(node.name, 128, 28);
    const labelTexture = new THREE.CanvasTexture(label);
    const labelMaterial = new THREE.SpriteMaterial({ map: labelTexture, transparent: true });
    const labelSprite = new THREE.Sprite(labelMaterial);
    labelSprite.scale.set(16, 3, 1);
    labelSprite.position.set(0, -scale / 2 - 2, 0);

    group.add(sprite);
    group.add(labelSprite);
    return group;
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full">
      <ForceGraph3D
        ref={applyForces}
        width={size.width || undefined}
        height={size.height || undefined}
        graphData={graphData}
        nodeLabel={(n: GraphNode) => n.headline ?? n.name}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        linkColor={(l: GraphLink) => (l.status === "confirmed" ? "#94a3b8" : "#e2e8f0")}
        linkOpacity={0.6}
        linkWidth={0.6}
        onNodeClick={(node: GraphNode) => onNodeClick?.(node)}
        onEngineStop={() => fgRef.current?.zoomToFit(400, 40)}
        backgroundColor="#ffffff"
        cooldownTicks={100}
      />
    </div>
  );
}
