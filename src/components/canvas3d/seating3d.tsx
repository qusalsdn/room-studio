"use client";

import { RoundedBox } from "@react-three/drei";
import { Box, Mat, type Model3D, type ModelProps as P, shade } from "./parts";

/**
 * 침대·소파·의자 3D 모양. 치수는 m, 가구 중심이 원점이고 바닥이 y=0.
 * 뒤(벽 쪽)가 -z, 앞이 +z. 침대는 머리판이 -z 쪽.
 */

/** 모서리가 둥근 상자 (쿠션·매트리스·베개). 반지름은 가장 얇은 변의 절반을 넘지 않게 */
function Soft({
  size,
  position,
  color,
  selected,
  radius = 0.03,
  rotation,
}: {
  size: [number, number, number];
  position: [number, number, number];
  color: string;
  selected?: boolean;
  radius?: number;
  rotation?: [number, number, number];
}) {
  const r = Math.max(0.001, Math.min(radius, Math.min(...size) / 2 - 0.001));
  return (
    <RoundedBox
      args={size}
      radius={r}
      smoothness={3}
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
    >
      <Mat color={color} selected={selected} />
    </RoundedBox>
  );
}

const SHEET = "#f5f5f4";
const PILLOW = "#fafaf9";

/** 침대: 낮은 다리 + 프레임 + 쿠션 머리판 + 둥근 매트리스 + 접어 내린 이불 + 베개 + 발치 러너 */
function Bed({ w, d, h, color, dark, s }: P) {
  const legH = Math.min(0.07, h * 0.16);
  const headT = Math.min(0.09, d * 0.05); // 머리판 두께
  const headH = Math.max(h + 0.5, 0.95); // 매트리스보다 높은 머리판
  const frameTop = Math.max(h - 0.22, legH + 0.08);
  const mattH = Math.max(h - frameTop, 0.05);
  const bodyD = d - headT; // 머리판 앞쪽 길이
  const bodyZ = -d / 2 + headT + bodyD / 2;
  const mw = w - 0.05;
  const md = bodyD - 0.04;
  const mz = bodyZ;
  // 쿠션 머리판의 세로 골 (25cm 정도마다 하나)
  const channels = Math.max(2, Math.round((w - 0.08) / 0.25));
  const chW = (w - 0.08) / channels;
  const chH = headH - frameTop - 0.08;
  // 이불: 매트리스 머리 쪽 38% 이후를 덮고, 윗단을 접어 내림
  const duvetZ0 = mz - md / 2 + md * 0.38;
  const duvetZ1 = mz + md / 2 + 0.01;
  const duvetLen = duvetZ1 - duvetZ0;
  const drop = Math.min(0.14, mattH * 0.7); // 옆으로 늘어진 길이
  const duvet = shade(color, 0.22);
  const pillowCount = w >= 1.3 ? 2 : 1;
  const pGap = 0.06;
  const pw = Math.min(0.7, (mw - pGap * (pillowCount + 1)) / pillowCount);
  const pd = Math.min(0.42, md * 0.2);
  const pz = mz - md / 2 + 0.05 + pd / 2;
  return (
    <>
      {/* 다리 */}
      {[
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([sx, sz], i) => (
        <Box
          key={`lg${i}`}
          size={[0.05, legH, 0.05]}
          position={[sx * (w / 2 - 0.06), legH / 2, sz * (d / 2 - 0.06)]}
          color={shade(dark, -0.1)}
          edges={false}
        />
      ))}
      {/* 프레임 (매트리스 받침) */}
      <Box
        size={[w, frameTop - legH, bodyD]}
        position={[0, legH + (frameTop - legH) / 2, bodyZ]}
        color={color}
        selected={s}
      />
      {/* 프레임 위 테두리 (매트리스를 감싸는 얇은 턱) */}
      <Box
        size={[w, 0.02, bodyD]}
        position={[0, frameTop + 0.01, bodyZ]}
        color={dark}
        selected={s}
        edges={false}
      />
      {/* 머리판: 뒤판 + 앞쪽 쿠션 세로 골 */}
      <Box
        size={[w, headH, headT * 0.55]}
        position={[0, headH / 2, -d / 2 + (headT * 0.55) / 2]}
        color={dark}
        selected={s}
      />
      {Array.from({ length: channels }, (_, i) => (
        <Soft
          key={`ch${i}`}
          size={[chW - 0.006, chH, headT * 0.5]}
          position={[
            -(w - 0.08) / 2 + chW * (i + 0.5),
            frameTop + 0.02 + chH / 2,
            -d / 2 + headT * 0.55 + (headT * 0.45) / 2 - 0.002,
          ]}
          color={color}
          selected={s}
          radius={0.03}
        />
      ))}
      {/* 머리판 위 덮개 */}
      <Box
        size={[w, 0.03, headT]}
        position={[0, headH - 0.015, -d / 2 + headT / 2]}
        color={dark}
        selected={s}
        edges={false}
      />
      {/* 매트리스 */}
      <Soft
        size={[mw, mattH, md]}
        position={[0, frameTop + mattH / 2, mz]}
        color={SHEET}
        selected={s}
        radius={0.05}
      />
      {/* 이불: 윗면 + 양옆 늘어진 부분 */}
      <Soft
        size={[mw + 0.02, 0.05, duvetLen]}
        position={[0, h + 0.02, duvetZ0 + duvetLen / 2]}
        color={duvet}
        selected={s}
        radius={0.02}
      />
      {[-1, 1].map((sx) => (
        <Box
          key={`dr${sx}`}
          size={[0.015, drop, duvetLen]}
          position={[sx * (mw / 2 + 0.01), h + 0.02 - drop / 2, duvetZ0 + duvetLen / 2]}
          color={duvet}
          edges={false}
        />
      ))}
      {/* 발치 쪽 늘어진 부분 */}
      <Box
        size={[mw + 0.02, drop, 0.015]}
        position={[0, h + 0.02 - drop / 2, duvetZ1]}
        color={duvet}
        edges={false}
      />
      {/* 접어 내린 이불 윗단 (안감이 보이게 밝은 색) */}
      <Soft
        size={[mw + 0.01, 0.06, Math.min(0.3, duvetLen * 0.3)]}
        position={[0, h + 0.07, duvetZ0 + Math.min(0.3, duvetLen * 0.3) / 2]}
        color={SHEET}
        radius={0.025}
      />
      {/* 발치 러너 (가로 띠) */}
      <Box
        size={[mw + 0.025, 0.055, Math.min(0.45, md * 0.22)]}
        position={[0, h + 0.03, duvetZ1 - Math.min(0.45, md * 0.22) / 2 - 0.06]}
        color={shade(dark, -0.06)}
        edges={false}
      />
      {/* 베개 */}
      {Array.from({ length: pillowCount }, (_, i) => {
        const span = pillowCount * pw + (pillowCount - 1) * pGap;
        return (
          <Soft
            key={`pl${i}`}
            size={[pw, 0.12, pd]}
            position={[-span / 2 + pw / 2 + i * (pw + pGap), h + 0.055, pz]}
            color={PILLOW}
            radius={0.05}
            rotation={[-0.12, 0, 0]}
          />
        );
      })}
    </>
  );
}

