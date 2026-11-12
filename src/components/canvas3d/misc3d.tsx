"use client";

import type { ReactNode } from "react";
import * as THREE from "three";
import { Box, METAL, Mat, type Model3D, type ModelProps as P, PALETTE, rnd, shade } from "./parts";

/**
 * 운동기구·피아노·러그 등 3D 모양. 치수는 m, 가구 중심이 원점이고 바닥이 y=0.
 * 뒤(벽 쪽)가 -z, 앞이 +z.
 */

type V3 = [number, number, number];

const UP = new THREE.Vector3(0, 1, 0);

/** 두 점 a→b를 잇는 둥근 봉 */
function Rod({ a, b, r, color, s }: { a: V3; b: V3; r: number; color: string; s?: boolean }) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const len = Math.max(dir.length(), 0.001);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
  const mid = va.add(vb).multiplyScalar(0.5);
  return (
    <mesh position={[mid.x, mid.y, mid.z]} quaternion={q} castShadow>
      <cylinderGeometry args={[r, r, len, 10]} />
      <Mat color={color} selected={s} />
    </mesh>
  );
}

/** 귀퉁이가 둥근 납작한 판 (가운데 두 상자 + 네 귀퉁이 원기둥) */
function RoundSlab({
  w,
  d,
  t,
  y,
  r,
  color,
  s,
}: {
  w: number;
  d: number;
  t: number;
  y: number;
  r: number;
  color: string;
  s?: boolean;
}) {
  const rr = Math.min(r, w / 2, d / 2);
  return (
    <>
      <Box
        size={[w - rr * 2, t, d]}
        position={[0, y, 0]}
        color={color}
        selected={s}
        edges={false}
      />
      <Box
        size={[w, t, d - rr * 2]}
        position={[0, y, 0]}
        color={color}
        selected={s}
        edges={false}
      />
      {[
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (w / 2 - rr), y, sz * (d / 2 - rr)]} receiveShadow>
          <cylinderGeometry args={[rr, rr, t, 16]} />
          <Mat color={color} selected={s} />
        </mesh>
      ))}
    </>
  );
}

/** 건반: x0~x1 폭에 흰 건반을 깔고 2·3개 묶음으로 검은 건반. y는 흰 건반 윗면, z는 앞 끝 */
function Keys({
  x0,
  x1,
  y,
  z,
  depth,
}: {
  x0: number;
  x1: number;
  y: number;
  z: number;
  depth: number;
}) {
  const kw = 0.0235;
  const count = Math.max(7, Math.floor((x1 - x0) / kw));
  const start = (x0 + x1) / 2 - (count * kw) / 2;
  const kh = 0.02;
  const out: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    out.push(
      <Box
        key={`w${i}`}
        size={[kw - 0.0012, kh, depth]}
        position={[start + kw * (i + 0.5), y - kh / 2, z - depth / 2]}
        color="#f5f5f4"
        edges={false}
      />,
    );
    // 도·레·파·솔·라 다음에 검은 건반 (미·시 다음은 없음)
    const n = i % 7;
    if (i < count - 1 && n !== 2 && n !== 6) {
      out.push(
        <Box
          key={`b${i}`}
          size={[kw * 0.55, 0.012, depth * 0.62]}
          position={[start + kw * (i + 1), y + 0.006, z - depth + (depth * 0.62) / 2]}
          color="#18181b"
          edges={false}
        />,
      );
    }
  }
  return <>{out}</>;
}

/** 거울 유리: 반짝이는 재질 */
function Glass({ size, position }: { size: V3; position: V3 }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#dbe4ea" roughness={0.08} metalness={0.6} />
    </mesh>
  );
}

const LEAVES = ["#4d7c0f", "#3f6212", "#65a30d", "#166534", "#15803d"];

