"use client";

import {
  Box,
  FT,
  GAP,
  METAL,
  Mat,
  type Model3D,
  type ModelProps as P,
  Panel,
  grid,
  pairHandle,
  shade,
} from "./parts";

/**
 * 가전 3D 모양. 치수는 m, 가구 중심이 원점이고 바닥이 y=0.
 * 뒤(벽 쪽)가 -z, 앞(문·조작부 쪽)이 +z.
 */

const SCREEN = "#0b0f14";
const CHROME = "#d4d4d8";
const LED = "#22d3ee";
const RUBBER = "#27272a";

/** 반짝이는 재질 (화면·유리·크롬). 선택되면 파랗게 빛남 */
function Shiny({
  color,
  selected,
  rough = 0.12,
  metal = 0.4,
  opacity,
}: {
  color: string;
  selected?: boolean;
  rough?: number;
  metal?: number;
  opacity?: number;
}) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={rough}
      metalness={metal}
      emissive={selected ? "#2563eb" : "#000000"}
      emissiveIntensity={selected ? 0.25 : 0}
      transparent={opacity !== undefined}
      opacity={opacity ?? 1}
    />
  );
}

/** 반짝이는 상자 (테두리 선 없음) */
function GBox({
  size,
  position,
  color = SCREEN,
  s,
  rough,
  metal,
  opacity,
}: {
  size: [number, number, number];
  position: [number, number, number];
  color?: string;
  s?: boolean;
  rough?: number;
  metal?: number;
  opacity?: number;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <Shiny color={color} selected={s} rough={rough} metal={metal} opacity={opacity} />
    </mesh>
  );
}

/** 원기둥. face가 true면 축을 z로 눕혀 앞(+z)을 보게 */
function Cyl({
  r,
  len,
  position,
  color,
  s,
  face = false,
  rotation,
  shiny = false,
  opacity,
  seg = 28,
}: {
  r: number;
  len: number;
  position: [number, number, number];
  color: string;
  s?: boolean;
  face?: boolean;
  rotation?: [number, number, number];
  shiny?: boolean;
  opacity?: number;
  seg?: number;
}) {
  return (
    <mesh
      position={position}
      rotation={rotation ?? (face ? [Math.PI / 2, 0, 0] : [0, 0, 0])}
      castShadow
      receiveShadow
    >
      <cylinderGeometry args={[r, r, len, seg]} />
      {shiny ? (
        <Shiny color={color} selected={s} opacity={opacity} />
      ) : (
        <Mat color={color} selected={s} opacity={opacity} />
      )}
    </mesh>
  );
}

/** 고리. flat이면 바닥에 눕히고, 아니면 앞(+z)을 봄 */
function Ring({
  r,
  tube,
  position,
  color,
  s,
  flat = false,
  shiny = false,
}: {
  r: number;
  tube: number;
  position: [number, number, number];
  color: string;
  s?: boolean;
  flat?: boolean;
  shiny?: boolean;
}) {
  return (
    <mesh position={position} rotation={flat ? [-Math.PI / 2, 0, 0] : [0, 0, 0]} castShadow>
      <torusGeometry args={[r, tube, 12, 40]} />
      {shiny ? (
        <Shiny color={color} selected={s} metal={0.8} />
      ) : (
        <Mat color={color} selected={s} />
      )}
    </mesh>
  );
}

/** 바닥 네 귀퉁이의 작은 조절발 */
function Feet({ w, d, h, inset = 0.06 }: { w: number; d: number; h: number; inset?: number }) {
  return (
    <>
      {[
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([sx, sz], i) => (
        <Cyl
          key={i}
          r={0.02}
          len={h}
          position={[sx * (w / 2 - inset), h / 2, sz * (d / 2 - inset)]}
          color={RUBBER}
          seg={12}
        />
      ))}
    </>
  );
}

/** 냉장고 손잡이: 받침 둘 + 앞으로 떠 있는 막대. z는 문 앞면 */
function BarHandle({
  x,
  y,
  len,
  z,
  s,
  horizontal = false,
}: {
  x: number;
  y: number;
  len: number;
  z: number;
  s: boolean;
  horizontal?: boolean;
}) {
  const off = len / 2 - 0.02;
  const posts: [number, number][] = horizontal
    ? [
        [x - off, y],
        [x + off, y],
      ]
    : [
        [x, y - off],
        [x, y + off],
      ];
  return (
    <>
      {posts.map(([px, py], i) => (
        <Box
          key={i}
          size={[0.016, 0.016, 0.016]}
          position={[px, py, z + 0.008]}
          color={METAL}
          edges={false}
        />
      ))}
      <Box
        size={horizontal ? [len, 0.02, 0.012] : [0.02, len, 0.012]}
        position={[x, y, z + 0.022]}
        color={METAL}
        selected={s}
        edges={false}
      />
    </>
  );
}

