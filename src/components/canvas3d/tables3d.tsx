"use client";

import { Edges } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { lShapeLocal } from "@/geometry/furniture";
import {
  Box,
  EDGE,
  FT,
  METAL,
  Mat,
  type Model3D,
  type ModelProps as P,
  PALETTE,
  Panel,
  grid,
  shade,
} from "./parts";

/**
 * 테이블·책상 3D 모양. 치수는 m, 가구 중심이 원점이고 바닥이 y=0.
 * 뒤(벽 쪽)가 -z, 앞(사람이 앉는 쪽)이 +z.
 */

const FRAME = "#3f3f46";
const SCREEN = "#111827";

/** 네 귀퉁이 좌표 (x, z) */
const CORNERS = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
] as const;

/** 상판 아래 테두리 띠(에이프런): 다리 사이를 잇는 네 개의 가로대 */
function Apron({
  lx,
  lz,
  y,
  h,
  t,
  color,
  s,
}: {
  /** 다리 중심까지의 x 거리 */
  lx: number;
  /** 다리 중심까지의 z 거리 */
  lz: number;
  /** 가로대 중심 높이 */
  y: number;
  h: number;
  t: number;
  color: string;
  s: boolean;
}) {
  return (
    <>
      {[-1, 1].map((sz) => (
        <Box
          key={`x${sz}`}
          size={[lx * 2, h, t]}
          position={[0, y, sz * lz]}
          color={color}
          selected={s}
          edges={false}
        />
      ))}
      {[-1, 1].map((sx) => (
        <Box
          key={`z${sx}`}
          size={[t, h, lz * 2]}
          position={[sx * lx, y, 0]}
          color={color}
          selected={s}
          edges={false}
        />
      ))}
    </>
  );
}

/** 아래로 갈수록 가늘어지는 둥근 다리 */
function TaperLeg({
  x,
  z,
  h,
  r0,
  r1,
  color,
  s,
}: {
  x: number;
  z: number;
  h: number;
  r0: number;
  r1: number;
  color: string;
  s: boolean;
}) {
  return (
    <mesh position={[x, h / 2, z]} castShadow>
      <cylinderGeometry args={[r0, r1, h, 14]} />
      <Mat color={color} selected={s} />
    </mesh>
  );
}

/** 모니터: 받침 + 목 + 얇은 화면. y는 받침 바닥, 화면은 +z를 본다 */
function Monitor({
  x,
  y,
  z,
  sw,
  s,
}: {
  x: number;
  y: number;
  z: number;
  /** 화면 가로 길이 */
  sw: number;
  s: boolean;
}) {
  const sh = sw * 0.58;
  const neck = 0.12;
  return (
    <group position={[x, y, z]}>
      <Box
        size={[Math.min(0.24, sw * 0.4), 0.012, 0.16]}
        position={[0, 0.006, 0]}
        color={FRAME}
        selected={s}
        edges={false}
      />
      <Box
        size={[0.04, neck + sh * 0.3, 0.025]}
        position={[0, (neck + sh * 0.3) / 2, -0.04]}
        color={FRAME}
        selected={s}
        edges={false}
      />
      {/* 화면 테두리와 화면 */}
      <Box
        size={[sw, sh, 0.025]}
        position={[0, neck + sh / 2, -0.015]}
        color="#27272a"
        selected={s}
        edges={false}
      />
      <Box
        size={[sw - 0.016, sh - 0.016, 0.002]}
        position={[0, neck + sh / 2, -0.002]}
        color={SCREEN}
        edges={false}
      />
    </group>
  );
}

/** 키보드와 마우스. y는 상판 윗면 */
function KeyboardMouse({ x, y, z, s }: { x: number; y: number; z: number; s: boolean }) {
  return (
    <group position={[x, y, z]}>
      <Box
        size={[0.44, 0.015, 0.14]}
        position={[0, 0.0075, 0]}
        color="#27272a"
        selected={s}
        edges={false}
      />
      <Box size={[0.42, 0.004, 0.12]} position={[0, 0.017, 0]} color="#52525b" edges={false} />
      <mesh position={[0.3, 0.012, 0.01]} scale={[0.6, 0.35, 1]} castShadow>
        <sphereGeometry args={[0.05, 14, 10]} />
        <Mat color="#27272a" selected={s} />
      </mesh>
    </group>
  );
}

