"use client";

import { Edges } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { findCatalogItem } from "@/catalog/furniture";
import type { FurnitureItem } from "@/domain/document";
import { lShapeLocal } from "@/geometry/furniture";

const M = 1 / 1000;
const EDGE = "#78716c";

/** 다리 달린 테이블처럼 그릴 가구 */
const TABLE_LIKE = new Set([
  "dining-4",
  "dining-6",
  "coffee-table",
  "desk",
  "computer-desk",
  "side-table",
  "table-round",
  "l-desk",
]);
const CHAIR_LIKE = new Set(["chair"]);

type Props = {
  item: FurnitureItem;
  selected: boolean;
  onSelect?: (e: ThreeEvent<MouseEvent>) => void;
};

function Mat({
  color,
  selected,
  opacity,
}: {
  color: string;
  selected?: boolean;
  opacity?: number;
}) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={0.85}
      emissive={selected ? "#2563eb" : "#000000"}
      emissiveIntensity={selected ? 0.25 : 0}
      transparent={opacity !== undefined}
      opacity={opacity ?? 1}
    />
  );
}

/** 가로·깊이·높이 m 단위의 상자. 바닥 기준이 아니라 중심 기준 */
function Box({
  size,
  position,
  color,
  selected,
  edges = true,
  opacity,
}: {
  size: [number, number, number];
  position: [number, number, number];
  color: string;
  selected?: boolean;
  edges?: boolean;
  opacity?: number;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <Mat color={color} selected={selected} opacity={opacity} />
      {edges && <Edges color={EDGE} threshold={20} />}
    </mesh>
  );
}

function shade(hex: string, amount: number): string {
  return `#${new THREE.Color(hex).offsetHSL(0, 0, amount).getHexString()}`;
}