/** 화분: 아래가 좁은 화분 + 흙 + 줄기 끝마다 처진 잎 (발자국 안에서) */
function Plant({ w, d, h, color, s }: P) {
  const R = Math.min(w, d) / 2;
  const potH = Math.min(h * 0.38, 0.32);
  const rTop = R * 0.72;
  const rBot = rTop * 0.72;
  const leafL = Math.min(0.18, R * 0.6);
  const count = Math.max(6, Math.round(h * 12));
  const reach = Math.max(R - leafL * 0.95, 0.02);
  const fy0 = potH + 0.06;
  const fy1 = h - 0.03;
  return (
    <>
      {/* 화분 몸통과 테두리 */}
      <mesh position={[0, potH / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[rTop, rBot, potH, 28]} />
        <Mat color={color} selected={s} />
      </mesh>
      <mesh position={[0, potH - 0.015, 0]} castShadow>
        <cylinderGeometry args={[rTop * 1.05, rTop * 1.05, 0.03, 28]} />
        <Mat color={shade(color, -0.06)} selected={s} />
      </mesh>
      {/* 흙 */}
      <mesh position={[0, potH - 0.012, 0]}>
        <cylinderGeometry args={[rTop * 0.95, rTop * 0.95, 0.008, 24]} />
        <Mat color="#4a3728" />
      </mesh>
      {/* 줄기와 잎 */}
      {Array.from({ length: count }, (_, i) => {
        const a = i * 2.39996 + rnd(i, 1) * 0.6;
        const t = 0.35 + 0.65 * ((i + rnd(i, 2)) / count);
        const ty = fy0 + (fy1 - fy0) * t;
        const rr = reach * (0.35 + 0.65 * rnd(i, 3)) * (1.1 - t * 0.4);
        const dx = Math.cos(a);
        const dz = Math.sin(a);
        const tip: V3 = [dx * rr, ty, dz * rr];
        const base: V3 = [dx * rTop * 0.15, potH - 0.01, dz * rTop * 0.15];
        const L = leafL * (0.75 + rnd(i, 4) * 0.25);
        const leaf = LEAVES[Math.floor(rnd(i, 5) * LEAVES.length)];
        return (
          <group key={i}>
            <Rod a={base} b={tip} r={0.005} color="#4d7c0f" s={s} />
            <group position={tip} rotation={[0, Math.atan2(dx, dz), 0]}>
              <mesh
                position={[0, -L * 0.12, L * 0.4]}
                rotation={[0.35 + rnd(i, 6) * 0.3, 0, 0]}
                scale={[L * 0.3, 0.008, L * 0.5]}
                castShadow
              >
                <sphereGeometry args={[1, 14, 8]} />
                <Mat color={leaf} selected={s} />
              </mesh>
            </group>
          </group>
        );
      })}
    </>
  );
}

/** 러그: 얇은 바탕 + 안쪽으로 들어온 테두리 띠 + 줄무늬 + 짧은 변의 술 */
function Rug({ w, d, h, color, s }: P) {
  const t = Math.max(h, 0.004);
  const alongX = w >= d; // 짧은 변이 x 양끝이면 true
  const long = alongX ? w : d;
  const short = alongX ? d : w;
  const fringe = Math.min(0.05, long * 0.04);
  const bodyL = long - fringe * 2;
  const band = Math.min(0.1, short * 0.08);
  const inset = Math.min(0.06, short * 0.05);
  // 회전 없이 x/z를 바꿔 쓰기 위한 도우미
  const sz = (l: number, sh: number, y: number): V3 => (alongX ? [l, y, sh] : [sh, y, l]);
  const strands = Math.max(4, Math.floor(short / 0.03));
  return (
    <>
      <Box
        size={sz(bodyL, short, t)}
        position={[0, t / 2, 0]}
        color={color}
        selected={s}
        edges={false}
      />
      {/* 테두리 띠 (바탕보다 살짝 높게) */}
      {[-1, 1].map((k) => (
        <group key={k}>
          <Box
            size={sz(bodyL - inset * 2, band, t * 0.3)}
            position={
              alongX
                ? [0, t + t * 0.15, k * (short / 2 - inset - band / 2)]
                : [k * (short / 2 - inset - band / 2), t + t * 0.15, 0]
            }
            color={shade(color, -0.12)}
            selected={s}
            edges={false}
          />
          <Box
            size={sz(band, short - inset * 2, t * 0.3)}
            position={
              alongX
                ? [k * (bodyL / 2 - inset - band / 2), t + t * 0.15, 0]
                : [0, t + t * 0.15, k * (bodyL / 2 - inset - band / 2)]
            }
            color={shade(color, -0.12)}
            selected={s}
            edges={false}
          />
        </group>
      ))}
      {/* 가운데 줄무늬 세 줄 */}
      {[-1, 0, 1].map((k) => (
        <Box
          key={`st${k}`}
          size={sz(bodyL - inset * 2 - band * 2 - 0.12, Math.min(0.03, short * 0.02), t * 0.3)}
          position={
            alongX ? [0, t + t * 0.15, k * short * 0.16] : [k * short * 0.16, t + t * 0.15, 0]
          }
          color={k === 0 ? shade(color, -0.2) : shade(color, 0.08)}
          selected={s}
          edges={false}
        />
      ))}
      {/* 술 */}
      {[-1, 1].flatMap((k) =>
        Array.from({ length: strands }, (_, i) => {
          const off = -short / 2 + (short / strands) * (i + 0.5);
          const c = k * (long / 2 - fringe / 2);
          return (
            <Box
              key={`f${k}-${i}`}
              size={sz(fringe, 0.008, t * 0.5)}
              position={alongX ? [c, t * 0.25, off] : [off, t * 0.25, c]}
              color={shade(color, 0.1)}
              edges={false}
            />
          );
        }),
      )}
    </>
  );
}

/** 욕실 발매트: 둥근 귀퉁이 매트 + 살짝 도톰한 안쪽 판 */
function BathMat({ w, d, h, color, s }: P) {
  const t = Math.max(h, 0.004);
  const r = Math.min(0.07, Math.min(w, d) * 0.18);
  const inset = Math.min(0.04, Math.min(w, d) * 0.1);
  return (
    <>
      <RoundSlab w={w} d={d} t={t * 0.7} y={t * 0.35} r={r} color={shade(color, -0.08)} s={s} />
      <RoundSlab
        w={w - inset * 2}
        d={d - inset * 2}
        t={t * 0.4}
        y={t * 0.7 + t * 0.2}
        r={Math.max(r - inset * 0.5, 0.01)}
        color={shade(color, 0.05)}
        s={s}
      />
    </>
  );
}

/**
 * 러닝머신: 낮은 발판(어두운 벨트·양옆 디딤판) + 모터 덮개 + 기둥 두 개 + 손잡이 + 계기판.
 * 보통 벽을 보고 뛰므로 기둥·계기판이 벽 쪽(-z), 발판 끝이 앞(+z).
 */
function Treadmill({ w, d, h, color, dark, s }: P) {
  const deckH = Math.min(0.2, h * 0.15);
  const hoodD = Math.min(0.34, d * 0.2);
  const hoodH = deckH + Math.min(0.1, h * 0.07);
  const rail = Math.min(0.1, w * 0.13);
  const post = 0.05;
  const postZ = -d / 2 + hoodD * 0.45;
  const conD = Math.min(0.22, d * 0.14);
  const conH = Math.min(0.24, h * 0.18);
  const conY = h - conH / 2;
  const handY = Math.min(h - conH - 0.05, Math.max(deckH + 0.6, h * 0.7));
  const handL = Math.min(0.42, d * 0.25);
  const beltZ0 = -d / 2 + hoodD;
  const beltZ1 = d / 2 - 0.05;
  const belt = beltZ1 - beltZ0;
  return (
    <>
      {/* 발판 틀 */}
      <Box
        size={[w - 0.02, deckH * 0.7, d - hoodD - 0.02]}
        position={[0, deckH * 0.35, (beltZ0 + d / 2) / 2]}
        color={dark}
        selected={s}
      />
      {/* 벨트와 양옆 디딤판 */}
      <Box
        size={[w - rail * 2, deckH * 0.3, belt]}
        position={[0, deckH * 0.85, (beltZ0 + beltZ1) / 2]}
        color="#27272a"
        selected={s}
        edges={false}
      />
      {[-1, 1].map((k) => (
        <Box
          key={`r${k}`}
          size={[rail, deckH * 0.32, belt]}
          position={[k * (w / 2 - rail / 2 - 0.01), deckH * 0.86, (beltZ0 + beltZ1) / 2]}
          color={color}
          selected={s}
        />
      ))}
      {/* 뒤 롤러 덮개 */}
      <Box
        size={[w - 0.02, deckH * 0.8, 0.05]}
        position={[0, deckH * 0.4, d / 2 - 0.025]}
        color={shade(color, -0.1)}
        selected={s}
        edges={false}
      />
      {/* 모터 덮개 */}
      <Box
        size={[w, hoodH, hoodD]}
        position={[0, hoodH / 2, -d / 2 + hoodD / 2]}
        color={color}
        selected={s}
      />
      {/* 기둥 */}
      {[-1, 1].map((k) => (
        <Box
          key={`p${k}`}
          size={[post, h - conH / 2 - hoodH, post]}
          position={[k * (w / 2 - post / 2), hoodH + (h - conH / 2 - hoodH) / 2, postZ]}
          color={dark}
          selected={s}
        />
      ))}
      {/* 양옆 손잡이 (앞으로 뻗음) */}
      {[-1, 1].map((k) => (
        <group key={`h${k}`}>
          <Rod
            a={[k * (w / 2 - post / 2), handY, postZ]}
            b={[k * (w / 2 - post / 2), handY, postZ + handL]}
            r={0.018}
            color={METAL}
            s={s}
          />
          <Box
            size={[0.04, 0.03, handL * 0.5]}
            position={[k * (w / 2 - post / 2), handY + 0.025, postZ + handL * 0.55]}
            color="#3f3f46"
            edges={false}
          />
        </group>
      ))}
      {/* 계기판: 앞쪽으로 기울어진 판 + 화면 + 버튼 */}
      <group position={[0, conY, postZ + conD * 0.35]} rotation={[-0.35, 0, 0]}>
        <Box
          size={[w * 0.9, conH * 0.9, conD * 0.5]}
          position={[0, 0, 0]}
          color={color}
          selected={s}
        />
        <Box
          size={[w * 0.4, conH * 0.45, 0.006]}
          position={[0, conH * 0.08, conD * 0.25 + 0.003]}
          color="#0f172a"
          edges={false}
        />
        {[-1, 1].map((k) => (
          <Box
            key={k}
            size={[w * 0.12, conH * 0.15, 0.008]}
            position={[k * w * 0.3, -conH * 0.18, conD * 0.25 + 0.004]}
            color="#52525b"
            edges={false}
          />
        ))}
      </group>
    </>
  );
}

/** 실내자전거: 앞뒤 받침 + 바닥 빔 + 플라이휠 + 페달 + 안장 기둥 + 핸들(-z) + 작은 계기판 */
function ExerciseBike({ w, d, h, color, dark, s }: P) {
  const foot = 0.05;
  const beamY = 0.07;
  const fwR = Math.min(0.22, h * 0.19, d * 0.2);
  const fwZ = -d / 2 + 0.06 + fwR;
  const fwY = beamY + fwR + 0.02;
  const crankZ = fwZ + fwR + 0.06;
  const crankY = Math.max(fwY - 0.02, 0.28);
  const seatZ = Math.min(d / 2 - 0.18, crankZ + 0.25);
  const seatY = Math.min(h * 0.72, h - 0.2);
  const barZ = -d / 2 + 0.1;
  const barY = h - 0.1;
  const barW = Math.min(w * 0.9, 0.5);
  return (
    <>
      {/* 앞뒤 받침 */}
      {[-d / 2 + foot / 2 + 0.02, d / 2 - foot / 2 - 0.02].map((z, i) => (
        <group key={i}>
          <Box
            size={[w, foot * 0.7, foot]}
            position={[0, foot * 0.35, z]}
            color={dark}
            selected={s}
          />
          {[-1, 1].map((k) => (
            <Box
              key={k}
              size={[0.05, 0.015, foot * 1.1]}
              position={[k * (w / 2 - 0.04), 0.0075, z]}
              color="#27272a"
              edges={false}
            />
          ))}
        </group>
      ))}
      {/* 바닥 빔 */}
      <Box size={[0.06, 0.05, d - 0.06]} position={[0, beamY, 0]} color={dark} selected={s} />
      {/* 플라이휠과 덮개 */}
      <mesh position={[0, fwY, fwZ]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[fwR, fwR, 0.05, 32]} />
        <Mat color={METAL} selected={s} />
      </mesh>
      {[-1, 1].map((k) => (
        <mesh key={k} position={[k * 0.04, fwY, fwZ]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[fwR * 0.75, fwR * 0.75, 0.03, 32]} />
          <Mat color={color} selected={s} />
        </mesh>
      ))}
      {/* 핸들 기둥 (빔 → 핸들) */}
      <Rod
        a={[0, beamY, fwZ + fwR * 0.4]}
        b={[0, barY - 0.05, barZ + 0.08]}
        r={0.03}
        color={color}
        s={s}
      />
      {/* 안장 기둥 (빔 → 안장) */}
      <Rod
        a={[0, beamY, crankZ + 0.05]}
        b={[0, seatY - 0.04, seatZ]}
        r={0.03}
        color={color}
        s={s}
      />
      {/* 크랭크와 페달 */}
      <mesh position={[0, crankY, crankZ]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.09, 20]} />
        <Mat color={dark} selected={s} />
      </mesh>
      {[-1, 1].map((k) => {
        const pz = crankZ + k * 0.13;
        const py = crankY - k * 0.06;
        return (
          <group key={`c${k}`}>
            <Rod a={[k * 0.06, crankY, crankZ]} b={[k * 0.06, py, pz]} r={0.012} color={METAL} />
            <Box
              size={[0.09, 0.025, 0.06]}
              position={[k * Math.min(0.11, w / 2 - 0.05), py, pz]}
              color="#27272a"
              edges={false}
            />
          </group>
        );
      })}
      {/* 안장 */}
      <Box
        size={[0.18, 0.06, 0.12]}
        position={[0, seatY, seatZ + 0.04]}
        color="#27272a"
        selected={s}
      />
      <Box
        size={[0.07, 0.05, 0.14]}
        position={[0, seatY - 0.005, seatZ - 0.08]}
        color="#27272a"
        edges={false}
      />
      {/* 핸들: 가로 봉 + 앞으로 뻗은 손잡이 */}
      <Rod a={[-barW / 2, barY, barZ]} b={[barW / 2, barY, barZ]} r={0.016} color={dark} s={s} />
      {[-1, 1].map((k) => (
        <Rod
          key={`g${k}`}
          a={[(k * barW) / 2, barY, barZ]}
          b={[(k * barW) / 2, barY + 0.03, barZ + 0.16]}
          r={0.02}
          color="#27272a"
        />
      ))}
      {/* 계기판 */}
      <group position={[0, h - 0.04, barZ - 0.02]} rotation={[-0.5, 0, 0]}>
        <Box size={[0.16, 0.1, 0.03]} position={[0, 0, 0]} color={color} selected={s} />
        <Box size={[0.11, 0.06, 0.004]} position={[0, 0, 0.017]} color="#0f172a" edges={false} />
      </group>
    </>
  );
}