/** 식탁: 두꺼운 상판 + 에이프런 + 굵은 다리 네 개 (6인용은 아래 가로대) */
function Dining({ w, d, h, color, dark, s, wide }: P & { wide: boolean }) {
  const top = Math.min(0.035, h * 0.06);
  const over = Math.min(0.06, w * 0.05, d * 0.06);
  const leg = Math.min(wide ? 0.07 : 0.06, w * 0.08, d * 0.1);
  const legH = h - top;
  const lx = w / 2 - over - leg / 2;
  const lz = d / 2 - over - leg / 2;
  const apronH = Math.min(0.085, legH * 0.15);
  const apronT = 0.022;
  const barY = Math.min(0.14, legH * 0.2);
  const bowlR = Math.min(0.13, w * 0.1, d * 0.14);
  return (
    <>
      {/* 상판: 위판 + 살짝 들어간 아래 테두리 */}
      <Box size={[w, top * 0.7, d]} position={[0, h - top * 0.35, 0]} color={color} selected={s} />
      <Box
        size={[w - 0.012, top * 0.3, d - 0.012]}
        position={[0, h - top * 0.85, 0]}
        color={shade(color, -0.05)}
        selected={s}
        edges={false}
      />
      {CORNERS.map(([sx, sz], i) => (
        <Box
          key={i}
          size={[leg, legH, leg]}
          position={[sx * lx, legH / 2, sz * lz]}
          color={dark}
          selected={s}
        />
      ))}
      <Apron
        lx={lx}
        lz={lz - leg * 0.25}
        y={legH - apronH / 2}
        h={apronH}
        t={apronT}
        color={dark}
        s={s}
      />
      {wide && (
        <>
          {/* 양쪽 다리를 잇는 아래 가로대 + 가운데 긴 가로대 */}
          {[-1, 1].map((sx) => (
            <Box
              key={sx}
              size={[leg * 0.6, leg * 0.6, lz * 2]}
              position={[sx * lx, barY, 0]}
              color={dark}
              selected={s}
              edges={false}
            />
          ))}
          <Box
            size={[lx * 2, leg * 0.6, leg * 0.6]}
            position={[0, barY, 0]}
            color={dark}
            selected={s}
            edges={false}
          />
        </>
      )}
      {/* 가운데 테이블 러너와 과일 그릇 */}
      <Box
        size={[Math.max(w * 0.6, 0.1), 0.003, Math.min(0.32, d * 0.4)]}
        position={[0, h + 0.0015, 0]}
        color="#e8d5b5"
        edges={false}
      />
      <mesh position={[0, h + 0.03, 0]} castShadow>
        <cylinderGeometry args={[bowlR, bowlR * 0.55, 0.055, 24, 1, true]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[(i - 1) * bowlR * 0.4, h + 0.045, (i === 1 ? -0.3 : 0.25) * bowlR]}
          castShadow
        >
          <sphereGeometry args={[bowlR * 0.28, 14, 10]} />
          <Mat color={["#ea580c", "#dc2626", "#facc15"][i]} />
        </mesh>
      ))}
    </>
  );
}