/** 소파: 짧은 다리 + 받침 + 둥근 팔걸이 + 등 프레임 + 자리마다 앉는 쿠션·등 쿠션 + 쿠션 하나 */
function Sofa({ w, d, h, color, dark, s }: P) {
  const legH = Math.min(0.1, h * 0.12);
  const armW = Math.min(0.2, Math.max(0.12, w * 0.1));
  const armH = Math.min(h * 0.78, 0.64);
  const backD = Math.min(0.22, Math.max(0.14, d * 0.2));
  const baseTop = legH + Math.min(0.22, h * 0.28);
  const innerW = w - armW * 2;
  const seats = Math.max(1, Math.min(4, Math.round(innerW / 0.65)));
  const cGap = 0.01;
  const cw = (innerW - cGap * (seats + 1)) / seats;
  const ct = Math.min(0.14, Math.max(0.08, (armH - baseTop) * 0.5)); // 앉는 쿠션 두께
  const seatTop = baseTop + ct;
  const bt = Math.min(0.17, d * 0.18); // 등 쿠션 두께
  const backFront = -d / 2 + backD;
  const cd = d / 2 - 0.01 - backFront - bt * 0.4; // 앉는 쿠션 깊이 (등 쿠션 밑으로 조금 들어감)
  const cz = d / 2 - 0.01 - cd / 2;
  const bh = Math.max(h - 0.04 - seatTop, 0.1);
  const bz = backFront + bt / 2 + 0.01;
  const body = shade(color, -0.04);
  const pillow = Math.min(0.4, cw * 0.55, bh * 0.85);
  return (
    <>
      {/* 다리 (어두운 나무색) */}
      {[
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([sx, sz], i) => (
        <mesh
          key={`lg${i}`}
          position={[sx * (w / 2 - 0.06), legH / 2, sz * (d / 2 - 0.06)]}
          castShadow
        >
          <cylinderGeometry args={[0.022, 0.015, legH, 12]} />
          <Mat color={shade(dark, -0.15)} />
        </mesh>
      ))}
      {/* 받침 */}
      <Box
        size={[w - 0.02, baseTop - legH, d - 0.02]}
        position={[0, legH + (baseTop - legH) / 2, 0]}
        color={dark}
        selected={s}
      />
      {/* 등 프레임 */}
      <Soft
        size={[w - 0.02, h - legH, backD]}
        position={[0, legH + (h - legH) / 2, -d / 2 + backD / 2]}
        color={body}
        selected={s}
        radius={0.05}
      />
      {/* 팔걸이 */}
      {[-1, 1].map((sx) => (
        <Soft
          key={`ar${sx}`}
          size={[armW, armH - legH, d]}
          position={[sx * (w / 2 - armW / 2), legH + (armH - legH) / 2, 0]}
          color={color}
          selected={s}
          radius={0.06}
        />
      ))}
      {/* 앉는 쿠션 */}
      {Array.from({ length: seats }, (_, i) => (
        <Soft
          key={`se${i}`}
          size={[cw, ct, cd]}
          position={[-innerW / 2 + cGap + cw / 2 + i * (cw + cGap), baseTop + ct / 2, cz]}
          color={shade(color, 0.04)}
          selected={s}
          radius={0.035}
        />
      ))}
      {/* 등 쿠션 (뒤로 살짝 기울어짐) */}
      {Array.from({ length: seats }, (_, i) => (
        <Soft
          key={`bk${i}`}
          size={[cw, bh, bt]}
          position={[-innerW / 2 + cGap + cw / 2 + i * (cw + cGap), seatTop + bh / 2, bz]}
          rotation={[-0.1, 0, 0]}
          color={shade(color, 0.02)}
          selected={s}
          radius={0.05}
        />
      ))}
      {/* 장식 쿠션 하나 (왼쪽 구석에 기대어) */}
      <Soft
        size={[pillow, pillow, 0.11]}
        position={[
          -innerW / 2 + cGap + pillow / 2 + 0.04,
          seatTop + pillow / 2 + 0.01,
          bz + bt / 2 + 0.07,
        ]}
        rotation={[-0.22, 0.25, 0.05]}
        color="#e8d5b5"
        radius={0.04}
      />
    </>
  );
}