/** 업라이트 피아노: 뒤 몸통 + 앞 건반대(흰·검은 건반) + 열린 건반 뚜껑 + 악보대 + 다리 + 페달 */
function UprightPiano({ w, d, h, color, s }: P) {
  const bodyD = Math.min(d * 0.55, 0.36);
  const bodyFront = -d / 2 + bodyD;
  const keyY = Math.min(0.74, h * 0.6);
  const cheek = Math.min(0.07, w * 0.05);
  const keyD = Math.min(0.15, d - bodyD - 0.03);
  const keyFront = bodyFront + keyD + 0.02;
  const bedH = 0.08;
  const lid = 0.025;
  const legW = 0.06;
  const gloss = shade(color, 0.05);
  return (
    <>
      {/* 뒤 몸통 + 윗뚜껑 */}
      <Box
        size={[w, h - lid, bodyD]}
        position={[0, (h - lid) / 2, -d / 2 + bodyD / 2]}
        color={color}
        selected={s}
      />
      <Box
        size={[w + 0.01, lid, bodyD + 0.02]}
        position={[0, h - lid / 2, -d / 2 + bodyD / 2 + 0.01]}
        color={gloss}
        selected={s}
      />
      {/* 아래 앞판 */}
      <Box
        size={[w - cheek * 2, keyY - bedH - 0.08, 0.015]}
        position={[0, 0.06 + (keyY - bedH - 0.08) / 2, bodyFront + 0.0075]}
        color={gloss}
        selected={s}
      />
      {/* 위 앞판과 악보대 */}
      <Box
        size={[w - cheek * 2, h - lid - keyY - 0.12, 0.015]}
        position={[0, keyY + 0.12 + (h - lid - keyY - 0.12) / 2, bodyFront + 0.0075]}
        color={gloss}
        selected={s}
      />
      <group position={[0, keyY + 0.26, bodyFront + 0.03]} rotation={[-0.2, 0, 0]}>
        <Box
          size={[w * 0.5, 0.2, 0.012]}
          position={[0, 0, 0]}
          color={shade(color, -0.04)}
          selected={s}
        />
        <Box
          size={[w * 0.5, 0.012, 0.03]}
          position={[0, -0.1, 0.012]}
          color={shade(color, -0.04)}
          edges={false}
        />
      </group>
      {/* 건반대 */}
      <Box
        size={[w, bedH, keyFront - bodyFront]}
        position={[0, keyY - 0.02 - bedH / 2, (bodyFront + keyFront) / 2]}
        color={color}
        selected={s}
      />
      {/* 양옆 볼 (건반 옆 나무) */}
      {[-1, 1].map((k) => (
        <Box
          key={`ch${k}`}
          size={[cheek, 0.06, keyFront - bodyFront]}
          position={[k * (w / 2 - cheek / 2), keyY + 0.01, (bodyFront + keyFront) / 2]}
          color={gloss}
          selected={s}
        />
      ))}
      {/* 건반 뒤 이름판과 열린 뚜껑 */}
      <Box
        size={[w - cheek * 2, 0.05, 0.02]}
        position={[0, keyY + 0.02, bodyFront + 0.01]}
        color={shade(color, -0.04)}
        edges={false}
      />
      <Box
        size={[w - cheek * 2, 0.1, 0.012]}
        position={[0, keyY + 0.08, bodyFront + 0.012]}
        color={gloss}
        selected={s}
      />
      <Keys x0={-w / 2 + cheek} x1={w / 2 - cheek} y={keyY} z={keyFront - 0.005} depth={keyD} />
      {/* 앞 다리와 바닥 발받침 */}
      {[-1, 1].map((k) => (
        <group key={`lg${k}`}>
          <Box
            size={[legW, keyY - bedH - 0.02, legW]}
            position={[
              k * (w / 2 - legW / 2 - 0.01),
              (keyY - bedH - 0.02) / 2,
              keyFront - legW / 2 - 0.02,
            ]}
            color={color}
            selected={s}
          />
          <Box
            size={[legW, 0.05, keyFront - bodyFront]}
            position={[k * (w / 2 - legW / 2 - 0.01), 0.025, (bodyFront + keyFront) / 2]}
            color={color}
            selected={s}
          />
        </group>
      ))}
      {/* 페달 세 개 */}
      {[-1, 0, 1].map((k) => (
        <Box
          key={`pd${k}`}
          size={[0.035, 0.012, 0.08]}
          position={[k * 0.07, 0.06, bodyFront + 0.04]}
          color="#d4b26a"
          edges={false}
        />
      ))}
    </>
  );
}