/** 원형 테이블: 둥근 상판(타원 가능) + 가운데 기둥 + 넓은 받침 */
function RoundTable({ w, d, h, color, dark, s }: P) {
  const top = Math.min(0.032, h * 0.06);
  const r = w / 2;
  const sz = d / w;
  const minR = Math.min(w, d) / 2;
  const colR = Math.min(0.05, minR * 0.15);
  const footR = Math.min(0.27, minR * 0.62);
  const footH = Math.min(0.03, h * 0.05);
  const skirtH = Math.min(0.06, h * 0.1);
  const coneH = Math.min(0.08, h * 0.12);
  const colY0 = footH + coneH;
  const colY1 = h - top - skirtH;
  return (
    <>
      <mesh position={[0, h - top / 2, 0]} scale={[1, 1, sz]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r - 0.006, top, 56]} />
        <Mat color={color} selected={s} />
        <Edges color={EDGE} threshold={20} />
      </mesh>
      {/* 상판 아래 받침 링 */}
      <mesh position={[0, h - top - skirtH / 2, 0]} scale={[1, 1, sz]} castShadow>
        <cylinderGeometry args={[r * 0.55, r * 0.5, skirtH, 40]} />
        <Mat color={dark} selected={s} />
      </mesh>
      {/* 기둥 */}
      <mesh position={[0, (colY0 + colY1) / 2, 0]} castShadow>
        <cylinderGeometry args={[colR, colR * 1.15, colY1 - colY0, 20]} />
        <Mat color={dark} selected={s} />
      </mesh>
      {/* 넓어지는 받침 */}
      <mesh position={[0, footH + coneH / 2, 0]} castShadow>
        <cylinderGeometry args={[colR * 1.15, footR * 0.75, coneH, 32]} />
        <Mat color={dark} selected={s} />
      </mesh>
      <mesh position={[0, footH / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[footR, footR, footH, 40]} />
        <Mat color={shade(dark, -0.05)} selected={s} />
      </mesh>
      {/* 작은 꽃병 */}
      <mesh position={[0, h + 0.07, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.045, 0.14, 18]} />
        <Mat color="#b8c4d6" />
      </mesh>
      <mesh position={[0, h + 0.17, 0]} castShadow>
        <sphereGeometry args={[0.05, 14, 10]} />
        <Mat color="#a3b18a" />
      </mesh>
    </>
  );
}

/** 작은 테이블: 얇은 상판 + 에이프런 + 아래로 가늘어지는 다리 */
function SmallTable({ w, d, h, color, dark, s }: P) {
  const top = Math.min(0.025, h * 0.05);
  const over = Math.min(0.03, w * 0.05, d * 0.05);
  const r0 = Math.min(0.022, w * 0.04, d * 0.04);
  const lx = w / 2 - over - r0;
  const lz = d / 2 - over - r0;
  const legH = h - top;
  const apronH = Math.min(0.065, legH * 0.12);
  return (
    <>
      <Box size={[w, top, d]} position={[0, h - top / 2, 0]} color={color} selected={s} />
      {CORNERS.map(([sx, sz], i) => (
        <TaperLeg
          key={i}
          x={sx * lx}
          z={sz * lz}
          h={legH}
          r0={r0}
          r1={r0 * 0.6}
          color={dark}
          s={s}
        />
      ))}
      <Apron
        lx={lx}
        lz={lz}
        y={legH - apronH / 2}
        h={apronH}
        t={0.016}
        color={shade(color, -0.04)}
        s={s}
      />
      {/* 머그컵 */}
      <mesh position={[w * 0.18, h + 0.045, d * 0.1]} castShadow>
        <cylinderGeometry args={[0.04, 0.036, 0.09, 18]} />
        <Mat color="#e5e7eb" />
      </mesh>
    </>
  );
}

/** 접시 모양 트레이: 바닥판 + 낮은 테두리 */
function Tray({
  x,
  y,
  z,
  tw,
  td,
  color,
}: {
  x: number;
  y: number;
  z: number;
  tw: number;
  td: number;
  color: string;
}) {
  const rim = 0.025;
  const t = 0.008;
  return (
    <group position={[x, y, z]}>
      <Box size={[tw, t, td]} position={[0, t / 2, 0]} color={color} edges={false} />
      {[-1, 1].map((sz) => (
        <Box
          key={`z${sz}`}
          size={[tw, rim, t]}
          position={[0, rim / 2, sz * (td / 2 - t / 2)]}
          color={color}
          edges={false}
        />
      ))}
      {[-1, 1].map((sx) => (
        <Box
          key={`x${sx}`}
          size={[t, rim, td]}
          position={[sx * (tw / 2 - t / 2), rim / 2, 0]}
          color={color}
          edges={false}
        />
      ))}
    </group>
  );
}

