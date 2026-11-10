import { ImageResponse } from "next/og";
import { describe, expect, it } from "vitest";
import { FURNITURE_CATALOG } from "@/catalog/furniture";
import { StaticPlan } from "@/components/plan/StaticPlan";
import { createEmptyDocument, createRoom, type FurnitureItem } from "@/domain/document";
import { rectPoints } from "@/geometry/roomEdit";

/**
 * 공유 링크 미리보기(OG) 이미지는 satori로 그린다. satori는 <svg> 안에 컴포넌트·Fragment를
 * 허용하지 않아서, 평면도에 그런 것이 섞이면 이미지가 통째로 실패한다.
 */
describe("StaticPlan in OG images", () => {
  it("renders every furniture symbol and a door without failing", async () => {
    const doc = createEmptyDocument();
    const room = createRoom("방", rectPoints(0, 0, 6000, 4000));
    doc.floorplan.rooms.push(room);
    doc.floorplan.openings.push({
      id: "d",
      roomId: room.id,
      edgeIndex: 0,
      offset: 500,
      width: 900,
      height: 2100,
      sillHeight: 0,
      kind: "hinged-door",
      swing: { side: "in", hinge: "start" },
    });
    // 기호 종류마다 하나씩
    const seen = new Set<string>();
    const items: FurnitureItem[] = FURNITURE_CATALOG.filter((c) => {
      if (seen.has(c.symbol)) return false;
      seen.add(c.symbol);
      return true;
    }).map((c, i) => ({
      id: c.id,
      catalogId: c.id,
      name: c.name,
      x: 1000 + i * 700,
      y: 2000,
      rotation: 0,
      width: c.width,
      depth: c.depth,
      height: c.height,
      color: c.color,
    }));

    const res = new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <StaticPlan
          doc={doc}
          items={items.map((item) => ({ item, style: "normal" as const }))}
          arrows={[{ from: { x: 1000, y: 1000 }, to: { x: 2000, y: 1000 } }]}
          showLabels={false}
          width={1120}
          height={560}
        />
      </div>,
      { width: 1200, height: 630 },
    );
    const png = new Uint8Array(await res.arrayBuffer());
    expect(png.byteLength).toBeGreaterThan(1000);
    expect([...png.slice(1, 4)].map((c) => String.fromCharCode(c)).join("")).toBe("PNG");
  });
});
