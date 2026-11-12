"use client";

import type { ThreeEvent } from "@react-three/fiber";
import type { ReactNode } from "react";
import type { FurnitureItem } from "@/domain/document";
import { Box, Mat, shade } from "./parts";
import { MODELS_3D } from "./models3d";

const M = 1 / 1000;

type Props = {
  item: FurnitureItem;
  selected: boolean;
  onSelect?: (e: ThreeEvent<MouseEvent>) => void;
};

export function Furniture3D({ item, selected, onSelect }: Props) {
  const w = item.width * M;
  const d = item.depth * M;
  const h = Math.max(item.height * M, 0.005);
  const color = item.color;
  const dark = shade(color, -0.12);
  const s = selected;

  const Model = MODELS_3D[item.catalogId];
  let body: ReactNode;
  if (Model) {
    body = <Model w={w} d={d} h={h} color={color} dark={dark} s={s} />;
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
                position={[
                  -innerW / 2 + (innerW / (longSlats + 1)) * (i + 1),
                  deck + rail + slatH / 2,
                  0,
                ]}
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
        <Box size={[seatW, seatT, seatD]} position={[0, seatY, 0.02]} color={color} selected={s} />
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
            <Box size={[0.03, 0.2, 0.03]} position={[0, 0.1, -0.02]} color={metal} edges={false} />
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
  } else if (item.catalogId === "massage-chair") {
    // 안마의자: 낮은 받침 + 양옆 큰 팔걸이 몸체 + 방석 + 뒤로 누운 등받이와 머리 덮개 + 앞으로 내려가는 다리 받침 (뒤가 -z)
    const shell = dark;
    const cushion = shade(color, 0.14);
    const baseH = 0.12;
    const armW = Math.min(0.15, w * 0.19);
    const innerW = Math.max(w - armW * 2, 0.1);
    const seatY = Math.min(0.45, h * 0.38);
    const seatT = 0.1;
    const seatD = Math.min(0.5, d * 0.36);
    const tilt = 0.35; // 등받이가 뒤로 누운 각도 (rad)
    const backL = (h - seatY) / Math.cos(tilt);
    // 방석 뒤 끝: 누운 등받이(뒤판 두께 포함)가 가구 깊이 밖으로 나가지 않게
    const z0 = -d / 2 + Math.min(backL * Math.sin(tilt) + 0.25 * Math.cos(tilt), d * 0.42);
    const zf = z0 + seatD; // 방석 앞 끝
    const legDz = Math.max(d / 2 - zf - 0.03, 0.05);
    const legDy = seatY - baseH - 0.04;
    const legLen = Math.hypot(legDz, legDy);
    const legAngle = Math.atan2(legDy, legDz);
    const armH = Math.min(0.72, h * 0.6);
    const armZ0 = z0 - 0.08;
    const armZ1 = zf + 0.06;
    const hood = Math.min(0.26, backL * 0.3);
    body = (
      <>
        {/* 받침 */}
        <Box
          size={[w * 0.7, baseH, d * 0.8]}
          position={[0, baseH / 2, 0]}
          color={shade(color, -0.22)}
          edges={false}
        />
        {/* 양옆 팔걸이 몸체 */}
        {[-1, 1].map((sx) => (
          <group key={`a${sx}`} position={[sx * (w / 2 - armW / 2), 0, (armZ0 + armZ1) / 2]}>
            <Box
              size={[armW, armH, armZ1 - armZ0]}
              position={[0, armH / 2, 0]}
              color={shell}
              selected={s}
            />
            <Box
              size={[armW * 0.8, 0.03, (armZ1 - armZ0) * 0.7]}
              position={[0, armH + 0.015, 0.02]}
              color={cushion}
              selected={s}
              edges={false}
            />
          </group>
        ))}
        {/* 리모컨 */}
        <Box
          size={[0.05, 0.03, 0.12]}
          position={[w / 2 - armW / 2, armH + 0.045, armZ1 - 0.12]}
          color="#e7e5e4"
          edges={false}
        />
        {/* 방석 */}
        <Box
          size={[innerW, seatT, seatD]}
          position={[0, seatY - seatT / 2, (z0 + zf) / 2]}
          color={cushion}
          selected={s}
        />
        <Box
          size={[innerW, seatY - seatT - baseH + 0.01, seatD]}
          position={[0, (seatY - seatT + baseH) / 2, (z0 + zf) / 2]}
          color={shell}
          edges={false}
        />
        {/* 등받이 + 어깨 날개 + 머리 덮개 */}
        <group position={[0, seatY, z0]} rotation={[-tilt, 0, 0]}>
          <Box
            size={[innerW, backL, 0.14]}
            position={[0, backL / 2, -0.07]}
            color={cushion}
            selected={s}
          />
          <Box
            size={[w * 0.92, backL * 0.9, 0.1]}
            position={[0, backL * 0.45 + 0.02, -0.19]}
            color={shell}
            selected={s}
          />
          {[-1, 1].map((sx) => (
            <Box
              key={`w${sx}`}
              size={[(w * 0.92 - innerW) / 2, backL * 0.55, 0.2]}
              position={[sx * (innerW / 2 + (w * 0.92 - innerW) / 4), backL * 0.62, -0.06]}
              color={shell}
              selected={s}
            />
          ))}
          <Box
            size={[w * 0.92, hood, 0.3]}
            position={[0, backL - hood / 2 + 0.04, -0.04]}
            color={shell}
            selected={s}
          />
        </group>
        {/* 다리 받침 (종아리 홈 두 개) */}
        <group position={[0, seatY - seatT / 2, zf]} rotation={[legAngle, 0, 0]}>
          {[-1, 1].map((sx) => (
            <Box
              key={`l${sx}`}
              size={[innerW / 2 - 0.02, 0.12, legLen]}
              position={[sx * (innerW / 4), 0, legLen / 2]}
              color={cushion}
              selected={s}
            />
          ))}
          <Box
            size={[innerW + 0.04, 0.1, legLen]}
            position={[0, -0.09, legLen / 2]}
            color={shell}
            selected={s}
          />
        </group>
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