/** 거실 탁자: 낮은 상판 + 아래 선반 + 짧은 다리, 위에 트레이·아래에 잡지 */
function CoffeeTable({ w, d, h, color, dark, s }: P) {
  const top = Math.min(0.035, h * 0.1);
  const leg = Math.min(0.045, w * 0.06, d * 0.1);
  const inset = Math.min(0.025, w * 0.03);
  const lx = w / 2 - inset - leg / 2;
  const lz = d / 2 - inset - leg / 2;
  const legH = h - top;
  const shelfY = Math.min(0.1, legH * 0.3);
  const shelfT = 0.018;
  const trayW = Math.min(0.36, w * 0.4);
  const trayD = Math.min(0.24, d * 0.5);
  const magW = Math.min(0.28, w * 0.3);
  const magD = Math.min(0.21, d * 0.45);
  return (
    <>
      <Box size={[w, top, d]} position={[0, h - top / 2, 0]} color={color} selected={s} />
      {CORNERS.map(([sx, sz], i) => (
        <Box
          key={i}
          size={[leg, legH, leg]}
          position={[sx * lx, legH / 2, sz * lz]}
          color={dark}
          selected={s}
        />
      ))}
      {/* 다리 사이 아래 선반 */}
      <Box
        size={[lx * 2 - leg, shelfT, lz * 2 + leg]}
        position={[0, shelfY, 0]}
        color={shade(color, -0.04)}
        selected={s}
      />
      {/* 위: 트레이와 컵 두 개 */}
      <Tray x={w * 0.18} y={h} z={0} tw={trayW} td={trayD} color={dark} />
      {[-1, 1].map((i) => (
        <mesh key={i} position={[w * 0.18 + i * trayW * 0.2, h + 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.03, 0.08, 16]} />
          <Mat color={i < 0 ? "#e5e7eb" : "#7c8b9a"} />
        </mesh>
      ))}
      {/* 아래 선반: 겹쳐 놓인 잡지 */}
      {[0, 1, 2].map((i) => (
        <Box
          key={`m${i}`}
          size={[magW, 0.008, magD]}
          position={[-w * 0.2 + i * 0.012, shelfY + shelfT / 2 + 0.004 + i * 0.008, i * 0.01]}
          color={PALETTE[(i * 3 + 1) % PALETTE.length]}
          edges={false}
        />
      ))}
    </>
  );
}

/** 사이드테이블: 작은 상판 + 서랍 하나 + 아래 선반 + 가는 다리 */
function SideTable({ w, d, h, color, dark, s }: P) {
  const top = Math.min(0.025, h * 0.05);
  const leg = Math.min(0.03, w * 0.07, d * 0.07);
  const inset = 0.015;
  const lx = w / 2 - inset - leg / 2;
  const lz = d / 2 - inset - leg / 2;
  const legH = h - top;
  const boxH = Math.min(0.13, legH * 0.25);
  const boxW = lx * 2 - leg;
  const boxD = lz * 2 - leg;
  const boxY0 = legH - boxH;
  const shelfY = Math.min(0.13, legH * 0.25);
  const frontZ = boxD / 2 - FT;
  return (
    <>
      <Box size={[w, top, d]} position={[0, h - top / 2, 0]} color={color} selected={s} />
      {CORNERS.map(([sx, sz], i) => (
        <Box
          key={i}
          size={[leg, legH, leg]}
          position={[sx * lx, legH / 2, sz * lz]}
          color={dark}
          selected={s}
          edges={false}
        />
      ))}
      {/* 서랍 몸통과 앞판 */}
      <Box
        size={[boxW, boxH, boxD - FT]}
        position={[0, boxY0 + boxH / 2, -FT / 2]}
        color={color}
        selected={s}
      />
      <Panel
        f={{ x: 0, y: boxY0 + boxH / 2, w: boxW - 0.01, h: boxH - 0.01 }}
        z={frontZ}
        color={shade(color, 0.04)}
        s={s}
        handle="knob"
      />
      {/* 아래 선반 */}
      <Box
        size={[boxW, 0.016, boxD]}
        position={[0, shelfY, 0]}
        color={shade(color, -0.04)}
        selected={s}
      />
      {/* 위: 작은 화분 */}
      <mesh position={[w * 0.15, h + 0.045, -d * 0.1]} castShadow>
        <cylinderGeometry args={[0.045, 0.035, 0.09, 16]} />
        <Mat color="#c9a27e" />
      </mesh>
      <mesh position={[w * 0.15, h + 0.12, -d * 0.1]} castShadow>
        <sphereGeometry args={[0.06, 14, 10]} />
        <Mat color="#4d7c0f" />
      </mesh>
    </>
  );
}

