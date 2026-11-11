import type { KonvaEventObject } from "konva/lib/Node";
import { Arrow, Circle, Group, Line, Text } from "react-konva";
import { symbolOf } from "@/catalog/furniture";
import type { FurnitureItem, Vec2 } from "@/domain/document";
import type { Suggestion } from "@/domain/suggestSpots";
import { itemLabelPoint, itemParts } from "@/geometry/furniture";

const BLUE = "#2563eb";
const flat = (points: Vec2[]) => points.flatMap((p) => [p.x, p.y]);

type Props = {
  item: FurnitureItem;
  spots: Suggestion[];
  hovered: number | null;
  scale: number;
  onPick: (index: number) => void;
  onHover: (index: number | null) => void;
  onCursor: (cursor: string | null) => void;
};

/** 자리 추천 후보: 번호 붙은 점선 윤곽. 누르면 그 자리로 옮긴다 */
export function SuggestionOverlay({
  item,
  spots,
  hovered,
  scale,
  onPick,
  onHover,
  onCursor,
}: Props) {
  const px = (n: number) => n / scale;
  const symbol = symbolOf(item.catalogId);
  const r = px(11);

  return (
    <Group>
      {hovered !== null && spots[hovered] && (
        <Arrow
          listening={false}
          points={flat([item, spots[hovered]])}
          stroke={BLUE}
          fill={BLUE}
          strokeWidth={px(1.5)}
          pointerLength={px(8)}
          pointerWidth={px(8)}
          dash={[px(6), px(4)]}
        />
      )}
      {spots.map((spot, i) => {
        const pose = { ...item, ...spot };
        const at = itemLabelPoint(pose, symbol === "l-shape");
        const active = hovered === i;
        const pick = (e: KonvaEventObject<PointerEvent>) => {
          // 도면 빈 곳 클릭(선택 해제)으로 번지지 않게
          e.cancelBubble = true;
          if (e.evt.button === 0) onPick(i);
        };
        return (
          <Group
            key={`${spot.x},${spot.y},${spot.rotation}`}
            onPointerDown={pick}
            onPointerEnter={() => {
              onHover(i);
              onCursor("pointer");
            }}
            onPointerLeave={() => {
              onHover(null);
              onCursor(null);
            }}
          >
            {itemParts(pose, symbol).map((part, k) => (
              <Line
                key={k}
                points={flat(part)}
                closed
                fill={active ? "rgba(37,99,235,0.22)" : "rgba(37,99,235,0.10)"}
                stroke={BLUE}
                strokeWidth={px(active ? 2.5 : 1.5)}
                dash={[px(6), px(4)]}
              />
            ))}
            <Circle x={at.x} y={at.y} radius={r} fill={BLUE} />
            <Text
              x={at.x - r}
              y={at.y - r}
              width={r * 2}
              height={r * 2}
              align="center"
              verticalAlign="middle"
              text={String(i + 1)}
              fontSize={px(12)}
              fontStyle="bold"
              fill="#fff"
              listening={false}
            />
          </Group>
        );
      })}
    </Group>
  );
}
