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
  "table",
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
  } else if (item.catalogId === "crib") {
    // 베이비 침대: 네 기둥 + 위아래 난간 + 긴 쪽 세로 살 + 짧은 쪽 막힌 판, 안에 매트리스
    const post = Math.min(0.05, w * 0.08, d * 0.08);
    const rail = 0.035;
    const deck = Math.min(0.32, h * 0.38); // 매트리스 받침 높이
    const pad = Math.min(0.1, (h - deck) * 0.35); // 매트리스 두께
    const innerW = w - post * 2;
    const innerD = d - post * 2;
    const slatH = h - deck - rail * 2;
    const slatCount = (len: number) => Math.max(2, Math.round(len / 0.075));
    const longSlats = slatCount(innerW);
    const panelH = h - deck - rail;
    body = (
      <>
        {/* 네 기둥 (위는 살짝 둥근 머리) */}
        {[
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ].map(([sx, sz], i) => (
          <group key={`p${i}`} position={[sx * (w / 2 - post / 2), 0, sz * (d / 2 - post / 2)]}>
            <Box size={[post, h, post]} position={[0, h / 2, 0]} color={color} selected={s} />
            <mesh position={[0, h + post * 0.25, 0]} castShadow>
              <sphereGeometry args={[post * 0.55, 16, 12]} />
              <Mat color={color} selected={s} />
            </mesh>
          </group>
        ))}
        {/* 긴 쪽: 위·아래 난간과 세로 살 */}
        {[-1, 1].map((sz) => (
          <group key={`l${sz}`} position={[0, 0, sz * (d / 2 - post / 2)]}>
            <Box
              size={[innerW, rail, rail]}
              position={[0, h - rail / 2, 0]}
              color={color}
              selected={s}
            />
            <Box
              size={[innerW, rail, rail]}
              position={[0, deck + rail / 2, 0]}
              color={color}
              selected={s}
            />
            {Array.from({ length: longSlats }, (_, i) => (
              <mesh
                key={i}
                position={[-innerW / 2 + (innerW / (longSlats + 1)) * (i + 1), deck + rail + slatH / 2, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.011, 0.011, slatH, 10]} />
                <Mat color={color} selected={s} />
              </mesh>
            ))}
          </group>
        ))}
        {/* 짧은 쪽: 막힌 판 (머리·발 쪽) */}
        {[-1, 1].map((sx) => (
          <Box
            key={`e${sx}`}
            size={[0.02, panelH, innerD]}
            position={[sx * (w / 2 - post / 2), deck + panelH / 2, 0]}
            color={shade(color, 0.06)}
            selected={s}
          />
        ))}
        {/* 바닥 쪽 가로대 (다리 사이 틀) */}
        {[-1, 1].map((sz) => (
          <Box
            key={`b${sz}`}
            size={[innerW, 0.06, 0.02]}
            position={[0, deck - 0.03, sz * (d / 2 - post / 2)]}
            color={dark}
            edges={false}
          />
        ))}
        {/* 매트리스와 접힌 이불 */}
        <Box
          size={[innerW - 0.02, pad, innerD - 0.02]}
          position={[0, deck + rail + pad / 2, 0]}
          color="#fafaf9"
        />
        <Box
          size={[innerW * 0.38, 0.04, innerD - 0.06]}
          position={[innerW * 0.25, deck + rail + pad + 0.02, 0]}
          color={shade(color, 0.22)}
          edges={false}
        />
      </>
    );
  } else if (item.catalogId === "nightstand") {
    // 협탁: 짧은 다리 위 몸통 + 살짝 튀어나온 상판 + 앞쪽 서랍 두 칸과 손잡이 (뒤가 -z, 앞이 +z)
    const legH = Math.min(0.1, h * 0.18);
    const top = Math.min(0.025, h * 0.06);
    const bodyW = w - 0.02;
    const bodyD = d - 0.02;
    const bodyH = Math.max(h - top - legH, 0.01);
    const gap = 0.012;
    const drawerH = (bodyH - gap * 3) / 2;
    const front = bodyD / 2;
    body = (
      <>
        {/* 다리 */}
        {[
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ].map(([sx, sz], i) => (
          <Box
            key={i}
            size={[0.03, legH, 0.03]}
            position={[sx * (bodyW / 2 - 0.03), legH / 2, sz * (bodyD / 2 - 0.03)]}
            color={dark}
            edges={false}
          />
        ))}
        {/* 몸통과 상판 */}
        <Box
          size={[bodyW, bodyH, bodyD]}
          position={[0, legH + bodyH / 2, 0]}
          color={color}
          selected={s}
        />
        <Box size={[w, top, d]} position={[0, h - top / 2, 0]} color={dark} selected={s} />
        {/* 서랍 두 칸 */}
        {[0, 1].map((i) => {
          const y = legH + gap + drawerH / 2 + i * (drawerH + gap);
          return (
            <group key={i} position={[0, y, front]}>
              <Box
                size={[bodyW - gap * 2, drawerH, 0.012]}
                position={[0, 0, 0.006]}
                color={shade(color, 0.05)}
                selected={s}
              />
              <mesh position={[0, 0, 0.022]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.012, 0.012, 0.02, 16]} />
                <Mat color="#a8a29e" selected={s} />
              </mesh>
            </group>
          );
        })}
      </>
    );
  } else if (item.catalogId === "vanity") {
    // 화장대: 상판 + 왼쪽 서랍장 + 오른쪽 다리 + 뒤쪽에 세운 거울과 화장품 몇 개 (뒤가 -z, 앞이 +z)
    const top = Math.min(0.03, h * 0.05);
    const underH = h - top;
    const cabW = Math.min(w * 0.36, 0.4);
    const cabX = -w / 2 + cabW / 2;
    const gap = 0.01;
    const drawers = 3;
    const drawerH = (underH - gap * (drawers + 1)) / drawers;
    const leg = 0.035;
    const mirrorW = Math.min(w * 0.6, 0.6);
    const mirrorH = Math.min(0.75, mirrorW * 1.3);
    const frame = 0.03;
    const mirrorZ = -d / 2 + 0.04;
    body = (
      <>
        {/* 상판 */}
        <Box size={[w, top, d]} position={[0, h - top / 2, 0]} color={color} selected={s} />
        {/* 왼쪽 서랍장 */}
        <Box
          size={[cabW, underH, d - 0.02]}
          position={[cabX, underH / 2, -0.01]}
          color={color}
          selected={s}
        />
        {Array.from({ length: drawers }, (_, i) => {
          const y = gap + drawerH / 2 + i * (drawerH + gap);
          return (
            <group key={i} position={[cabX, y, d / 2 - 0.02]}>
              <Box
                size={[cabW - gap * 2, drawerH, 0.012]}
                position={[0, 0, 0.006]}
                color={shade(color, 0.05)}
                selected={s}
              />
              <Box
                size={[Math.min(0.1, cabW * 0.4), 0.012, 0.015]}
                position={[0, 0, 0.02]}
                color="#a8a29e"
                selected={s}
                edges={false}
              />
            </group>
          );
        })}
        {/* 오른쪽 다리 두 개 */}
        {[-1, 1].map((sz) => (
          <Box
            key={sz}
            size={[leg, underH, leg]}
            position={[w / 2 - leg / 2 - 0.01, underH / 2, sz * (d / 2 - leg / 2 - 0.01)]}
            color={dark}
            edges={false}
          />
        ))}
        {/* 열린 쪽 위의 얕은 서랍 (앞판) */}
        <Box
          size={[w - cabW - leg - 0.04, 0.08, 0.015]}
          position={[(cabW - leg) / 2, h - top - 0.04, d / 2 - 0.02]}
          color={shade(color, 0.05)}
          selected={s}
        />
        {/* 거울: 틀 + 유리 */}
        <Box
          size={[mirrorW, mirrorH, frame]}
          position={[0, h + mirrorH / 2, mirrorZ]}
          color={dark}
          selected={s}
        />
        <mesh position={[0, h + mirrorH / 2, mirrorZ + frame / 2 + 0.002]}>
          <boxGeometry args={[mirrorW - 0.05, mirrorH - 0.05, 0.004]} />
          <meshStandardMaterial color="#dbe4ea" roughness={0.08} metalness={0.6} />
        </mesh>
        {/* 화장품 */}
        {[
          [0.12, 0.09, "#f9a8d4"],
          [0.18, 0.13, "#fde68a"],
          [0.24, 0.07, "#e9d5ff"],
        ].map(([x, ph, c], i) => (
          <mesh
            key={`c${i}`}
            position={[(x as number) * Math.min(1, w / 0.8), h + (ph as number) / 2, d * 0.05]}
            castShadow
          >
            <cylinderGeometry args={[0.02, 0.022, ph as number, 16]} />
            <Mat color={c as string} />
          </mesh>
        ))}
      </>
    );
  } else if (item.catalogId === "office-chair") {
    // 사무용 의자: 바퀴 달린 다섯 갈래 받침 + 가스 실린더 + 방석 + 팔걸이 + 뒤로 살짝 누운 등받이·머리받침 (뒤가 -z)
    const metal = "#3f3f46";
    const reach = Math.min(w, d) / 2 - 0.03; // 받침 다리 길이
    const seatY = Math.min(0.48, h * 0.44);
    const seatT = 0.08;
    const seatW = Math.min(w * 0.78, 0.52);
    const seatD = Math.min(d * 0.78, 0.5);
    const head = h > 0.95 ? Math.min(0.16, (h - seatY) * 0.2) : 0;
    const backBottom = seatY + seatT / 2 + 0.06;
    const backH = Math.max(h - backBottom - head - (head ? 0.04 : 0), 0.1);
    const tilt = -0.12;
    const backZ = -seatD / 2 + 0.03;
    body = (
      <>
        {/* 다섯 갈래 받침과 바퀴 */}
        {Array.from({ length: 5 }, (_, i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <group key={i} rotation={[0, a, 0]}>
              <Box
                size={[0.045, 0.035, reach]}
                position={[0, 0.075, reach / 2]}
                color={metal}
                selected={s}
                edges={false}
              />
              <mesh position={[0, 0.03, reach - 0.01]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.028, 0.028, 0.03, 16]} />
                <Mat color="#18181b" />
              </mesh>
            </group>
          );
        })}
        {/* 가스 실린더 */}
        <mesh position={[0, (0.09 + seatY) / 2, 0]} castShadow>
          <cylinderGeometry args={[0.022, 0.032, seatY - 0.09, 16]} />
          <Mat color={metal} selected={s} />
        </mesh>
        {/* 방석 */}
        <Box
          size={[seatW, seatT, seatD]}
          position={[0, seatY, 0.02]}
          color={color}
          selected={s}
        />
        {/* 등받이 지지대 */}
        <Box
          size={[0.05, backBottom - seatY + 0.1, 0.03]}
          position={[0, (seatY + backBottom + 0.1) / 2, backZ - 0.04]}
          color={metal}
          edges={false}
        />
        {/* 등받이와 머리받침: 방석 뒤 끝을 축으로 살짝 뒤로 젖힘 */}
        <group position={[0, backBottom, backZ]} rotation={[tilt, 0, 0]}>
          <Box
            size={[seatW * 0.95, backH, 0.06]}
            position={[0, backH / 2, 0]}
            color={color}
            selected={s}
          />
          {head > 0 && (
            <>
              <Box
                size={[0.04, 0.06, 0.02]}
                position={[0, backH + 0.03, -0.01]}
                color={metal}
                edges={false}
              />
              <Box
                size={[seatW * 0.55, head, 0.06]}
                position={[0, backH + 0.04 + head / 2, 0]}
                color={color}
                selected={s}
              />
            </>
          )}
        </group>
        {/* 팔걸이 */}
        {[-1, 1].map((sx) => (
          <group key={`a${sx}`} position={[sx * (seatW / 2 + 0.02), seatY, 0]}>
            <Box
              size={[0.03, 0.2, 0.03]}
              position={[0, 0.1, -0.02]}
              color={metal}
              edges={false}
            />
            <Box
              size={[0.06, 0.03, seatD * 0.55]}
              position={[0, 0.215, -0.02]}
              color={dark}
              selected={s}
            />
          </group>
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