/** 책상: 상판 + 오른쪽 서랍 몸통 + 왼쪽 다리 둘 + 뒤 가림판, 위에 노트북·스탠드 */
function Desk({ w, d, h, color, dark, s }: P) {
  const top = Math.min(0.028, h * 0.05);
  const y1 = h - top;
  const pw = Math.min(0.4, w * 0.35);
  const px = w / 2 - pw / 2 - 0.02;
  const pz0 = -d / 2 + 0.03;
  const pz1 = d / 2 - 0.03;
  const kick = Math.min(0.03, h * 0.05);
  const rows = y1 - kick > 0.5 ? 3 : 2;
  const fronts = grid(px - pw / 2, px + pw / 2, kick, y1, 1, rows);
  const leg = Math.min(0.045, w * 0.05, d * 0.08);
  const lx = -w / 2 + 0.04 + leg / 2;
  const lz = d / 2 - 0.04 - leg / 2;
  const panelH = Math.min(0.35, y1 * 0.5);
  const panelZ = -d / 2 + 0.05;
  const lapW = Math.min(0.32, w * 0.3);
  const lapD = Math.min(0.22, d * 0.4);
  return (
    <>
      <Box size={[w, top, d]} position={[0, h - top / 2, 0]} color={color} selected={s} />
      {/* 서랍 몸통 */}
      <Box
        size={[pw, y1, pz1 - FT - pz0]}
        position={[px, y1 / 2, (pz0 + pz1 - FT) / 2]}
        color={color}
        selected={s}
      />
      <Box
        size={[pw - 0.01, kick, 0.006]}
        position={[px, kick / 2, pz1 - 0.003]}
        color={dark}
        edges={false}
      />
      {fronts.map((f, i) => (
        <Panel key={i} f={f} z={pz1 - FT} color={shade(color, 0.04)} s={s} handle="h" />
      ))}
      {/* 왼쪽 다리 둘 + 다리 사이 가로대 */}
      {[-1, 1].map((sz) => (
        <Box
          key={sz}
          size={[leg, y1, leg]}
          position={[lx, y1 / 2, sz * lz]}
          color={dark}
          selected={s}
        />
      ))}
      <Box
        size={[leg * 0.7, leg * 0.7, lz * 2]}
        position={[lx, 0.12, 0]}
        color={dark}
        selected={s}
        edges={false}
      />
      {/* 뒤 가림판: 왼쪽 다리부터 서랍 몸통까지 */}
      <Box
        size={[px - pw / 2 - lx, panelH, 0.016]}
        position={[(lx + px - pw / 2) / 2, y1 - panelH / 2, panelZ]}
        color={shade(color, -0.04)}
        selected={s}
      />
      {/* 위: 노트북 (열린 모양) */}
      <group position={[-w * 0.08, h, d * 0.05]}>
        <Box
          size={[lapW, 0.012, lapD]}
          position={[0, 0.006, 0]}
          color="#a1a1aa"
          selected={s}
          edges={false}
        />
        <group position={[0, 0.012, -lapD / 2]} rotation={[-0.25, 0, 0]}>
          <Box
            size={[lapW, lapD, 0.008]}
            position={[0, lapD / 2, -0.004]}
            color="#a1a1aa"
            selected={s}
            edges={false}
          />
          <Box
            size={[lapW - 0.02, lapD - 0.02, 0.001]}
            position={[0, lapD / 2, 0.0005]}
            color={SCREEN}
            edges={false}
          />
        </group>
      </group>
      {/* 스탠드 조명 */}
      <group position={[w / 2 - 0.15, h, -d / 2 + 0.12]}>
        <mesh position={[0, 0.008, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.065, 0.016, 20]} />
          <Mat color={FRAME} selected={s} />
        </mesh>
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.007, 0.007, 0.38, 8]} />
          <Mat color={METAL} selected={s} />
        </mesh>
        <mesh position={[0, 0.38, 0.03]} rotation={[-0.5, 0, 0]} castShadow>
          <coneGeometry args={[0.06, 0.09, 18, 1, true]} />
          <meshStandardMaterial color={FRAME} roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </>
  );
}