/** 디지털 피아노: 옆판 다리 + 얇은 건반 몸체 + 뒤판 + 페달 막대 + 악보 받침 */
function DigitalPiano({ w, d, h, color, s }: P) {
  const side = 0.03;
  const restH = Math.min(0.14, h * 0.16);
  const caseTop = h - restH;
  const caseH = Math.min(0.13, caseTop * 0.18);
  const caseY0 = caseTop - caseH;
  const keyD = Math.min(0.15, d * 0.4);
  const keyY = caseTop - 0.035;
  const front = d / 2 - 0.01;
  const backD = d - keyD - 0.02;
  return (
    <>
      {/* 옆판 다리 */}
      {[-1, 1].map((k) => (
        <Box
          key={`sd${k}`}
          size={[side, caseY0, d * 0.8]}
          position={[k * (w / 2 - side / 2), caseY0 / 2, -d * 0.1]}
          color={color}
          selected={s}
        />
      ))}
      {/* 옆판 아래 앞쪽 발 */}
      {[-1, 1].map((k) => (
        <Box
          key={`ft${k}`}
          size={[side + 0.01, 0.03, d]}
          position={[k * (w / 2 - side / 2 - 0.005), 0.015, 0]}
          color={shade(color, -0.05)}
          edges={false}
        />
      ))}
      {/* 뒤판 */}
      <Box
        size={[w - side * 2, caseY0 * 0.55, 0.015]}
        position={[0, caseY0 * 0.45 + (caseY0 * 0.55) / 2, -d / 2 + 0.06]}
        color={shade(color, -0.04)}
        selected={s}
      />
      {/* 건반 몸체: 뒤쪽 높은 부분 + 건반 아래 바닥 + 앞 막대 */}
      <Box
        size={[w, caseH, backD]}
        position={[0, caseY0 + caseH / 2, -d / 2 + backD / 2]}
        color={color}
        selected={s}
      />
      <Box
        size={[w, caseH - 0.055, keyD + 0.02]}
        position={[0, caseY0 + (caseH - 0.055) / 2, front - (keyD + 0.02) / 2 + 0.01]}
        color={color}
        selected={s}
      />
      {[-1, 1].map((k) => (
        <Box
          key={`ck${k}`}
          size={[0.04, 0.04, keyD + 0.02]}
          position={[k * (w / 2 - 0.02), keyY, front - (keyD + 0.02) / 2 + 0.01]}
          color={color}
          selected={s}
          edges={false}
        />
      ))}
      <Keys x0={-w / 2 + 0.04} x1={w / 2 - 0.04} y={keyY} z={front} depth={keyD} />
      {/* 전원·볼륨 */}
      <Box
        size={[0.08, 0.004, 0.02]}
        position={[-w / 2 + 0.1, caseTop + 0.002, -d / 2 + backD - 0.03]}
        color="#71717a"
        edges={false}
      />
      {/* 악보 받침 */}
      <group position={[0, caseTop + restH / 2, -d / 2 + backD * 0.45]} rotation={[-0.2, 0, 0]}>
        <Box
          size={[w * 0.55, restH * 0.95, 0.012]}
          position={[0, 0, 0]}
          color={shade(color, -0.04)}
          selected={s}
        />
      </group>
      <Box
        size={[w * 0.55, 0.012, 0.035]}
        position={[0, caseTop + 0.006, -d / 2 + backD * 0.45 + 0.03]}
        color={shade(color, -0.04)}
        edges={false}
      />
      {/* 페달 막대와 페달 */}
      <Box
        size={[w - side * 2, 0.05, 0.08]}
        position={[0, 0.06, -d * 0.05]}
        color={shade(color, -0.06)}
        selected={s}
      />
      {[-1, 0, 1].map((k) => (
        <Box
          key={`pd${k}`}
          size={[0.035, 0.012, 0.08]}
          position={[k * 0.06, 0.07, -d * 0.05 + 0.07]}
          color={METAL}
          edges={false}
        />
      ))}
    </>
  );
}

