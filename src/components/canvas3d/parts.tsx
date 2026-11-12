"use client";

import { Edges } from "@react-three/drei";
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