/** 컴퓨터 책상: 금속 프레임 다리 + 상판 + 모니터 받침대 + 모니터·키보드·마우스 + 본체 */
function ComputerDesk({ w, d, h, color, dark, s }: P) {
  const top = Math.min(0.025, h * 0.05);
  const y1 = h - top;
  const leg = 0.04;
  const lx = w / 2 - 0.05 - leg / 2;
  const lz = d / 2 - 0.05 - leg / 2;
  // 모니터 받침대: 뒤쪽에 놓인 낮은 선반
  const riserW = Math.min(0.9, w * 0.65);
  const riserD = Math.min(0.22, d * 0.35);
  const riserH = 0.1;
  const riserT = 0.018;
  const riserZ = -d / 2 + 0.02 + riserD / 2;
  const monW = Math.min(0.62, riserW * 0.8);
  const kbZ = Math.max(riserZ + riserD / 2 + 0.1, d / 2 - 0.17);
  const towerW = 0.2;
  const towerH = Math.min(0.45, y1 - 0.08);
  const towerD = Math.min(0.42, d - 0.12);
  return (
    <>
      <Box size={[w, top, d]} position={[0, h - top / 2, 0]} color={color} selected={s} />
      {/* 양쪽 ㄷ자 금속 프레임: 다리 둘 + 위 가로대 + 바닥 발 */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * lx, 0, 0]}>
          {[-1, 1].map((sz) => (
            <Box
              key={sz}
              size={[leg, y1, leg]}
              position={[0, y1 / 2, sz * lz]}
              color={FRAME}
              selected={s}
              edges={false}
            />
          ))}
          <Box
            size={[leg, 0.03, lz * 2]}
            position={[0, y1 - 0.015, 0]}
            color={FRAME}
            selected={s}
            edges={false}
          />
          <Box
            size={[leg + 0.01, 0.02, lz * 2 + leg + 0.02]}
            position={[0, 0.01, 0]}
            color={FRAME}
            selected={s}
            edges={false}
          />
        </group>
      ))}
      {/* 뒤쪽 금속 가로대 */}
      <Box
        size={[lx * 2, 0.05, 0.02]}
        position={[0, y1 - 0.06, -lz]}
        color={FRAME}
        selected={s}
        edges={false}
      />
      {/* 모니터 받침대 */}
      <Box
        size={[riserW, riserT, riserD]}
        position={[0, h + riserH - riserT / 2, riserZ]}
        color={color}
        selected={s}
      />
      {[-1, 1].map((sx) => (
        <Box
          key={sx}
          size={[riserT, riserH - riserT, riserD]}
          position={[sx * (riserW / 2 - riserT / 2), h + (riserH - riserT) / 2, riserZ]}
          color={dark}
          selected={s}
          edges={false}
        />
      ))}
      <Monitor x={0} y={h + riserH} z={riserZ} sw={monW} s={s} />
      <KeyboardMouse x={-0.05} y={h} z={kbZ} s={s} />
      {/* 책상 아래 본체 */}
      <Box
        size={[towerW, towerH, towerD]}
        position={[lx - leg / 2 - 0.03 - towerW / 2, 0.02 + towerH / 2, -d / 2 + 0.06 + towerD / 2]}
        color="#27272a"
        selected={s}
      />
      <Box
        size={[0.012, 0.012, 0.002]}
        position={[lx - leg / 2 - 0.03 - towerW / 2, 0.02 + towerH - 0.04, -d / 2 + 0.061 + towerD]}
        color="#60a5fa"
        edges={false}
      />
    </>
  );
}