/** 싱크대: 걸레받이 + 하부장 문·서랍 + 상판 + 개수대·수전 + 쿡탑 */
function Sink({ w, d, h, color, dark, s }: P) {
  const plinth = Math.min(0.1, h * 0.12);
  const top = Math.min(0.03, h * 0.04);
  const over = Math.min(0.02, d * 0.04);
  const y1 = h - top;
  const cd = d - over - FT;
  const z = -d / 2 + cd;
  const cols = Math.max(2, Math.round(w / 0.45));
  const colW = w / cols;
  const split = w / 2 - colW;
  const doors = grid(-w / 2, split, plinth, y1, cols - 1, 1);
  const drawers = grid(split, w / 2, plinth, y1, 1, 3);
  // 개수대: 문 쪽 가운데
  const bx = (-w / 2 + split) / 2;
  const bw = Math.min(0.8, (split + w / 2) * 0.7);
  const bd = Math.min(0.45, d * 0.65);
  const bz = Math.min(0.03, d * 0.05);
  const fz = Math.max(-d / 2 + 0.035, bz - bd / 2 - 0.04);
  const steel = "#c7c7cc";
  // 쿡탑: 서랍 칸 위
  const cx = split + colW / 2;
  const cw = Math.min(0.6, colW - 0.06);
  const ckd = Math.min(0.52, d - 0.08);
  const big = Math.min(0.1, cw * 0.18, ckd * 0.2);
  const burners: [number, number, number][] =
    cw >= 0.5
      ? [
          [-cw * 0.25, -ckd * 0.22, big * 0.8],
          [-cw * 0.25, ckd * 0.22, big * 0.8],
          [cw * 0.22, 0, big],
        ]
      : [
          [0, -ckd * 0.22, big * 0.85],
          [0, ckd * 0.2, big],
        ];
  return (
    <>
      {/* 걸레받이: 앞이 안쪽으로 들어감 */}
      <Box
        size={[w, plinth, cd - 0.05]}
        position={[0, plinth / 2, -d / 2 + (cd - 0.05) / 2]}
        color={dark}
        edges={false}
      />
      {/* 하부장 몸통 */}
      <Box
        size={[w, y1 - plinth, cd]}
        position={[0, plinth + (y1 - plinth) / 2, -d / 2 + cd / 2]}
        color={color}
        selected={s}
      />
      {doors.map((f, i) => (
        <Panel
          key={`d${i}`}
          f={f}
          z={z}
          color={shade(color, 0.03)}
          s={s}
          handle={cols - 1 === 1 ? "h" : pairHandle(i, cols - 1)}
        />
      ))}
      {drawers.map((f, i) => (
        <Panel key={`r${i}`} f={f} z={z} color={shade(color, 0.03)} s={s} handle="h" />
      ))}
      {/* 상판: 앞으로 살짝 나옴 */}
      <Box size={[w, top, d]} position={[0, h - top / 2, 0]} color={dark} selected={s} />
      {/* 개수대: 스텐 테두리 + 움푹한 안쪽 + 배수구 */}
      <GBox
        size={[bw + 0.03, 0.004, bd + 0.03]}
        position={[bx, h + 0.002, bz]}
        color={steel}
        s={s}
        rough={0.3}
        metal={0.7}
      />
      <GBox
        size={[bw, 0.005, bd]}
        position={[bx, h + 0.0025, bz]}
        color="#52525b"
        s={s}
        rough={0.35}
        metal={0.6}
      />
      <Cyl r={0.032} len={0.002} position={[bx, h + 0.0055, bz]} color={RUBBER} />
      {/* 수전: 받침·기둥·꺾인 토출구·레버 */}
      <Cyl r={0.025} len={0.04} position={[bx, h + 0.02, fz]} color={CHROME} s={s} shiny />
      <Cyl r={0.013} len={0.24} position={[bx, h + 0.16, fz]} color={CHROME} s={s} shiny />
      <Cyl
        r={0.012}
        len={0.17}
        position={[bx, h + 0.28, fz + 0.085]}
        color={CHROME}
        s={s}
        face
        shiny
      />
      <Cyl r={0.012} len={0.04} position={[bx, h + 0.26, fz + 0.165]} color={CHROME} shiny />
      <Box
        size={[0.012, 0.012, 0.08]}
        position={[bx + 0.035, h + 0.08, fz + 0.03]}
        color={CHROME}
        edges={false}
      />
      {/* 쿡탑: 검은 유리판 + 화구 고리 + 조작부 */}
      <group position={[cx, h, 0]}>
        <GBox size={[cw, 0.006, ckd]} position={[0, 0.003, 0]} color={SCREEN} s={s} />
        {burners.map(([x, bzz, r], i) => (
          <group key={i}>
            <Ring r={r} tube={0.003} position={[x, 0.0065, bzz]} color="#71717a" flat />
            <Ring r={r * 0.55} tube={0.0025} position={[x, 0.0065, bzz]} color="#71717a" flat />
          </group>
        ))}
        {[-2, -1, 0, 1, 2].map((k) => (
          <Box
            key={k}
            size={[0.014, 0.001, 0.014]}
            position={[k * 0.035, 0.0065, ckd / 2 - 0.03]}
            color="#e5e7eb"
            edges={false}
          />
        ))}
      </group>
    </>
  );
}

/** 냉장고류 몸통: 문 두께와 손잡이 자리(3cm)만큼 뒤로 물린 상자 + 아래 통풍 그릴 */
function FridgeShell({
  w,
  d,
  h,
  color,
  dark,
  s,
  doorT,
  kick,
}: P & { doorT: number; kick: number }) {
  const bd = d - 0.03 - doorT;
  const zb = -d / 2 + bd;
  return (
    <>
      <Box size={[w, h, bd]} position={[0, h / 2, -d / 2 + bd / 2]} color={color} selected={s} />
      <Box
        size={[w - 0.02, kick - 0.01, 0.01]}
        position={[0, kick / 2, zb + 0.005]}
        color={dark}
        edges={false}
      />
      {[0.3, 0.6].map((t) => (
        <Box
          key={t}
          size={[w - 0.08, 0.004, 0.003]}
          position={[0, kick * t, zb + 0.011]}
          color={RUBBER}
          edges={false}
        />
      ))}
    </>
  );
}

