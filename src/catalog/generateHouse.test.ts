import { describe, expect, it } from "vitest";
import { generateHouse, toExclusiveM2, type HouseSpec } from "@/catalog/generateHouse";
import { bounds, polygonArea } from "@/geometry/polygon";

const spec = (s: Partial<HouseSpec>): HouseSpec => ({
  area: 84,
  unit: "m2",
  basis: "exclusive",
  bedrooms: 3,
  bathrooms: 2,
  ...s,
});

function overlaps(a: ReturnType<typeof bounds>, b: ReturnType<typeof bounds>) {
  return a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY;
}

describe("toExclusiveM2", () => {
  it("converts pyeong and supply area", () => {
    expect(toExclusiveM2({ area: 10, unit: "pyeong", basis: "exclusive" })).toBeCloseTo(33.058);
    expect(toExclusiveM2({ area: 100, unit: "m2", basis: "supply" })).toBeCloseTo(76);
  });
});

describe("generateHouse", () => {
  const cases: Partial<HouseSpec>[] = [
    { area: 20, bedrooms: 0, bathrooms: 1 },
    { area: 36, bedrooms: 1, bathrooms: 1 },
    { area: 59, bedrooms: 2, bathrooms: 1 },
    { area: 59, bedrooms: 3, bathrooms: 2 },
    { area: 84, bedrooms: 3, bathrooms: 2 },
    { area: 135, bedrooms: 4, bathrooms: 2 },
    { area: 32, unit: "pyeong", basis: "supply", bedrooms: 3, bathrooms: 2 },
  ];

  it.each(cases)("builds a non-overlapping house matching the area %o", (partial) => {
    const s = spec(partial);
    const result = generateHouse(s);
    if (!result.ok) throw new Error(result.reason);
    const { rooms } = result.preset;

    const names = rooms.map((r) => r.name);
    expect(names.filter((n) => n.startsWith("욕실"))).toHaveLength(s.bathrooms);
    expect(new Set(names).size).toBe(names.length);
    const bedroomNames = names.filter((n) => /^(안방|침실)/.test(n));
    expect(bedroomNames).toHaveLength(s.bedrooms);

    const boxes = rooms.map((r) => bounds(r.points));
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        expect(overlaps(boxes[i], boxes[j])).toBe(false);
      }
    }

    // 바깥 테두리 면적이 전용면적과 거의 같고, 테두리는 직사각형으로 꽉 찬다
    const all = bounds(rooms.flatMap((r) => r.points));
    const footprintM2 = ((all.maxX - all.minX) * (all.maxY - all.minY)) / 1e6;
    expect(footprintM2).toBeGreaterThan(result.exclusiveM2 * 0.97);
    expect(footprintM2).toBeLessThan(result.exclusiveM2 * 1.03);
    const roomM2 = rooms.reduce((sum, r) => sum + polygonArea(r.points), 0) / 1e6;
    expect(roomM2).toBeGreaterThan(footprintM2 * 0.85);

    // 모든 좌표가 5cm 격자 위
    for (const p of rooms.flatMap((r) => r.points)) {
      expect(p.x % 50).toBe(0);
      expect(p.y % 50).toBe(0);
    }
  });

  it("rejects too many rooms for the area", () => {
    const result = generateHouse(spec({ area: 30, bedrooms: 4, bathrooms: 2 }));
    expect(result.ok).toBe(false);
  });

  it("rejects invalid input", () => {
    expect(generateHouse(spec({ area: 0 })).ok).toBe(false);
    expect(generateHouse(spec({ area: 5 })).ok).toBe(false);
    expect(generateHouse(spec({ area: 1000 })).ok).toBe(false);
    expect(generateHouse(spec({ bathrooms: 0 })).ok).toBe(false);
    expect(generateHouse(spec({ bedrooms: 7 })).ok).toBe(false);
  });
});
