"use client";

import { Edges } from "@react-three/drei";
import type { ReactNode } from "react";
import * as THREE from "three";

/** 3D 가구를 그릴 때 함께 쓰는 재질·상자·색 도우미 */

export const EDGE = "#78716c";
export const METAL = "#a8a29e";

export function Mat({
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
export function Box({
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

export function shade(hex: string, amount: number): string {
  return `#${new THREE.Color(hex).offsetHSL(0, 0, amount).getHexString()}`;
}

/** 모델 함수가 받는 값: 치수(m), 가구 색, 어두운 색, 선택 여부 */
export type ModelProps = {
  w: number;
  d: number;
  h: number;
  color: string;
  dark: string;
  s: boolean;
};

/** 앞판(문·서랍) 두께 */
export const FT = 0.018;
/** 앞판 사이 틈 */
export const GAP = 0.004;
/** 책·옷 색 */
export const PALETTE = [
  "#7c8b9a",
  "#c9a27e",
  "#e5e7eb",
  "#4b5563",
  "#a3b18a",
  "#d4a5a5",
  "#1f2937",
  "#b8c4d6",
  "#e8d5b5",
  "#8b5e4b",
];

/** 같은 입력이면 늘 같은 0~1 값 (책·옷 모양이 렌더마다 바뀌지 않게) */
export function rnd(a: number, b: number): number {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export type Front = { x: number; y: number; w: number; h: number };
export type Handle = "v-left" | "v-right" | "h" | "knob" | "groove" | "none";

/** x0~x1, y0~y1 영역을 cols×rows 칸으로 나눈 앞판들 (틈 포함) */
export function grid(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  cols: number,
  rows: number,
): Front[] {
  const cw = (x1 - x0) / cols;
  const rh = (y1 - y0) / rows;
  const out: Front[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({
        x: x0 + cw * (c + 0.5),
        y: y0 + rh * (r + 0.5),
        w: cw - GAP,
        h: rh - GAP,
      });
    }
  }
  return out;
}

/** 여닫이문 손잡이: 둘씩 짝지어 가운데 쪽에 */
export function pairHandle(i: number, count: number): Handle {
  if (count === 1) return "v-right";
  if (i % 2 === 0 && i < count - 1) return "v-right";
  return "v-left";
}

/** 문·서랍 앞판 하나와 손잡이. z는 몸통 앞면 */
export function Panel({
  f,
  z,
  color,
  s,
  handle,
}: {
  f: Front;
  z: number;
  color: string;
  s: boolean;
  handle: Handle;
}) {
  const hz = z + FT + 0.01;
  // 긴 문은 손 닿는 높이(약 1m)에, 짧은 문은 가운데에 손잡이
  const hy = Math.min(Math.max(1.0, f.y - f.h / 2 + 0.2), f.y + f.h / 2 - 0.15);
  const tall = f.h > 0.8;
  const vy = tall ? hy : f.y;
  const vLen = Math.min(tall ? 0.35 : 0.14, f.h * 0.5);
  let knob: ReactNode = null;
  if (handle === "v-left" || handle === "v-right") {
    const x = f.x + (handle === "v-left" ? -1 : 1) * (f.w / 2 - 0.04);
    knob = (
      <Box
        size={[0.014, vLen, 0.02]}
        position={[x, vy, hz]}
        color={METAL}
        selected={s}
        edges={false}
      />
    );
  } else if (handle === "h") {
    knob = (
      <Box
        size={[Math.min(0.14, f.w * 0.4), 0.014, 0.02]}
        position={[f.x, f.y + (f.h > 0.25 ? f.h * 0.25 : 0), hz]}
        color={METAL}
        selected={s}
        edges={false}
      />
    );
  } else if (handle === "knob") {
    knob = (
      <mesh position={[f.x + (f.w > 0.3 ? f.w / 2 - 0.05 : 0), f.y, hz]} castShadow>
        <sphereGeometry args={[0.014, 14, 10]} />
        <Mat color={METAL} selected={s} />
      </mesh>
    );
  } else if (handle === "groove") {
    knob = (
      <Box
        size={[f.w * 0.7, 0.01, 0.004]}
        position={[f.x, f.y + f.h / 2 - 0.03, z + FT + 0.001]}
        color="#292524"
        edges={false}
      />
    );
  }
  return (
    <>
      <Box size={[f.w, f.h, FT]} position={[f.x, f.y, z + FT / 2]} color={color} selected={s} />
      {knob}
    </>
  );
}

/** 앞쪽이 뒤로 들어간 걸레받이 */
export function Plinth({ w, d, h, color }: { w: number; d: number; h: number; color: string }) {
  return (
    <Box size={[w - 0.04, h, d - 0.06]} position={[0, h / 2, -0.02]} color={color} edges={false} />
  );
}

/** 네 귀퉁이 다리 */
export function Legs({
  w,
  d,
  h,
  color,
  size = 0.035,
  inset = 0.04,
}: {
  w: number;
  d: number;
  h: number;
  color: string;
  size?: number;
  inset?: number;
}) {
  return (
    <>
      {[
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([sx, sz], i) => (
        <Box
          key={i}
          size={[size, h, size]}
          position={[sx * (w / 2 - inset), h / 2, sz * (d / 2 - inset)]}
          color={color}
          edges={false}
        />
      ))}
    </>
  );
}

/** 몸통: 앞판 두께만큼 뒤로 물린 상자 */
export function Carcass({
  w,
  d,
  y0,
  y1,
  color,
  s,
}: {
  w: number;
  d: number;
  y0: number;
  y1: number;
  color: string;
  s: boolean;
}) {
  const ch = Math.max(y1 - y0, 0.01);
  return (
    <Box size={[w, ch, d - FT]} position={[0, y0 + ch / 2, -FT / 2]} color={color} selected={s} />
  );
}

/** 가구 하나의 3D 모양을 그리는 함수. 가구 중심이 원점, 바닥이 y=0, 뒤(벽 쪽)가 -z */
export type Model3D = (p: ModelProps) => ReactNode;