/** 양문형 냉장고: 세로로 나뉜 두 문 + 가운데 긴 손잡이 + 디스펜서 */
function Fridge({ w, d, h, color, dark, s }: P) {
  const doorT = 0.06;
  const zf = d / 2 - 0.03; // 문 앞면 (손잡이 자리 3cm)
  const kick = Math.min(0.08, h * 0.05);
  const y0 = kick;
  const y1 = h - 0.005;
  const dh = y1 - y0;
  const dw = w / 2 - GAP;
  const handleLen = Math.min(1.0, dh * 0.55);
  const handleY = Math.min(y0 + dh * 0.58, y1 - handleLen / 2 - 0.05);
  // 디스펜서 (왼쪽 문)
  const dispW = Math.min(0.2, dw * 0.5);
  const dispH = Math.min(0.32, dh * 0.2);
  const dispY = Math.min(1.15, y0 + dh * 0.62);
  const dispX = -w / 4 - Math.min(0.03, dw * 0.08);
  return (
    <>
      <FridgeShell w={w} d={d} h={h} color={color} dark={dark} s={s} doorT={doorT} kick={kick} />
      {/* 두 문 */}
      {[-1, 1].map((sx) => (
        <Box
          key={sx}
          size={[dw, dh, doorT]}
          position={[(sx * w) / 4, y0 + dh / 2, zf - doorT / 2]}
          color={shade(color, 0.03)}
          selected={s}
        />
      ))}
      {/* 가운데 틈 */}
      <Box
        size={[GAP * 1.5, dh, doorT * 0.9]}
        position={[0, y0 + dh / 2, zf - doorT / 2]}
        color={RUBBER}
        edges={false}
      />
      {/* 세로 손잡이: 가운데 가까이 */}
      {[-1, 1].map((sx) => (
        <BarHandle key={sx} x={sx * 0.04} y={handleY} len={handleLen} z={zf} s={s} />
      ))}
      {/* 디스펜서: 움푹한 검은 판 + 표시창 + 출수구 + 물받이 */}
      <GBox size={[dispW, dispH, 0.004]} position={[dispX, dispY, zf + 0.002]} s={s} />
      <GBox
        size={[dispW * 0.7, 0.03, 0.002]}
        position={[dispX, dispY + dispH / 2 - 0.035, zf + 0.005]}
        color="#1e3a5f"
        rough={0.2}
      />
      {[-1, 0, 1].map((k) => (
        <Box
          key={k}
          size={[0.012, 0.006, 0.002]}
          position={[dispX + k * 0.03, dispY + dispH / 2 - 0.035, zf + 0.0065]}
          color={LED}
          edges={false}
        />
      ))}
      <Box
        size={[0.03, 0.025, 0.02]}
        position={[dispX, dispY + dispH * 0.05, zf + 0.012]}
        color="#3f3f46"
        edges={false}
      />
      <Box
        size={[dispW * 0.8, 0.012, 0.025]}
        position={[dispX, dispY - dispH / 2 + 0.012, zf + 0.0125]}
        color="#3f3f46"
        edges={false}
      />
    </>
  );
}

/** 일반 냉장고: 위 냉동실 문 + 아래 냉장실 문 (위아래 두 칸) */
function Fridge1Door({ w, d, h, color, dark, s }: P) {
  const doorT = 0.05;
  const zf = d / 2 - 0.03;
  const kick = Math.min(0.06, h * 0.04);
  const y1 = h - 0.005;
  const split = kick + (y1 - kick) * 0.68;
  const fronts = [
    { y0: kick, y1: split - GAP / 2 },
    { y0: split + GAP / 2, y1 },
  ];
  const hx = w / 2 - 0.05;
  const lowLen = Math.min(0.35, (split - kick) * 0.3);
  const upLen = Math.min(0.2, (y1 - split) * 0.4);
  return (
    <>
      <FridgeShell w={w} d={d} h={h} color={color} dark={dark} s={s} doorT={doorT} kick={kick} />
      {fronts.map((f, i) => (
        <Box
          key={i}
          size={[w, f.y1 - f.y0, doorT]}
          position={[0, (f.y0 + f.y1) / 2, zf - doorT / 2]}
          color={shade(color, 0.03)}
          selected={s}
        />
      ))}
      {/* 문 사이 틈 */}
      <Box
        size={[w - 0.004, GAP * 1.5, doorT * 0.9]}
        position={[0, split, zf - doorT / 2]}
        color={RUBBER}
        edges={false}
      />
      {/* 손잡이: 냉장실은 위쪽, 냉동실은 아래쪽 (틈 가까이) */}
      <BarHandle x={hx} y={split - 0.04 - lowLen / 2} len={lowLen} z={zf} s={s} />
      <BarHandle x={hx} y={split + 0.04 + upLen / 2} len={upLen} z={zf} s={s} />
    </>
  );
}

