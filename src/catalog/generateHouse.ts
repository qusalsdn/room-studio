import type { RoomPreset, RoomPresetRoom } from "@/catalog/roomPresets";
import { rectPoints } from "@/geometry/roomEdit";

/**
 * 면적과 방·욕실 개수로 "그럴듯한" 집 구조를 만든다.
 * 실제 평면도가 아니라 빠른 시작용 추정치다. 판상형 아파트처럼
 * 앞줄(거실 + 침실 일부)과 뒷줄(주방·욕실·현관·나머지 침실) 두 줄로 나눈다.
 *
 * 각 줄의 방 폭은 면적 비율대로 나누고, 두 줄의 깊이는 줄 면적 비율대로 나눠서
 * 줄 사이·방 사이에 벽 두께만큼 틈을 둔 채 바깥 테두리가 직사각형이 되게 한다.
 */

export const PYEONG_M2 = 3.3058;
/** 아파트 공급면적 → 전용면적 대략 비율 (84㎡ ≈ 공급 110㎡) */
export const SUPPLY_TO_EXCLUSIVE = 0.76;

export const MIN_EXCLUSIVE_M2 = 12;
export const MAX_EXCLUSIVE_M2 = 330;
export const MAX_BEDROOMS = 4;
export const MAX_BATHROOMS = 3;

export type AreaUnit = "pyeong" | "m2";
export type AreaBasis = "supply" | "exclusive";

export type HouseSpec = {
  area: number;
  unit: AreaUnit;
  basis: AreaBasis;
  /** 0 = 원룸 (침실을 따로 나누지 않음) */
  bedrooms: number;
  bathrooms: number;
};

export type GenerateResult =
  { ok: true; preset: RoomPreset; exclusiveM2: number } | { ok: false; reason: string };

const WALL = 100; // 방 사이 틈 = 기본 벽 두께
const SNAP = 50;

/** 입력 면적을 전용면적(㎡)으로 바꾼다. */
export function toExclusiveM2(spec: Pick<HouseSpec, "area" | "unit" | "basis">): number {
  const m2 = spec.unit === "pyeong" ? spec.area * PYEONG_M2 : spec.area;
  return spec.basis === "supply" ? m2 * SUPPLY_TO_EXCLUSIVE : m2;
}

type Part = { name: string; weight: number; minSide: number; fixedM2?: number };

function bedroomName(i: number, total: number): string {
  if (total === 1) return "침실";
  return i === 0 ? "안방" : `침실 ${i + 1}`;
}

/** 가로/세로 비 (가로가 남향 앞줄) */
function aspectFor(bedrooms: number): number {
  return [0.75, 1.1, 1.3, 1.5, 1.6][Math.min(bedrooms, 4)];
}

function snap(v: number): number {
  return Math.round(v / SNAP) * SNAP;
}

function planRows(
  bedrooms: number,
  bathrooms: number,
  m2: number,
): { front: Part[]; back: Part[] } {
  const bathM2 = Math.min(5.5, 3.6 + 0.01 * m2);
  const entryM2 = Math.min(4, 2 + 0.015 * m2);
  const baths: Part[] = Array.from({ length: bathrooms }, (_, i) => ({
    name: i === 0 ? "욕실" : `욕실 ${i + 1}`,
    weight: 0,
    minSide: 1200,
    fixedM2: bathM2,
  }));
  const entry: Part = { name: "현관", weight: 0, minSide: 900, fixedM2: entryM2 };

  if (bedrooms === 0) {
    return { front: [{ name: "방", weight: 1, minSide: 2200 }], back: [...baths, entry] };
  }

  const beds: Part[] = Array.from({ length: bedrooms }, (_, i) => ({
    name: bedroomName(i, bedrooms),
    weight: i === 0 && bedrooms > 1 ? 1.15 : 0.8,
    minSide: 2000,
  }));
  const living: Part = { name: "거실", weight: bedrooms === 1 ? 1.2 : 1.6, minSide: 2400 };
  const kitchen: Part = { name: "주방", weight: bedrooms === 1 ? 0.8 : 1, minSide: 1800 };

  if (bedrooms === 1) {
    return { front: [beds[0], living], back: [kitchen, entry, ...baths] };
  }
  // 앞줄 침실 수: 2베이(방 2) → 1, 3베이 → 2, 4베이 → 3
  const frontBeds = bedrooms === 2 ? 1 : Math.min(bedrooms - 1, 3);
  // 안방을 거실 한쪽 끝, 나머지 앞줄 침실을 반대쪽에
  const [master, ...others] = beds;
  const frontOthers = others.slice(0, frontBeds - 1);
  const backBeds = others.slice(frontBeds - 1);
  const front = [...frontOthers.slice(0, 1), living, ...frontOthers.slice(1), master];
  const back = [...backBeds, kitchen, entry, ...baths];
  return { front, back };
}