/** 전신거울: 뒤로 살짝 기댄 틀 + 반짝이는 유리 + 뒤 받침다리 */
function Mirror({ w, d, h, color, s }: P) {
  const ft = 0.03;
  const lean = Math.min(0.12, Math.max(0, (d - 0.12) / h));
  const th = Math.atan(lean);
  const zb = d / 2 - ft - 0.01;
  const L = h / Math.cos(th) - ft * Math.sin(th);
  const border = Math.min(0.04, w * 0.08);
  // 거울 뒷면에서 받침다리가 시작하는 점 (높이 60%)
  const yk = L * 0.6;
  const legA: V3 = [0, yk * Math.cos(th), zb - yk * Math.sin(th) - ft / 2];
  const legB: V3 = [0, 0.01, -d / 2 + 0.02];
  return (
    <>
      <group position={[0, 0, zb]} rotation={[-th, 0, 0]}>
        <Box size={[w, L, ft]} position={[0, L / 2, 0]} color={color} selected={s} />
        <Glass
          size={[w - border * 2, L - border * 2, 0.004]}
          position={[0, L / 2, ft / 2 + 0.002]}
        />
      </group>
      {/* 바닥 미끄럼 방지 패드 */}
      <Box
        size={[w * 0.9, 0.01, ft + 0.01]}
        position={[0, 0.005, zb]}
        color="#3f3f46"
        edges={false}
      />
      {/* 받침다리 */}
      {(lean > 0.02 ? [-1, 1] : []).map((k) => (
        <Rod
          key={k}
          a={[k * w * 0.25, legA[1], legA[2]]}
          b={[k * w * 0.3, legB[1], legB[2]]}
          r={0.01}
          color={shade(color, -0.1)}
          s={s}
        />
      ))}
    </>
  );
}