/** 스탠드형 김치냉장고: 위 문 하나 + 아래 서랍 세 칸 */
function KimchiFridge({ w, d, h, color, dark, s }: P) {
  const doorT = 0.05;
  const zf = d / 2 - 0.03;
  const kick = Math.min(0.07, h * 0.045);
  const y1 = h - 0.005;
  const split = kick + (y1 - kick) * 0.55;
  const rows = 3;
  const rowH = (split - kick) / rows;
  const fronts = [
    ...Array.from({ length: rows }, (_, i) => ({
      y0: kick + rowH * i + GAP / 2,
      y1: kick + rowH * (i + 1) - GAP / 2,
    })),
    { y0: split + GAP / 2, y1 },
  ];
  const hLen = Math.min(0.5, w * 0.6);
  return (
    <>
      <FridgeShell w={w} d={d} h={h} color={color} dark={dark} s={s} doorT={doorT} kick={kick} />
      {fronts.map((f, i) => (
        <group key={i}>
          <Box
            size={[w, f.y1 - f.y0, doorT]}
            position={[0, (f.y0 + f.y1) / 2, zf - doorT / 2]}
            color={shade(color, 0.03)}
            selected={s}
          />
          <Box
            size={[w - 0.004, GAP, doorT * 0.9]}
            position={[0, f.y0 - GAP / 2, zf - doorT / 2]}
            color={RUBBER}
            edges={false}
          />
          {/* 가로 손잡이: 서랍은 위쪽, 위 문은 아래쪽 */}
          <BarHandle
            x={0}
            y={i < rows ? f.y1 - 0.04 : f.y0 + 0.06}
            len={hLen}
            z={zf}
            s={s}
            horizontal
          />
        </group>
      ))}
      {/* 위 문 표시창 */}
      <GBox
        size={[Math.min(0.16, w * 0.25), 0.04, 0.003]}
        position={[0, Math.min(y1 - 0.12, split + 0.25), zf + 0.0015]}
        s={s}
      />
      {[-1, 0, 1].map((k) => (
        <Box
          key={k}
          size={[0.012, 0.008, 0.002]}
          position={[k * 0.03, Math.min(y1 - 0.12, split + 0.25), zf + 0.0035]}
          color={LED}
          edges={false}
        />
      ))}
    </>
  );
}

/** 드럼 세탁기: 위 조작부(세제 서랍·표시창·다이얼) + 크롬 테 둥근 유리문 */
function Washer({ w, d, h, color, s }: P) {
  const foot = 0.02;
  const protr = 0.05;
  const zf = d / 2 - protr;
  const cp = Math.min(0.14, h * 0.15);
  const cy = h - cp / 2;
  const panel = shade(color, -0.03);
  const drawW = Math.min(0.22, w * 0.32);
  const dialR = Math.min(0.04, cp * 0.3);
  const R = Math.min(w * 0.32, (h - cp - foot) * 0.38);
  const doorY = foot + (h - cp - foot) * 0.5 + 0.01;
  return (
    <>
      <Feet w={w} d={d - protr} h={foot} />
      <Box
        size={[w, h - foot, d - protr]}
        position={[0, foot + (h - foot) / 2, -protr / 2]}
        color={color}
        selected={s}
      />
      {/* 조작부 띠 */}
      <Box
        size={[w - 0.01, cp - 0.012, 0.008]}
        position={[0, cy, zf + 0.004]}
        color={panel}
        selected={s}
      />
      {/* 세제 서랍 + 손잡이 홈 */}
      <Box
        size={[drawW, cp * 0.6, 0.012]}
        position={[-w / 2 + drawW / 2 + 0.03, cy, zf + 0.014]}
        color={color}
        selected={s}
      />
      <Box
        size={[drawW * 0.5, 0.008, 0.002]}
        position={[-w / 2 + drawW / 2 + 0.03, cy - cp * 0.3 + 0.01, zf + 0.021]}
        color={RUBBER}
        edges={false}
      />
      {/* 표시창 + 버튼 */}
      <GBox
        size={[Math.min(0.12, w * 0.18), cp * 0.38, 0.003]}
        position={[w * 0.06, cy + 0.008, zf + 0.0095]}
        s={s}
      />
      {[-1, 0, 1].map((k) => (
        <Box
          key={k}
          size={[0.012, 0.012, 0.002]}
          position={[w * 0.06 + k * 0.025, cy + 0.01, zf + 0.0115]}
          color={LED}
          edges={false}
        />
      ))}
      {[-1.5, -0.5, 0.5, 1.5].map((k) => (
        <Box
          key={`b${k}`}
          size={[0.018, 0.01, 0.004]}
          position={[w * 0.06 + k * 0.03, cy - cp * 0.3, zf + 0.01]}
          color={shade(color, -0.12)}
          edges={false}
        />
      ))}
      {/* 다이얼 */}
      <Cyl
        r={dialR}
        len={0.022}
        position={[w / 2 - 0.09, cy, zf + 0.019]}
        color={CHROME}
        s={s}
        face
        shiny
      />
      <Box
        size={[0.004, dialR * 0.8, 0.002]}
        position={[w / 2 - 0.09, cy + dialR * 0.45, zf + 0.031]}
        color={RUBBER}
        edges={false}
      />
      {/* 문: 받침 원판 + 크롬 테 + 유리 + 안쪽 드럼 */}
      <group position={[0, doorY, zf]}>
        <Cyl
          r={R + 0.03}
          len={0.024}
          position={[0, 0, 0.012]}
          color={shade(color, 0.02)}
          face
          s={s}
        />
        <Cyl r={R - 0.01} len={0.002} position={[0, 0, 0.025]} color="#3f3f46" face />
        <Cyl r={R * 0.55} len={0.002} position={[0, 0, 0.026]} color="#71717a" face />
        <Cyl
          r={R - 0.012}
          len={0.012}
          position={[0, 0, 0.032]}
          color="#94a3b8"
          face
          shiny
          opacity={0.45}
          s={s}
        />
        <Ring r={R} tube={0.016} position={[0, 0, 0.032]} color={CHROME} s={s} shiny />
        {/* 문 손잡이 */}
        <Box
          size={[0.016, Math.min(0.09, R * 0.45), 0.014]}
          position={[R + 0.012, 0, 0.031]}
          color={shade(color, -0.12)}
          edges={false}
        />
      </group>
      {/* 아래 배수 필터 덮개 */}
      <Box
        size={[Math.min(0.12, w * 0.18), 0.06, 0.004]}
        position={[-w / 2 + 0.1, foot + 0.06, zf + 0.002]}
        color={shade(color, -0.05)}
        edges={false}
      />
    </>
  );
}