/** 식탁 의자: 네 다리 + 앞치마 틀 + 방석 얹은 좌판 + 뒷다리에서 이어진 등 기둥 + 위 가로대와 세로 살 */
function Chair({ w, d, h, color, dark, s }: P) {
  const leg = Math.min(0.036, w * 0.08);
  const seatY = Math.min(0.46, h * 0.54); // 좌판 윗면
  const st = 0.03; // 좌판 두께
  const apronH = 0.06;
  const lx = w / 2 - leg / 2;
  const lz = d / 2 - leg / 2;
  const innerW = w - leg * 2;
  const innerD = d - leg * 2;
  const topRailH = Math.min(0.08, (h - seatY) * 0.2);
  const lowRailY = seatY + Math.min(0.14, (h - seatY) * 0.3);
  const slatY0 = lowRailY + 0.015;
  const slatY1 = h - topRailH;
  const slats = Math.max(2, Math.round(innerW / 0.1));
  const backZ = -lz;
  return (
    <>
      {/* 앞다리 */}
      {[-1, 1].map((sx) => (
        <Box
          key={`fl${sx}`}
          size={[leg, seatY - st, leg]}
          position={[sx * lx, (seatY - st) / 2, lz]}
          color={color}
          selected={s}
          edges={false}
        />
      ))}
      {/* 뒷다리 = 등 기둥 (바닥부터 꼭대기까지) */}
      {[-1, 1].map((sx) => (
        <Box
          key={`bl${sx}`}
          size={[leg, h, leg]}
          position={[sx * lx, h / 2, backZ]}
          color={color}
          selected={s}
          edges={false}
        />
      ))}
      {/* 좌판 아래 앞치마 틀 */}
      {[-1, 1].map((sz) => (
        <Box
          key={`ax${sz}`}
          size={[innerW, apronH, 0.02]}
          position={[0, seatY - st - apronH / 2, sz * (lz - leg / 2 + 0.01)]}
          color={dark}
          edges={false}
        />
      ))}
      {[-1, 1].map((sx) => (
        <Box
          key={`az${sx}`}
          size={[0.02, apronH, innerD]}
          position={[sx * (lx - leg / 2 + 0.01), seatY - st - apronH / 2, 0]}
          color={dark}
          edges={false}
        />
      ))}
      {/* 다리 사이 아래 가로대 (옆쪽) */}
      {[-1, 1].map((sx) => (
        <Box
          key={`st${sx}`}
          size={[leg * 0.6, leg * 0.6, innerD]}
          position={[sx * lx, Math.min(0.16, seatY * 0.35), 0]}
          color={color}
          edges={false}
        />
      ))}
      {/* 좌판 */}
      <Box
        size={[w, st, d - leg]}
        position={[0, seatY - st / 2, leg / 2]}
        color={color}
        selected={s}
      />
      {/* 방석 */}
      <Soft
        size={[w - 0.05, 0.03, d - leg - 0.06]}
        position={[0, seatY + 0.015, leg / 2 + 0.01]}
        color={shade(color, 0.12)}
        selected={s}
        radius={0.012}
      />
      {/* 등받이 위 가로대 */}
      <Box
        size={[innerW, topRailH, leg * 0.8]}
        position={[0, h - topRailH / 2, backZ]}
        color={color}
        selected={s}
      />
      {/* 등받이 아래 가로대 */}
      <Box
        size={[innerW, 0.03, leg * 0.6]}
        position={[0, lowRailY, backZ]}
        color={color}
        selected={s}
        edges={false}
      />
      {/* 세로 살 */}
      {Array.from({ length: slats }, (_, i) => (
        <Box
          key={`sl${i}`}
          size={[0.022, slatY1 - slatY0, leg * 0.45]}
          position={[-innerW / 2 + (innerW / (slats + 1)) * (i + 1), (slatY0 + slatY1) / 2, backZ]}
          color={shade(color, 0.04)}
          selected={s}
          edges={false}
        />
      ))}
    </>
  );
}

export const SEATING_MODELS: Record<string, Model3D> = {
  "bed-single": Bed,
  "bed-super-single": Bed,
  "bed-queen": Bed,
  "bed-king": Bed,
  "sofa-1": Sofa,
  "sofa-2": Sofa,
  "sofa-3": Sofa,
  chair: Chair,
};