/** ㄱ자 책상: ㄱ자 상판 + 바깥 모서리·안쪽 모서리 다리 + 뒤·옆 가림판, 긴 팔에 모니터 */
function LDesk({ w, d, h, color, dark, s }: P) {
  const top = Math.min(0.03, h * 0.05);
  const y1 = h - top;
  const local = lShapeLocal(w * 1000, d * 1000).map((p) => ({ x: p.x / 1000, z: p.y / 1000 }));
  // 0: 뒤 왼쪽, 1: 뒤 오른쪽, 2: 뒤팔 앞 끝, 3: 안쪽 모서리, 4: 옆팔 앞 끝, 5: 앞 왼쪽
  const a = local[2].z - local[0].z;
  const shape = useMemo(
    () =>
      new THREE.Shape(
        lShapeLocal(w * 1000, d * 1000).map((p) => new THREE.Vector2(p.x / 1000, -p.y / 1000)),
      ),
    [w, d],
  );
  const leg = 0.045;
  const inn = 0.03 + leg / 2;
  const x0 = -w / 2;
  const z0 = -d / 2;
  const legs: [number, number][] = [
    [x0 + inn, z0 + inn],
    [w / 2 - inn, z0 + inn],
    [w / 2 - inn, z0 + a - inn],
    [x0 + a - inn, z0 + a - inn],
    [x0 + a - inn, d / 2 - inn],
    [x0 + inn, d / 2 - inn],
  ];
  const panelH = Math.min(0.35, y1 * 0.5);
  const pz = z0 + 0.04;
  const px = x0 + 0.04;
  // 모니터는 뒤팔(가로로 긴 팔) 가운데, 꺾인 부분 오른쪽
  const monX = (x0 + a + w / 2) / 2;
  const monW = Math.min(0.62, (w - a) * 0.75);
  const kbZ = Math.max(z0 + 0.32, z0 + a - 0.13);
  return (
    <>
      <mesh position={[0, y1, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[shape, { depth: top, bevelEnabled: false }]} />
        <Mat color={color} selected={s} />
        <Edges color={EDGE} threshold={20} />
      </mesh>
      {legs.map(([x, z], i) => (
        <Box
          key={i}
          size={[leg, y1, leg]}
          position={[x, y1 / 2, z]}
          color={dark}
          selected={s}
          edges={false}
        />
      ))}
      {/* 뒤 가림판 + 옆 가림판 */}
      <Box
        size={[w - inn * 2 - leg, panelH, 0.016]}
        position={[0, y1 - panelH / 2, pz]}
        color={shade(color, -0.04)}
        selected={s}
      />
      <Box
        size={[0.016, panelH, d - inn * 2 - leg]}
        position={[px, y1 - panelH / 2, 0]}
        color={shade(color, -0.04)}
        selected={s}
      />
      <Monitor x={monX} y={h} z={z0 + 0.13} sw={monW} s={s} />
      <KeyboardMouse x={monX - 0.04} y={h} z={kbZ} s={s} />
      {/* 옆팔 위: 책 몇 권과 머그컵 */}
      {[0, 1, 2].map((i) => (
        <Box
          key={`b${i}`}
          size={[0.17, 0.025, 0.24]}
          position={[x0 + a / 2, h + 0.0125 + i * 0.025, d / 2 - 0.25 - i * 0.008]}
          color={PALETTE[(i * 4 + 2) % PALETTE.length]}
          edges={false}
        />
      ))}
      <mesh position={[x0 + a / 2, h + 0.045, d / 2 - 0.5]} castShadow>
        <cylinderGeometry args={[0.04, 0.036, 0.09, 16]} />
        <Mat color="#e5e7eb" />
      </mesh>
    </>
  );
}

export const TABLE_MODELS: Record<string, Model3D> = {
  "dining-4": (p) => <Dining {...p} wide={false} />,
  "dining-6": (p) => <Dining {...p} wide />,
  "table-round": RoundTable,
  table: SmallTable,
  "coffee-table": CoffeeTable,
  "side-table": SideTable,
  desk: Desk,
  "computer-desk": ComputerDesk,
  "l-desk": LDesk,
};