/** 건조기: 검은 유리 조작부 + 물통 서랍 + 짙은 테의 큰 문 + 아래 필터 통풍구 */
function Dryer({ w, d, h, color, dark, s }: P) {
  const foot = 0.02;
  const protr = 0.05;
  const zf = d / 2 - protr;
  const cp = Math.min(0.12, h * 0.13);
  const cy = h - cp / 2;
  const tankH = Math.min(0.07, h * 0.08);
  const tankY = h - cp - 0.01 - tankH / 2;
  const tankW = Math.min(0.26, w * 0.38);
  const ventH = Math.min(0.09, h * 0.1);
  const ventY = foot + 0.03 + ventH / 2;
  const top = tankY - tankH / 2 - 0.02;
  const bottom = ventY + ventH / 2 + 0.02;
  const R = Math.min(w * 0.36, (top - bottom) * 0.46);
  const doorY = (top + bottom) / 2;
  const rim = "#3f3f46";
  return (
    <>
      <Feet w={w} d={d - protr} h={foot} />
      <Box
        size={[w, h - foot, d - protr]}
        position={[0, foot + (h - foot) / 2, -protr / 2]}
        color={color}
        selected={s}
      />
      {/* 조작부: 전체 폭 검은 유리 띠 + 터치 표시 + 둥근 전원 버튼 */}
      <GBox size={[w - 0.02, cp - 0.015, 0.006]} position={[0, cy, zf + 0.003]} s={s} />
      <GBox
        size={[Math.min(0.14, w * 0.2), cp * 0.4, 0.002]}
        position={[0, cy, zf + 0.007]}
        color="#1e293b"
        rough={0.2}
      />
      {[-1, 0, 1].map((k) => (
        <Box
          key={k}
          size={[0.014, 0.014, 0.001]}
          position={[k * 0.028, cy, zf + 0.0085]}
          color={LED}
          edges={false}
        />
      ))}
      {[-3, -2, 2, 3].map((k) => (
        <Box
          key={`t${k}`}
          size={[0.008, 0.008, 0.001]}
          position={[k * 0.045, cy - cp * 0.15, zf + 0.0065]}
          color="#e5e7eb"
          edges={false}
        />
      ))}
      <Ring r={0.015} tube={0.003} position={[w / 2 - 0.06, cy, zf + 0.007]} color="#e5e7eb" />
      {/* 물통 서랍 (왼쪽 위) */}
      <Box
        size={[tankW, tankH, 0.014]}
        position={[-w / 2 + tankW / 2 + 0.03, tankY, zf + 0.007]}
        color={shade(color, 0.02)}
        selected={s}
      />
      <Box
        size={[tankW * 0.4, 0.01, 0.002]}
        position={[-w / 2 + tankW / 2 + 0.03, tankY - tankH / 2 + 0.012, zf + 0.0145]}
        color={RUBBER}
        edges={false}
      />
      {/* 문: 짙은 두꺼운 테 + 연기빛 유리 + 안쪽 얇은 금속 선 */}
      <group position={[0, doorY, zf]}>
        <Cyl r={R + 0.025} len={0.026} position={[0, 0, 0.013]} color={rim} face s={s} />
        <Cyl r={R - 0.02} len={0.002} position={[0, 0, 0.027]} color={RUBBER} face />
        <Cyl
          r={R - 0.02}
          len={0.014}
          position={[0, 0, 0.034]}
          color="#1f2937"
          face
          shiny
          opacity={0.85}
          s={s}
        />
        <Ring r={R - 0.005} tube={0.012} position={[0, 0, 0.034]} color={rim} s={s} />
        <Ring r={R - 0.022} tube={0.003} position={[0, 0, 0.042]} color={CHROME} shiny />
      </group>
      {/* 아래 필터 덮개 + 통풍 틈 */}
      <Box
        size={[w * 0.7, ventH, 0.006]}
        position={[0, ventY, zf + 0.003]}
        color={shade(color, -0.04)}
        selected={s}
      />
      {Array.from({ length: 5 }, (_, k) => (
        <Box
          key={`v${k}`}
          size={[w * 0.6, 0.005, 0.002]}
          position={[0, ventY - ventH / 2 + (ventH / 6) * (k + 1), zf + 0.0065]}
          color={dark}
          edges={false}
        />
      ))}
    </>
  );
}