export function generateHouse(spec: HouseSpec): GenerateResult {
  if (!Number.isFinite(spec.area) || spec.area <= 0) {
    return { ok: false, reason: "면적을 입력해 주세요." };
  }
  const bedrooms = Math.round(spec.bedrooms);
  const bathrooms = Math.round(spec.bathrooms);
  if (bedrooms < 0 || bedrooms > MAX_BEDROOMS) {
    return { ok: false, reason: `방은 ${MAX_BEDROOMS}개까지 만들 수 있어요.` };
  }
  if (bathrooms < 1 || bathrooms > MAX_BATHROOMS) {
    return { ok: false, reason: `욕실은 1~${MAX_BATHROOMS}개로 골라 주세요.` };
  }

  const m2 = toExclusiveM2(spec);
  if (m2 < MIN_EXCLUSIVE_M2) {
    return { ok: false, reason: `전용 ${MIN_EXCLUSIVE_M2}㎡보다 작은 집은 만들 수 없어요.` };
  }
  if (m2 > MAX_EXCLUSIVE_M2) {
    return { ok: false, reason: `전용 ${MAX_EXCLUSIVE_M2}㎡보다 큰 집은 직접 그려 주세요.` };
  }

  const { front, back } = planRows(bedrooms, bathrooms, m2);
  const parts = [...front, ...back];

  // 고정 면적(욕실·현관)을 빼고 남은 면적을 가중치대로 나눈다
  const fixed = parts.reduce((s, p) => s + (p.fixedM2 ?? 0), 0);
  const flexible = m2 - fixed;
  const weightSum = parts.reduce((s, p) => s + p.weight, 0);
  if (flexible <= 0 || weightSum <= 0) {
    return { ok: false, reason: "면적에 비해 방·욕실이 너무 많아요." };
  }
  const areaOf = (p: Part) => p.fixedM2 ?? (flexible * p.weight) / weightSum;
  const frontM2 = front.reduce((s, p) => s + areaOf(p), 0);

  // 바깥 테두리(방 사이 벽 포함) = 전용면적
  const totalMm2 = m2 * 1e6;
  const depth = snap(Math.sqrt(totalMm2 / aspectFor(bedrooms)));
  const width = snap(totalMm2 / depth);
  const frontDepth = snap(((depth - WALL) * frontM2) / m2);
  const backDepth = depth - WALL - frontDepth;

  const rooms: RoomPresetRoom[] = [];
  let tooSmall: string | null = null;

  const layRow = (row: Part[], y: number, rowDepth: number) => {
    const avail = width - (row.length - 1) * WALL;
    const rowM2 = row.reduce((s, p) => s + areaOf(p), 0);
    let x = 0;
    row.forEach((p, i) => {
      const w = i === row.length - 1 ? width - x : snap((avail * areaOf(p)) / rowM2);
      if (!tooSmall && Math.min(w, rowDepth) < p.minSide) tooSmall = p.name;
      rooms.push({ name: p.name, points: rectPoints(x, y, w, rowDepth) });
      x += w + WALL;
    });
  };
  layRow(front, 0, frontDepth);
  layRow(back, frontDepth + WALL, backDepth);

  if (tooSmall) {
    return {
      ok: false,
      reason: `면적에 비해 방·욕실이 많아서 '${tooSmall}'이(가) 너무 좁아져요. 면적을 늘리거나 개수를 줄여 주세요.`,
    };
  }

  const label = bedrooms === 0 ? "원룸" : `방 ${bedrooms} · 욕실 ${bathrooms}`;
  return {
    ok: true,
    exclusiveM2: m2,
    preset: {
      id: "generated",
      name: `전용 ${Math.round(m2)}㎡ ${label}`,
      description: `${(width / 10).toFixed(0)} × ${(depth / 10).toFixed(0)}cm`,
      kind: "house",
      rooms,
    },
  };
}