export function Furniture3D({ item, selected, onSelect }: Props) {
  const c = findCatalogItem(item.catalogId);
  const symbol = c?.symbol ?? "plain";
  const w = item.width * M;
  const d = item.depth * M;
  const h = Math.max(item.height * M, 0.005);
  const color = item.color;
  const dark = shade(color, -0.12);
  const s = selected;

  const lShape = useMemo(() => {
    if (symbol !== "l-shape") return null;
    const pts = lShapeLocal(item.width, item.depth).map(
      (p) => new THREE.Vector2(p.x * M, -p.y * M),
    );
    return new THREE.Shape(pts);
  }, [symbol, item.width, item.depth]);

  let body: ReactNode;
  if (symbol === "l-shape" && lShape) {
    const top = 0.04;
    const legs = lShapeLocal(item.width, item.depth)
      .filter((_, i) => i !== 3)
      .map((p) => [p.x * M * 0.94, p.y * M * 0.94] as const);
    body = (
      <>
        <mesh position={[0, h - top, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <extrudeGeometry args={[lShape, { depth: top, bevelEnabled: false }]} />
          <Mat color={color} selected={s} />
          <Edges color={EDGE} threshold={20} />
        </mesh>
        {legs.map(([x, z], i) => (
          <Box
            key={i}
            size={[0.04, h - top, 0.04]}
            position={[x, (h - top) / 2, z]}
            color={dark}
            edges={false}
          />
        ))}
      </>
    );
  } else if (TABLE_LIKE.has(item.catalogId)) {
    const top = Math.min(0.04, h * 0.2);
    const round = symbol === "round";
    body = round ? (
      <>
        <mesh position={[0, h - top / 2, 0]} scale={[1, 1, d / w]} castShadow>
          <cylinderGeometry args={[w / 2, w / 2, top, 48]} />
          <Mat color={color} selected={s} />
        </mesh>
        <mesh position={[0, (h - top) / 2, 0]}>
          <cylinderGeometry args={[0.04, 0.12, h - top, 16]} />
          <Mat color={dark} />
        </mesh>
      </>
    ) : (
      <>
        <Box size={[w, top, d]} position={[0, h - top / 2, 0]} color={color} selected={s} />
        {[
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ].map(([sx, sz], i) => (
          <Box
            key={i}
            size={[0.045, h - top, 0.045]}
            position={[sx * (w / 2 - 0.04), (h - top) / 2, sz * (d / 2 - 0.04)]}
            color={dark}
            edges={false}
          />
        ))}
      </>
    );
  } else if (CHAIR_LIKE.has(item.catalogId)) {
    const seat = Math.min(0.45, h * 0.55);
    body = (
      <>
        <Box size={[w, 0.04, d]} position={[0, seat, 0]} color={color} selected={s} />
        <Box
          size={[w, h - seat, 0.04]}
          position={[0, seat + (h - seat) / 2, -d / 2 + 0.02]}
          color={color}
          selected={s}
        />
        {[
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ].map(([sx, sz], i) => (
          <Box
            key={i}
            size={[0.03, seat, 0.03]}
            position={[sx * (w / 2 - 0.03), seat / 2, sz * (d / 2 - 0.03)]}
            color={dark}
            edges={false}
          />
        ))}
      </>
    );
  } else if (symbol === "bed") {
    const base = h * 0.5;
    const mattress = h - base;
    const head = Math.max(h + 0.45, 0.9);
    const pillowCount = item.width >= 1300 ? 2 : 1;
    const pw = (w - 0.1 * (pillowCount + 1)) / pillowCount;
    body = (
      <>
        <Box size={[w, base, d]} position={[0, base / 2, 0]} color={dark} selected={s} />
        <Box
          size={[w - 0.03, mattress, d - 0.1]}
          position={[0, base + mattress / 2, 0.035]}
          color="#f5f5f4"
        />
        <Box
          size={[w, 0.08, d * 0.6]}
          position={[0, h + 0.03, d * 0.2]}
          color={color}
          selected={s}
        />
        <Box
          size={[w, head, 0.08]}
          position={[0, head / 2, -d / 2 + 0.04]}
          color={dark}
          selected={s}
        />
        {Array.from({ length: pillowCount }, (_, i) => (
          <Box
            key={i}
            size={[pw, 0.12, 0.35]}
            position={[-w / 2 + 0.1 + pw / 2 + i * (pw + 0.1), h + 0.05, -d / 2 + 0.33]}
            color="#ffffff"
          />
        ))}
      </>
    );
  } else if (symbol === "sofa") {
    const seat = h * 0.5;
    const back = Math.min(0.22, d * 0.25);
    const arm = Math.min(0.2, w * 0.12);
    body = (
      <>
        <Box size={[w, seat, d]} position={[0, seat / 2, 0]} color={color} selected={s} />
        <Box
          size={[w, h, back]}
          position={[0, h / 2, -d / 2 + back / 2]}
          color={dark}
          selected={s}
        />
        <Box
          size={[arm, h * 0.72, d]}
          position={[-w / 2 + arm / 2, h * 0.36, 0]}
          color={dark}
          selected={s}
        />
        <Box
          size={[arm, h * 0.72, d]}
          position={[w / 2 - arm / 2, h * 0.36, 0]}
          color={dark}
          selected={s}
        />
      </>
    );
  } else if (symbol === "round") {
    body = (
      <mesh position={[0, h / 2, 0]} scale={[1, 1, d / w]} castShadow>
        <cylinderGeometry args={[w / 2, w / 2.4, h, 32]} />
        <Mat color={color} selected={s} />
      </mesh>
    );
  } else if (symbol === "hanger") {
    const post = 0.03;
    body = (
      <>
        {[-1, 1].map((sx) => (
          <Box
            key={sx}
            size={[post, h, post]}
            position={[sx * (w / 2 - post), h / 2, 0]}
            color="#71717a"
            selected={s}
            edges={false}
          />
        ))}
        {[-1, 1].map((sx) => (
          <Box
            key={`f${sx}`}
            size={[post, post, d]}
            position={[sx * (w / 2 - post), post / 2, 0]}
            color="#71717a"
            edges={false}
          />
        ))}
        <Box
          size={[w, post, post]}
          position={[0, h - 0.06, 0]}
          color="#71717a"
          selected={s}
          edges={false}
        />
        {/* 걸린 옷 */}
        <Box
          size={[w - 0.12, h * 0.5, d * 0.75]}
          position={[0, h - 0.08 - (h * 0.5) / 2, 0]}
          color={shade(color, 0.1)}
          opacity={0.55}
          edges={false}
        />
      </>
    );
  } else {
    body = <Box size={[w, h, d]} position={[0, h / 2, 0]} color={color} selected={s} />;
  }

  return (
    <group
      position={[item.x * M, 0, item.y * M]}
      rotation={[0, (-item.rotation * Math.PI) / 180, 0]}
      onClick={onSelect}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      {body}
    </group>
  );
}