/** 스타일러: 좁고 높은 몸통 + 전체 높이 거울 문 + 위 얇은 조작 띠 */
function Styler({ w, d, h, color, dark, s }: P) {
  const base = Math.min(0.04, h * 0.03);
  const doorT = 0.025;
  const zf = d / 2 - 0.003;
  const y0 = base + 0.005;
  const y1 = h - 0.008;
  const stripY = y1 - Math.min(0.12, h * 0.07);
  return (
    <>
      <Box
        size={[w - 0.02, base, d - 0.04]}
        position={[0, base / 2, -0.02]}
        color={dark}
        edges={false}
      />
      <Box
        size={[w, h - base, d - 0.003 - doorT]}
        position={[0, base + (h - base) / 2, -(doorT + 0.003) / 2]}
        color={color}
        selected={s}
      />
      {/* 거울 문 */}
      <GBox
        size={[w - 0.008, y1 - y0, doorT]}
        position={[0, (y0 + y1) / 2, zf - doorT / 2]}
        color="#1c1917"
        rough={0.08}
        metal={0.6}
        s={s}
      />
      {/* 조작 띠: 가는 선 + 하얀 점 표시 */}
      <Box
        size={[w * 0.6, 0.004, 0.001]}
        position={[0, stripY, zf + 0.0005]}
        color="#57534e"
        edges={false}
      />
      {[-2, -1, 0, 1, 2].map((k) => (
        <Box
          key={k}
          size={[0.008, 0.008, 0.001]}
          position={[k * 0.03, stripY + 0.018, zf + 0.0005]}
          color={k === 0 ? LED : "#e7e5e4"}
          edges={false}
        />
      ))}
      {/* 오른쪽 세로 손잡이 홈 */}
      <Box
        size={[0.008, Math.min(0.4, h * 0.22), 0.002]}
        position={[w / 2 - 0.03, Math.min(1.1, h * 0.6), zf + 0.001]}
        color="#57534e"
        edges={false}
      />
    </>
  );
}

/** TV: 얇은 테 + 반짝이는 화면 + 뒤 전자부 + 받침(넓으면 양끝 발, 좁으면 가운데) */
function TV({ w, d, h, color, s }: P) {
  const standH = Math.min(0.07, h * 0.09);
  const panelT = Math.min(0.025, d * 0.35);
  const panelZ = d / 2 - 0.004 - panelT / 2;
  const ph = h - standH;
  const bezel = Math.min(0.01, w * 0.01);
  const chin = Math.min(0.018, ph * 0.03);
  const backT = Math.max(0.005, d - panelT - 0.012);
  const twoFeet = w >= 0.9;
  const footX = w / 2 - Math.min(0.15, w * 0.12);
  return (
    <>
      {/* 패널 + 아래 턱 */}
      <Box
        size={[w, ph, panelT]}
        position={[0, standH + ph / 2, panelZ]}
        color={color}
        selected={s}
      />
      <Box
        size={[w, chin, panelT + 0.003]}
        position={[0, standH + chin / 2, panelZ + 0.0015]}
        color={color}
        selected={s}
        edges={false}
      />
      <Box
        size={[0.03, 0.004, 0.002]}
        position={[0, standH + chin / 2, d / 2 - 0.0015]}
        color={METAL}
        edges={false}
      />
      {/* 화면 */}
      <GBox
        size={[w - bezel * 2, ph - bezel - chin, 0.002]}
        position={[0, standH + chin + (ph - bezel - chin) / 2, panelZ + panelT / 2 + 0.001]}
        color={SCREEN}
        rough={0.06}
        metal={0.5}
        s={s}
      />
      {/* 뒤 전자부 */}
      <Box
        size={[w * 0.6, ph * 0.55, backT]}
        position={[0, standH + ph * 0.4, panelZ - panelT / 2 - backT / 2]}
        color={shade(color, -0.05)}
        edges={false}
      />
      {/* 받침 */}
      {twoFeet ? (
        [-1, 1].map((sx) => (
          <group key={sx} position={[sx * footX, 0, 0]}>
            <Box
              size={[0.06, 0.008, d]}
              position={[0, 0.004, 0]}
              color={shade(color, -0.08)}
              selected={s}
              edges={false}
            />
            <Box
              size={[0.02, standH, 0.015]}
              position={[0, standH / 2, panelZ]}
              color={shade(color, -0.08)}
              selected={s}
              edges={false}
            />
          </group>
        ))
      ) : (
        <>
          <Box
            size={[Math.min(0.35, w * 0.4), 0.01, d]}
            position={[0, 0.005, 0]}
            color={shade(color, -0.08)}
            selected={s}
            edges={false}
          />
          <Box
            size={[0.07, standH, 0.02]}
            position={[0, standH / 2, panelZ - panelT / 2]}
            color={shade(color, -0.08)}
            selected={s}
            edges={false}
          />
        </>
      )}
    </>
  );
}