/** 빨래건조대(펼침): 가운데 몸통의 X자 다리 + 촘촘한 가로 봉 + 양옆 날개 봉 + 걸린 수건·옷 */
function DryingRack({ w, d, h, s }: P) {
  const frame = METAL;
  const r = 0.008;
  const cw = Math.min(Math.max(w * 0.45, 0.3), w);
  const topY = h - 0.015;
  const wingY = Math.max(topY - 0.06, h * 0.8);
  const zIn = d / 2 - 0.02;
  const rods = Math.max(3, Math.floor((d - 0.04) / 0.065));
  const wingW = (w - cw) / 2;
  const wingRods = Math.max(2, Math.floor(wingW / 0.06));
  const items: {
    x: number;
    y: number;
    z: number;
    wid: number;
    len: number;
    c: string;
    along: "x" | "z";
  }[] = [];
  // 가운데 봉에 수건 두 장
  [0.3, 0.7].forEach((f, i) => {
    const ri = Math.min(rods - 1, Math.floor(rods * f));
    items.push({
      x: (i ? 1 : -1) * cw * 0.2,
      y: topY,
      z: -zIn + ((zIn * 2) / (rods - 1)) * ri,
      wid: Math.min(cw * 0.35, 0.4),
      len: Math.min(0.45, h * 0.45),
      c: PALETTE[Math.floor(rnd(i, 11) * PALETTE.length)],
      along: "x",
    });
  });
  // 날개 봉에 옷 한 벌씩
  if (wingW > 0.08) {
    const t = Math.ceil(wingRods / 2) / wingRods;
    [-1, 1].forEach((k, i) => {
      items.push({
        x: k * (cw / 2 + (w / 2 - 0.01 - cw / 2) * t),
        y: topY + (wingY - topY) * t,
        z: 0,
        wid: Math.min(d * 0.6, 0.35),
        len: Math.min(0.5, wingY * 0.5),
        c: PALETTE[Math.floor(rnd(i, 17) * PALETTE.length)],
        along: "z",
      });
    });
  }
  return (
    <>
      {/* 가운데 몸통 위 틀 */}
      {[-1, 1].map((k) => (
        <Rod
          key={`tz${k}`}
          a={[(k * cw) / 2, topY, -zIn]}
          b={[(k * cw) / 2, topY, zIn]}
          r={0.011}
          color={frame}
          s={s}
        />
      ))}
      {Array.from({ length: rods }, (_, i) => {
        const z = -zIn + ((zIn * 2) / (rods - 1)) * i;
        return (
          <Rod
            key={`c${i}`}
            a={[-cw / 2, topY, z]}
            b={[cw / 2, topY, z]}
            r={r}
            color={frame}
            s={s}
          />
        );
      })}
      {/* X자 다리 + 바닥 봉 + 가로 보강대 */}
      {[-1, 1].map((k) => (
        <group key={`lg${k}`}>
          <Rod
            a={[(k * cw) / 2, 0.01, -zIn]}
            b={[(k * cw) / 2, topY, zIn]}
            r={0.011}
            color={frame}
            s={s}
          />
          <Rod
            a={[(k * cw) / 2, 0.01, zIn]}
            b={[(k * cw) / 2, topY, -zIn]}
            r={0.011}
            color={frame}
            s={s}
          />
          {[-1, 1].map((sz) => (
            <mesh key={sz} position={[(k * cw) / 2, 0.01, sz * zIn]}>
              <sphereGeometry args={[0.015, 10, 8]} />
              <Mat color="#3f3f46" />
            </mesh>
          ))}
        </group>
      ))}
      {[-1, 1].map((sz) => (
        <Rod
          key={`lb${sz}`}
          a={[-cw / 2, 0.12, sz * (zIn - 0.02)]}
          b={[cw / 2, 0.12, sz * (zIn - 0.02)]}
          r={r}
          color={frame}
          s={s}
        />
      ))}
      {/* 양옆 날개: 바깥으로 살짝 내려가는 틀 + z 방향 봉 + 받침대 */}
      {wingW > 0.04 &&
        [-1, 1].map((k) => {
          const x0 = (k * cw) / 2;
          const x1 = k * (w / 2 - 0.01);
          return (
            <group key={`wg${k}`}>
              {[-1, 1].map((sz) => (
                <Rod
                  key={sz}
                  a={[x0, topY, sz * zIn]}
                  b={[x1, wingY, sz * zIn]}
                  r={0.01}
                  color={frame}
                  s={s}
                />
              ))}
              {Array.from({ length: wingRods }, (_, i) => {
                const t = (i + 1) / wingRods;
                const x = x0 + (x1 - x0) * t;
                const y = topY + (wingY - topY) * t;
                return <Rod key={i} a={[x, y, -zIn]} b={[x, y, zIn]} r={r} color={frame} s={s} />;
              })}
              <Rod
                a={[x0, topY * 0.55, 0]}
                b={[x0 + (x1 - x0) * 0.6, topY + (wingY - topY) * 0.6, 0]}
                r={r}
                color={frame}
                s={s}
              />
            </group>
          );
        })}
      {/* 걸린 수건·옷: 봉에 반 접혀 양쪽으로 늘어짐 */}
      {items.map((it, i) => {
        const y = it.y - r - it.len / 2;
        return (
          <group key={`it${i}`}>
            {[-1, 1].map((k) =>
              it.along === "x" ? (
                <Box
                  key={k}
                  size={[it.wid, it.len * (k < 0 ? 1 : 0.8), 0.006]}
                  position={[it.x, y + (k < 0 ? 0 : it.len * 0.1), it.z + k * 0.008]}
                  color={it.c}
                  edges={false}
                />
              ) : (
                <Box
                  key={k}
                  size={[0.006, it.len * (k < 0 ? 1 : 0.85), it.wid]}
                  position={[it.x + k * 0.008, y + (k < 0 ? 0 : it.len * 0.075), it.z]}
                  color={it.c}
                  edges={false}
                />
              ),
            )}
          </group>
        );
      })}
    </>
  );
}

export const MISC_MODELS: Record<string, Model3D> = {
  plant: Plant,
  rug: Rug,
  "bath-mat": BathMat,
  treadmill: Treadmill,
  "exercise-bike": ExerciseBike,
  "upright-piano": UprightPiano,
  "digital-piano": DigitalPiano,
  mirror: Mirror,
  "drying-rack": DryingRack,
};
