import { Group, Line, Text } from "react-konva";
import { findCatalogItem } from "@/catalog/furniture";
import type { FurnitureItem, Vec2 } from "@/domain/document";
import type { Warning } from "@/domain/warnings";
import { itemParts } from "@/geometry/furniture";

const flat = (points: Vec2[]) => points.flatMap((p) => [p.x, p.y]);

const RED = "#dc2626";
const ORANGE = "#ea580c";

type Props = {
  warnings: Warning[];
  items: FurnitureItem[];
  focusedId: string | null;
  scale: number;
};

/** 경고 표시: 문제 가구 테두리, 막힌 여유공간·문 열림 범위, 좁은 통로 폭 */
export function WarningOverlay({ warnings, items, focusedId, scale }: Props) {
  const px = (n: number) => n / scale;
  // 가구별로 가장 심한 단계
  const level = new Map<string, Warning["severity"]>();
  for (const w of warnings) {
    for (const id of w.itemIds) {
      if (level.get(id) !== "error") level.set(id, w.severity);
    }
  }
  const focused = warnings.find((w) => w.id === focusedId);
  const focusIds = new Set(focused?.itemIds ?? []);

  return (
    <Group listening={false}>
      {warnings.map((w) =>
        w.zone ? (
          <Line
            key={`z-${w.id}`}
            points={flat(w.zone)}
            closed
            fill={w.kind === "door" ? "rgba(220,38,38,0.16)" : "rgba(234,88,12,0.16)"}
            stroke={w.kind === "door" ? RED : ORANGE}
            strokeWidth={px(w.id === focusedId ? 2 : 1)}
            dash={[px(4), px(3)]}
          />
        ) : null,
      )}
      {items.map((item) => {
        const sev = level.get(item.id);
        if (!sev) return null;
        const symbol = findCatalogItem(item.catalogId)?.symbol ?? "plain";
        return itemParts(item, symbol).map((part, i) => (
          <Line
            key={`o-${item.id}-${i}`}
            points={flat(part)}
            closed
            stroke={sev === "error" ? RED : ORANGE}
            strokeWidth={px(focusIds.has(item.id) ? 4 : 2.5)}
          />
        ));
      })}
      {warnings.map((w) => {
        if (!w.gap) return null;
        const mid = { x: (w.gap.a.x + w.gap.b.x) / 2, y: (w.gap.a.y + w.gap.b.y) / 2 };
        const label = `${Math.round(w.gap.distance / 10)}cm`;
        const width = px(44);
        return (
          <Group key={`g-${w.id}`}>
            <Line
              points={flat([w.gap.a, w.gap.b])}
              stroke={ORANGE}
              strokeWidth={px(w.id === focusedId ? 3 : 2)}
              dash={[px(5), px(3)]}
            />
            <Text
              x={mid.x - width / 2}
              y={mid.y - px(16)}
              width={width}
              align="center"
              text={label}
              fontSize={px(11)}
              fontStyle="bold"
              fill={ORANGE}
            />
          </Group>
        );
      })}
    </Group>
  );
}
