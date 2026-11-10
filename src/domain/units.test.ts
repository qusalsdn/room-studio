import { describe, expect, it } from "vitest";
import { cmToMm, formatLength, mmToCm } from "@/domain/units";

describe("units", () => {
  it("converts cm to integer mm", () => {
    expect(cmToMm(180)).toBe(1800);
    expect(cmToMm(75.25)).toBe(753);
  });

  it("converts mm to cm", () => {
    expect(mmToCm(1805)).toBe(180.5);
  });

  it("formats lengths per display unit", () => {
    expect(formatLength(1800)).toBe("180cm");
    expect(formatLength(1805)).toBe("180.5cm");
    expect(formatLength(1805, "mm")).toBe("1805mm");
    expect(formatLength(3200, "m")).toBe("3.2m");
  });
});