/** 스탠드 에어컨: 앞 모서리가 둥근 몸통 + 위 바람 나오는 날개 + 표시창 + 받침 */
function Aircon({ w, d, h, color, dark, s }: P) {
  const base = Math.min(0.07, h * 0.05);
  const rr = Math.min(0.06, w * 0.15, d * 0.3);
  const bh = h - base;
  const by = base + bh / 2;
  const outH = Math.min(0.4, h * 0.22);
  const outY = h - 0.06 - outH / 2;
  const fw = w - rr * 2;
  const zf = d / 2 - 0.025; // 몸통 앞면 (날개 자리만큼 안쪽)
  const bd = d - 0.025;
  const slats = Math.max(4, Math.round(outH / 0.045));
  const dispY = Math.min(h * 0.58, outY - outH / 2 - 0.12);
  return (
    <>
      <Box
        size={[w - 0.02, base, d - 0.02]}
        position={[0, base / 2, 0]}
        color={dark}
        edges={false}
      />
      {/* 몸통: 뒤 상자 + 앞 가운데 상자 + 양 앞 모서리 원기둥 */}
      <Box
        size={[w, bh, bd - rr]}
        position={[0, by, -d / 2 + (bd - rr) / 2]}
        color={color}
        selected={s}
        edges={false}
      />
      <Box
        size={[fw, bh, rr]}
        position={[0, by, zf - rr / 2]}
        color={color}
        selected={s}
        edges={false}
      />
      {[-1, 1].map((sx) => (
        <Cyl key={sx} r={rr} len={bh} position={[sx * (fw / 2), by, zf - rr]} color={color} s={s} />
      ))}
      {/* 위 바람 출구: 어두운 판 + 비스듬한 날개 */}
      <Box
        size={[fw, outH, 0.002]}
        position={[0, outY, zf + 0.001]}
        color="#3f3f46"
        selected={s}
        edges={false}
      />
      {Array.from({ length: slats }, (_, k) => (
        <mesh
          key={k}
          position={[0, outY - outH / 2 + (outH / slats) * (k + 0.5), zf + 0.013]}
          rotation={[-0.5, 0, 0]}
          castShadow
        >
          <boxGeometry args={[fw - 0.01, 0.004, 0.03]} />
          <Mat color={shade(color, -0.06)} selected={s} />
        </mesh>
      ))}
      {/* 표시창 */}
      <GBox
        size={[Math.min(0.1, fw * 0.6), 0.05, 0.003]}
        position={[0, dispY, zf + 0.0015]}
        s={s}
      />
      <Box
        size={[0.03, 0.016, 0.001]}
        position={[0, dispY, zf + 0.0035]}
        color={LED}
        edges={false}
      />
      {/* 옆 아래 흡입구 틈 */}
      {[-1, 1].map((sx) =>
        Array.from({ length: 8 }, (_, k) => (
          <Box
            key={`${sx}-${k}`}
            size={[0.002, Math.min(0.4, h * 0.22), 0.008]}
            position={[
              sx * (w / 2 - 0.0008),
              base + 0.1 + Math.min(0.2, h * 0.11),
              -d / 2 + 0.05 + ((bd - rr - 0.1) / 7) * k,
            ]}
            color={dark}
            edges={false}
          />
        )),
      )}
      {/* 앞 아래 장식 선 */}
      <Box
        size={[fw, 0.006, 0.001]}
        position={[0, base + 0.12, zf + 0.0005]}
        color={shade(color, -0.12)}
        edges={false}
      />
    </>
  );
}

/** 공기청정기: 받침 + 기둥형 몸통 + 옆·뒤 흡입 틈 + 위 원형 토출구·링 조명 + 표시창 */
function AirPurifier({ w, d, h, color, dark, s }: P) {
  const base = Math.min(0.03, h * 0.05);
  const bw = w - 0.01;
  const bd = d - 0.01;
  const bh = h - base - 0.008;
  const by = base + bh / 2;
  const slitH = bh * 0.65;
  const slitY = base + 0.04 + slitH / 2;
  const topR = Math.min(bw, bd) * 0.38;
  const n = Math.max(6, Math.round(bd / 0.025));
  return (
    <>
      <Box
        size={[bw - 0.02, base, bd - 0.02]}
        position={[0, base / 2, 0]}
        color={dark}
        edges={false}
      />
      <Box size={[bw, bh, bd]} position={[0, by, 0]} color={color} selected={s} />
      {/* 양옆 흡입 틈 */}
      {[-1, 1].map((sx) =>
        Array.from({ length: n }, (_, k) => (
          <Box
            key={`${sx}-${k}`}
            size={[0.002, slitH, 0.006]}
            position={[sx * (bw / 2 + 0.0005), slitY, -bd / 2 + (bd / (n + 1)) * (k + 1)]}
            color={shade(color, -0.2)}
            edges={false}
          />
        )),
      )}
      {/* 뒤 흡입 틈 */}
      {Array.from({ length: n }, (_, k) => (
        <Box
          key={`b${k}`}
          size={[0.006, slitH, 0.002]}
          position={[-bw / 2 + (bw / (n + 1)) * (k + 1), slitY, -bd / 2 - 0.0005]}
          color={shade(color, -0.2)}
          edges={false}
        />
      ))}
      {/* 위 토출구: 어두운 원 + 십자 살 + 링 조명 */}
      <Cyl r={topR} len={0.006} position={[0, h - 0.005, 0]} color="#3f3f46" s={s} />
      {[0, Math.PI / 2, Math.PI / 4, -Math.PI / 4].map((a) => (
        <mesh key={a} position={[0, h - 0.0015, 0]} rotation={[0, a, 0]}>
          <boxGeometry args={[topR * 2, 0.002, 0.006]} />
          <Mat color={shade(color, -0.1)} />
        </mesh>
      ))}
      <Ring r={topR + 0.008} tube={0.003} position={[0, h - 0.004, 0]} color={LED} flat />
      {/* 앞 위 표시창 */}
      <GBox
        size={[Math.min(0.1, bw * 0.4), 0.04, 0.003]}
        position={[0, h - 0.008 - Math.min(0.08, bh * 0.12), bd / 2 + 0.0015]}
        s={s}
      />
      <Box
        size={[0.02, 0.012, 0.001]}
        position={[0, h - 0.008 - Math.min(0.08, bh * 0.12), bd / 2 + 0.0035]}
        color="#4ade80"
        edges={false}
      />
    </>
  );
}

