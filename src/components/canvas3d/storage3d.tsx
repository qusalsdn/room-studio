"use client";

import type { ReactNode } from "react";
import { Box, METAL, Mat, shade } from "./parts";

/**
 * 수납 가구 3D 모양. 치수는 m, 가구 중심이 원점이고 바닥이 y=0.
 * 뒤(벽 쪽)가 -z, 앞(문·서랍 쪽)이 +z.
 */

export const STORAGE_3D = new Set([
  "wardrobe",
  "jangnong",
  "hanger",
  "drawer",
  "bookshelf",
  "tv-stand",
  "living-cabinet",
  "shoe-cabinet",
  "storage-box",
]);

type P = { w: number; d: number; h: number; color: string; dark: string; s: boolean };

/** 앞판(문·서랍) 두께 */
const FT = 0.018;
/** 앞판 사이 틈 */
const GAP = 0.004;
/** 책·옷 색 */
const PALETTE = [
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
function rnd(a: number, b: number): number {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

type Front = { x: number; y: number; w: number; h: number };
type Handle = "v-left" | "v-right" | "h" | "knob" | "groove" | "none";

/** x0~x1, y0~y1 영역을 cols×rows 칸으로 나눈 앞판들 (틈 포함) */
function grid(x0: number, x1: number, y0: number, y1: number, cols: number, rows: number): Front[] {
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
function pairHandle(i: number, count: number): Handle {
  if (count === 1) return "v-right";
  if (i % 2 === 0 && i < count - 1) return "v-right";
  return "v-left";
}

/** 문·서랍 앞판 하나와 손잡이. z는 몸통 앞면 */
function Panel({
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
function Plinth({ w, d, h, color }: { w: number; d: number; h: number; color: string }) {
  return (
    <Box size={[w - 0.04, h, d - 0.06]} position={[0, h / 2, -0.02]} color={color} edges={false} />
  );
}

/** 네 귀퉁이 다리 */
function Legs({
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
function Carcass({
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

/** 옷장: 걸레받이 + 몸통 + 위 몰딩 + 여닫이문 (60cm 정도마다 한 짝) */
function Wardrobe({ w, d, h, color, dark, s }: P) {
  const plinth = Math.min(0.07, h * 0.05);
  const crown = Math.min(0.035, h * 0.03);
  const top = h - crown;
  const z = d / 2 - FT;
  const cols = Math.max(1, Math.round(w / 0.6));
  const doors = grid(-w / 2, w / 2, plinth, top, cols, 1);
  return (
    <>
      <Plinth w={w} d={d} h={plinth} color={dark} />
      <Carcass w={w} d={d} y0={plinth} y1={top} color={color} s={s} />
      <Box
        size={[w + 0.02, crown, d + 0.01]}
        position={[0, top + crown / 2, 0]}
        color={dark}
        selected={s}
      />
      {doors.map((f, i) => (
        <Panel key={i} f={f} z={z} color={shade(color, 0.04)} s={s} handle={pairHandle(i, cols)} />
      ))}
    </>
  );
}

/** 장롱: 옷장보다 넓고, 위에 작은 문이 한 줄 더 있는 붙박이형 */
function Jangnong({ w, d, h, color, dark, s }: P) {
  const plinth = Math.min(0.08, h * 0.05);
  const crown = Math.min(0.05, h * 0.04);
  const top = h - crown;
  const upperH = Math.min(0.42, (top - plinth) * 0.2);
  const split = top - upperH;
  const z = d / 2 - FT;
  const cols = Math.max(1, Math.round(w / 0.6));
  const lower = grid(-w / 2, w / 2, plinth, split, cols, 1);
  const upper = grid(-w / 2, w / 2, split, top, cols, 1);
  return (
    <>
      <Plinth w={w} d={d} h={plinth} color={dark} />
      <Carcass w={w} d={d} y0={plinth} y1={top} color={color} s={s} />
      <Box
        size={[w + 0.03, crown, d + 0.015]}
        position={[0, top + crown / 2, 0]}
        color={dark}
        selected={s}
      />
      {lower.map((f, i) => (
        <Panel
          key={`l${i}`}
          f={f}
          z={z}
          color={shade(color, 0.04)}
          s={s}
          handle={pairHandle(i, cols)}
        />
      ))}
      {upper.map((f, i) => (
        <Panel key={`u${i}`} f={f} z={z} color={shade(color, 0.04)} s={s} handle="groove" />
      ))}
    </>
  );
}

/** 행거: 바퀴 달린 양쪽 기둥 + 위 봉 + 아래 선반 + 걸린 옷 몇 벌 */
function Hanger({ w, d, h, s }: P) {
  const frame = "#71717a";
  const post = 0.025;
  const wheel = 0.04;
  const railY = h - 0.04;
  const shelfY = 0.15;
  const usable = w - 0.16;
  const count = Math.max(1, Math.floor((usable * 0.8) / 0.075));
  const step = (usable * 0.8) / count;
  const clothD = Math.min(0.46, d * 0.9);
  return (
    <>
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * (w / 2 - post), 0, 0]}>
          <Box
            size={[post, h - wheel, post]}
            position={[0, wheel + (h - wheel) / 2, 0]}
            color={frame}
            selected={s}
            edges={false}
          />
          <Box
            size={[post, post, d]}
            position={[0, wheel + post / 2, 0]}
            color={frame}
            selected={s}
            edges={false}
          />
          {[-1, 1].map((sz) => (
            <mesh
              key={sz}
              position={[0, wheel / 2, sz * (d / 2 - 0.02)]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[wheel / 2, wheel / 2, 0.02, 14]} />
              <Mat color="#27272a" />
            </mesh>
          ))}
        </group>
      ))}
      {/* 위 봉 */}
      <mesh position={[0, railY, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, w - post, 12]} />
        <Mat color={frame} selected={s} />
      </mesh>
      {/* 아래 선반 */}
      <Box
        size={[w - post * 2, 0.015, d * 0.75]}
        position={[0, shelfY, 0]}
        color="#a1a1aa"
        selected={s}
        edges={false}
      />
      {/* 걸린 옷: 길이·색이 조금씩 다르게 */}
      {Array.from({ length: count }, (_, i) => {
        const len = Math.min(0.55 + rnd(i, 3) * 0.55, railY - shelfY - 0.12);
        const x = -usable / 2 + step * (i + 0.5);
        const c = PALETTE[Math.floor(rnd(i, 7) * PALETTE.length)];
        return (
          <group key={`c${i}`} position={[x, railY, 0]}>
            <Box
              size={[0.006, 0.05, clothD * 0.85]}
              position={[0, -0.04, 0]}
              color="#d6d3d1"
              edges={false}
            />
            <Box
              size={[0.03, len, clothD]}
              position={[0, -0.06 - len / 2, 0]}
              color={c}
              edges={false}
            />
          </group>
        );
      })}
      {/* 아래 선반 위 신발 두 켤레 */}
      {[0, 1].map((i) => (
        <Box
          key={`sh${i}`}
          size={[0.1, 0.08, Math.min(0.26, d * 0.6)]}
          position={[-w / 2 + 0.15 + i * 0.14, shelfY + 0.048, 0]}
          color={i ? "#44403c" : "#e7e5e4"}
          edges={false}
        />
      ))}
    </>
  );
}

/** 서랍장: 걸레받이 + 상판 + 서랍 여러 단 (맨 위 단은 넓으면 둘로) */
function Drawer({ w, d, h, color, dark, s }: P) {
  const plinth = Math.min(0.06, h * 0.08);
  const top = Math.min(0.025, h * 0.04);
  const y1 = h - top;
  const z = d / 2 - FT;
  const rows = Math.max(2, Math.round((y1 - plinth) / 0.2));
  const rowH = (y1 - plinth) / rows;
  const fronts: { f: Front; key: string }[] = [];
  for (let r = 0; r < rows; r++) {
    const y0 = plinth + rowH * r;
    const cols = r === rows - 1 && w >= 0.7 ? 2 : 1;
    grid(-w / 2, w / 2, y0, y0 + rowH, cols, 1).forEach((f, c) =>
      fronts.push({ f, key: `${r}-${c}` }),
    );
  }
  return (
    <>
      <Plinth w={w} d={d} h={plinth} color={dark} />
      <Carcass w={w} d={d} y0={plinth} y1={y1} color={color} s={s} />
      <Box
        size={[w + 0.01, top, d + 0.005]}
        position={[0, h - top / 2, 0]}
        color={dark}
        selected={s}
      />
      {fronts.map(({ f, key }) => (
        <Panel key={key} f={f} z={z} color={shade(color, 0.04)} s={s} handle="h" />
      ))}
    </>
  );
}

/** 책장: 옆판·뒤판·칸막이 선반 + 칸마다 꽂힌 책 */
function Bookshelf({ w, d, h, color, dark, s }: P) {
  const t = 0.02;
  const kick = Math.min(0.06, h * 0.05);
  const innerW = w - t * 2;
  const bays = Math.max(1, Math.round((h - kick - t) / 0.36));
  const bayH = (h - kick - t) / bays;
  const shelves = Array.from({ length: bays + 1 }, (_, i) => kick + i * bayH);
  const bookD = Math.min(d * 0.8, 0.24);
  const books: ReactNode[] = [];
  for (let b = 0; b < bays; b++) {
    const floor = shelves[b] + t / 2;
    const room = bayH - t - 0.02;
    const fill = innerW * (0.55 + rnd(b, 1) * 0.35);
    let x = -innerW / 2 + 0.01;
    let i = 0;
    while (x < -innerW / 2 + fill) {
      const bw = 0.022 + rnd(b, i + 10) * 0.025;
      const bh = Math.min(room, 0.18 + rnd(b, i + 20) * 0.12);
      const c = PALETTE[Math.floor(rnd(b, i + 30) * PALETTE.length)];
      books.push(
        <Box
          key={`${b}-${i}`}
          size={[bw, bh, bookD]}
          position={[x + bw / 2, floor + bh / 2, -d / 2 + 0.01 + bookD / 2 + (d - bookD) * 0.3]}
          color={c}
          edges={false}
        />,
      );
      x += bw + 0.002;
      i++;
    }
  }
  return (
    <>
      {[-1, 1].map((sx) => (
        <Box
          key={sx}
          size={[t, h, d]}
          position={[sx * (w / 2 - t / 2), h / 2, 0]}
          color={color}
          selected={s}
        />
      ))}
      <Box
        size={[innerW, h - kick, 0.008]}
        position={[0, kick + (h - kick) / 2, -d / 2 + 0.004]}
        color={dark}
        selected={s}
        edges={false}
      />
      <Box
        size={[innerW, kick, t]}
        position={[0, kick / 2, d / 2 - t / 2 - 0.01]}
        color={dark}
        edges={false}
      />
      {shelves.map((y, i) => (
        <Box
          key={`s${i}`}
          size={[innerW, t, d - 0.01]}
          position={[0, y, 0.005]}
          color={color}
          selected={s}
        />
      ))}
      {books}
    </>
  );
}

/** TV장: 짧은 다리 + 양쪽 서랍 + 가운데 뚫린 칸 (셋톱박스) */
function TvStand({ w, d, h, color, dark, s }: P) {
  const legH = Math.min(0.08, h * 0.18);
  const top = h;
  const t = 0.02;
  const sideW = w * 0.36;
  const midW = w - sideW * 2;
  const z = d / 2 - FT;
  const bodyH = top - legH;
  return (
    <>
      <Legs w={w} d={d} h={legH} color={dark} />
      {[-1, 1].map((sx) => {
        const cx = sx * (w / 2 - sideW / 2);
        return (
          <group key={sx}>
            <Box
              size={[sideW, bodyH, d - FT]}
              position={[cx, legH + bodyH / 2, -FT / 2]}
              color={color}
              selected={s}
            />
            <Panel
              f={{ x: cx, y: legH + bodyH / 2, w: sideW - GAP * 2, h: bodyH - GAP * 2 }}
              z={z}
              color={shade(color, 0.04)}
              s={s}
              handle="groove"
            />
          </group>
        );
      })}
      {/* 가운데 뚫린 칸: 위·아래 판과 뒤판 */}
      <Box size={[midW, t, d]} position={[0, top - t / 2, 0]} color={color} selected={s} />
      <Box size={[midW, t, d]} position={[0, legH + t / 2, 0]} color={color} selected={s} />
      <Box
        size={[midW, bodyH - t * 2, 0.01]}
        position={[0, legH + bodyH / 2, -d / 2 + 0.005]}
        color={dark}
        edges={false}
      />
      <Box
        size={[Math.min(0.22, midW * 0.6), 0.04, Math.min(0.16, d * 0.5)]}
        position={[0, legH + t + 0.02, -d * 0.05]}
        color="#27272a"
        edges={false}
      />
    </>
  );
}

/** 거실장: 가는 금속 다리 + 긴 몸통 + 홈 손잡이 문 여러 짝 */
function LivingCabinet({ w, d, h, color, s }: P) {
  const legH = Math.min(0.13, h * 0.26);
  const z = d / 2 - FT;
  const cols = Math.max(2, Math.round(w / 0.45));
  const doors = grid(-w / 2, w / 2, legH, h, cols, 1);
  return (
    <>
      <Legs w={w} d={d} h={legH} color="#3f3f46" size={0.02} inset={0.06} />
      <Carcass w={w} d={d} y0={legH} y1={h} color={color} s={s} />
      {doors.map((f, i) => (
        <Panel key={i} f={f} z={z} color={shade(color, 0.04)} s={s} handle="groove" />
      ))}
    </>
  );
}

/** 신발장: 걸레받이 + 바람 통하는 가로 줄무늬(루버) 문 + 동그란 손잡이 */
function ShoeCabinet({ w, d, h, color, dark, s }: P) {
  const plinth = Math.min(0.06, h * 0.06);
  const top = Math.min(0.025, h * 0.03);
  const y1 = h - top;
  const z = d / 2 - FT;
  const cols = Math.max(1, Math.round(w / 0.45));
  const doors = grid(-w / 2, w / 2, plinth, y1, cols, 1);
  const louver = shade(color, -0.1);
  return (
    <>
      <Plinth w={w} d={d} h={plinth} color={dark} />
      <Carcass w={w} d={d} y0={plinth} y1={y1} color={color} s={s} />
      <Box
        size={[w + 0.01, top, d + 0.005]}
        position={[0, h - top / 2, 0]}
        color={dark}
        selected={s}
      />
      {doors.map((f, i) => {
        const lines = Math.max(3, Math.floor((f.h - 0.1) / 0.055));
        return (
          <group key={i}>
            <Panel f={f} z={z} color={shade(color, 0.04)} s={s} handle="none" />
            {Array.from({ length: lines }, (_, k) => (
              <Box
                key={k}
                size={[f.w - 0.06, 0.008, 0.004]}
                position={[
                  f.x,
                  f.y - f.h / 2 + 0.05 + ((f.h - 0.1) / (lines - 1)) * k,
                  z + FT + 0.001,
                ]}
                color={louver}
                edges={false}
              />
            ))}
            <mesh
              position={[
                f.x + (cols === 1 || i % 2 === 0 ? 1 : -1) * (f.w / 2 - 0.045),
                Math.min(f.y, 0.95),
                z + FT + 0.012,
              ]}
              castShadow
            >
              <sphereGeometry args={[0.014, 14, 10]} />
              <Mat color={METAL} selected={s} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/** 수납박스: 몸통 + 테두리가 있는 뚜껑 + 양옆 손잡이 구멍 + 앞 라벨 */
function StorageBox({ w, d, h, color, s }: P) {
  const lid = Math.min(0.035, h * 0.12);
  const bodyH = h - lid;
  const hole = "#3f3f46";
  return (
    <>
      <Box
        size={[w * 0.95, bodyH, d * 0.95]}
        position={[0, bodyH / 2, 0]}
        color={color}
        selected={s}
      />
      <Box
        size={[w, lid, d]}
        position={[0, bodyH + lid / 2, 0]}
        color={shade(color, -0.06)}
        selected={s}
      />
      {[-1, 1].map((sx) => (
        <Box
          key={sx}
          size={[0.004, Math.min(0.035, bodyH * 0.15), d * 0.35]}
          position={[sx * (w * 0.475 + 0.002), bodyH * 0.75, 0]}
          color={hole}
          edges={false}
        />
      ))}
      <Box
        size={[w * 0.3, bodyH * 0.2, 0.003]}
        position={[0, bodyH * 0.55, d * 0.475 + 0.0015]}
        color="#fafaf9"
        edges={false}
      />
    </>
  );
}

const MODELS: Record<string, (p: P) => ReactNode> = {
  wardrobe: Wardrobe,
  jangnong: Jangnong,
  hanger: Hanger,
  drawer: Drawer,
  bookshelf: Bookshelf,
  "tv-stand": TvStand,
  "living-cabinet": LivingCabinet,
  "shoe-cabinet": ShoeCabinet,
  "storage-box": StorageBox,
};

export function StorageBody({ id, ...p }: P & { id: string }) {
  const Model = MODELS[id];
  return Model ? <Model {...p} /> : null;
}