/** 제습기: 작은 바퀴 + 상자 몸통 + 앞 아래 물통 + 위 날개·조작부 + 손잡이 홈 */
function Dehumidifier({ w, d, h, color, dark, s }: P) {
  const caster = Math.min(0.03, h * 0.05);
  const bw = w - 0.004;
  const bd = d - 0.004;
  const top = h - 0.003; // 몸통 윗면 (날개·조작부 자리)
  const bh = top - caster;
  const zf = bd / 2;
  const tankH = Math.min(0.24, bh * 0.38);
  const tankY = caster + 0.02 + tankH / 2;
  const louverD = bd * 0.45;
  const louverZ = -bd / 2 + 0.03 + louverD / 2;
  const slats = Math.max(4, Math.round(louverD / 0.02));
  return (
    <>
      {/* 바퀴 */}
      {[
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([sx, sz], i) => (
        <Cyl
          key={i}
          r={caster / 2}
          len={0.018}
          position={[sx * (bw / 2 - 0.04), caster / 2, sz * (bd / 2 - 0.04)]}
          rotation={[0, 0, Math.PI / 2]}
          color={RUBBER}
          seg={14}
        />
      ))}
      <Box size={[bw, bh, bd]} position={[0, caster + bh / 2, 0]} color={color} selected={s} />
      {/* 물통: 경계 선 + 수위 창 + 손 넣는 홈 */}
      <Box
        size={[bw - 0.03, tankH, 0.004]}
        position={[0, tankY, zf + 0.002]}
        color={shade(color, -0.03)}
        selected={s}
      />
      <Box
        size={[bw + 0.001, 0.004, 0.002]}
        position={[0, tankY + tankH / 2 + 0.004, zf + 0.001]}
        color={dark}
        edges={false}
      />
      <GBox
        size={[0.02, tankH * 0.6, 0.002]}
        position={[bw / 2 - 0.05, tankY, zf + 0.005]}
        color="#93c5fd"
        rough={0.1}
        opacity={0.7}
      />
      <Box
        size={[Math.min(0.12, bw * 0.35), 0.012, 0.002]}
        position={[0, tankY + tankH / 2 - 0.02, zf + 0.005]}
        color={RUBBER}
        edges={false}
      />
      {/* 위 바람 출구 날개 (뒤쪽) */}
      <Box
        size={[bw - 0.06, 0.003, louverD]}
        position={[0, top + 0.0005, louverZ]}
        color="#3f3f46"
        edges={false}
      />
      {Array.from({ length: slats }, (_, k) => (
        <Box
          key={k}
          size={[bw - 0.07, 0.003, 0.006]}
          position={[0, top + 0.0015, -bd / 2 + 0.03 + (louverD / slats) * (k + 0.5)]}
          color={shade(color, -0.06)}
          edges={false}
        />
      ))}
      {/* 위 앞쪽 조작부 */}
      <GBox
        size={[Math.min(0.16, bw * 0.45), 0.003, Math.min(0.06, bd * 0.2)]}
        position={[0, top + 0.0015, zf - 0.07]}
        s={s}
      />
      {[-1, 0, 1].map((k) => (
        <Box
          key={k}
          size={[0.01, 0.001, 0.01]}
          position={[k * 0.03, top + 0.0032, zf - 0.07]}
          color={k === 0 ? LED : "#e5e7eb"}
          edges={false}
        />
      ))}
      {/* 양옆 손잡이 홈 */}
      {[-1, 1].map((sx) => (
        <Box
          key={sx}
          size={[0.002, 0.025, Math.min(0.12, bd * 0.4)]}
          position={[sx * (bw / 2 + 0.0005), h - 0.06, 0]}
          color={dark}
          edges={false}
        />
      ))}
    </>
  );
}

/** 가전 3D 모양 */
export const APPLIANCE_MODELS: Record<string, Model3D> = {
  sink: Sink,
  fridge: Fridge,
  "fridge-1door": Fridge1Door,
  "kimchi-fridge": KimchiFridge,
  washer: Washer,
  dryer: Dryer,
  styler: Styler,
  tv: TV,
  aircon: Aircon,
  "air-purifier": AirPurifier,
  dehumidifier: Dehumidifier,
};
