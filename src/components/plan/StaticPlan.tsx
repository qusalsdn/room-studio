import { symbolOf } from "@/catalog/furniture";
import type { FurnitureItem, HouseDocument, Vec2 } from "@/domain/document";
import { lShapeLocal } from "@/geometry/furniture";
import { doorSwing, openingGeometry } from "@/geometry/openings";
import {
  add,
  bounds,
  centroid,
  distance,
  edgeAt,
  offsetPolygon,
  outwardNormal,
  scale,
} from "@/geometry/polygon";
import { formatLength } from "@/lib/format";

/**
 * 읽기 전용 평면도 (SVG). 비교 화면, 나중에는 공유 페이지·이미지 내보내기에 쓴다.
 * 좌표는 문서와 같은 mm 단위 그대로 viewBox에 넣는다.
 */

export type ItemStyle = "normal" | "highlight" | "ghost" | "removed" | "added";

export type PlanItem = { item: FurnitureItem; style: ItemStyle };

export type PlanArrow = { from: Vec2; to: Vec2 };

type Props = {
  doc: Pick<HouseDocument, "floorplan" | "settings">;
  items: PlanItem[];
  arrows?: PlanArrow[];
  /** 마우스를 올린 가구 (목록과 연동) */
  focusId?: string | null;
  showLabels?: boolean;
  /** 벽 안쪽 길이 표시 */
  showDimensions?: boolean;
  className?: string;
  title?: string;
  /** 픽셀 크기 (OG 이미지처럼 className을 못 쓰는 곳에서) */
  width?: number;
  height?: number;
};

const pts = (points: Vec2[]) => points.map((p) => `${p.x},${p.y}`).join(" ");

const STYLE: Record<ItemStyle, { fill: string; stroke: string; dash?: string; opacity: number }> = {
  normal: { fill: "", stroke: "rgba(39,39,42,0.55)", opacity: 1 },
  highlight: { fill: "", stroke: "#2563eb", opacity: 1 },
  ghost: { fill: "none", stroke: "#71717a", dash: "6 4", opacity: 0.8 },
  removed: { fill: "none", stroke: "#dc2626", dash: "6 4", opacity: 0.9 },
  added: { fill: "", stroke: "#16a34a", opacity: 1 },
};

function ItemShape({ item, style, unit }: { item: FurnitureItem; style: ItemStyle; unit: number }) {
  const s = STYLE[style];
  const symbol = symbolOf(item.catalogId);
  const fill = s.fill === "none" ? "none" : item.color;
  const strokeWidth = style === "normal" ? 1 : 2.5;
  const common = {
    fill,
    fillOpacity: style === "ghost" ? 0 : symbol === "hanger" || symbol === "rug" ? 0.55 : 1,
    stroke: s.stroke,
    strokeWidth,
    strokeDasharray: s.dash,
    vectorEffect: "non-scaling-stroke" as const,
  };
  const w = item.width;
  const d = item.depth;
  let shape;
  if (symbol === "round") {
    shape = <ellipse rx={w / 2} ry={d / 2} {...common} />;
  } else if (symbol === "l-shape") {
    shape = <polygon points={pts(lShapeLocal(w, d))} {...common} />;
  } else {
    shape = <rect x={-w / 2} y={-d / 2} width={w} height={d} {...common} />;
  }
  return (
    <g transform={`translate(${item.x} ${item.y}) rotate(${item.rotation})`} opacity={s.opacity}>
      {shape}
      {/* 뒤쪽(등받이·머리판) 표시 */}
      {style !== "ghost" && style !== "removed" && symbol !== "round" && (
        <line
          x1={-w / 2}
          y1={-d / 2}
          x2={w / 2}
          y2={-d / 2}
          stroke="rgba(39,39,42,0.55)"
          strokeWidth={Math.min(unit * 0.5, d / 4)}
        />
      )}
    </g>
  );
}

export function StaticPlan({
  doc,
  items,
  arrows = [],
  focusId,
  showLabels = true,
  showDimensions = false,
  className,
  title,
  width,
  height,
}: Props) {
  const { rooms, openings } = doc.floorplan;
  const t = doc.settings.wallThickness;
  const all = rooms.flatMap((r) => r.points);
  const b = all.length ? bounds(all) : { minX: 0, minY: 0, maxX: 4000, maxY: 3000 };
  const pad = t + 500;
  const vb = {
    x: b.minX - pad,
    y: b.minY - pad,
    w: b.maxX - b.minX + pad * 2,
    h: b.maxY - b.minY + pad * 2,
  };
  // 화면 크기와 상관없이 글자·선이 비슷해 보이도록 도면 크기에 비례한 단위
  const unit = Math.max(vb.w, vb.h) / 160;

  return (
    <svg
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      className={className}
      width={width}
      height={height}
      role="img"
      aria-label={title ?? "평면도"}
      xmlns="http://www.w3.org/2000/svg"
      fontFamily="system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
    >
      <defs>
        <marker
          id="plan-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
        </marker>
      </defs>
      <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="#fafaf9" />
      {rooms.map((r) => (
        <polygon key={`w-${r.id}`} points={pts(offsetPolygon(r.points, t))} fill="#3f3f46" />
      ))}
      {rooms.map((r) => (
        <polygon key={`f-${r.id}`} points={pts(r.points)} fill={r.floorColor} />
      ))}
      {openings.map((o) => {
        const room = rooms.find((r) => r.id === o.roomId);
        if (!room) return null;
        const g = openingGeometry(room.points, o);
        const out = scale(g.normal, t);
        const gap = [g.start, g.end, add(g.end, out), add(g.start, out)];
        const swing = o.kind === "hinged-door" ? doorSwing(room.points, o, t) : null;
        return (
          <g key={o.id}>
            <polygon
              points={pts(gap)}
              fill={o.kind === "window" ? "#ffffff" : room.floorColor}
              stroke={o.kind === "window" ? "#3f3f46" : "none"}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            {swing && (
              <>
                <polyline
                  points={pts(swing.arc)}
                  fill="none"
                  stroke="#71717a"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={swing.hinge.x}
                  y1={swing.hinge.y}
                  x2={swing.leafEnd.x}
                  y2={swing.leafEnd.y}
                  stroke="#3f3f46"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              </>
            )}
          </g>
        );
      })}
      {showLabels &&
        rooms.map((r) => {
          const c = centroid(r.points);
          return (
            <text
              key={`n-${r.id}`}
              x={c.x}
              y={c.y}
              fontSize={unit * 2.4}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#a1a1aa"
              fontWeight={600}
            >
              {r.name}
            </text>
          );
        })}
      {showDimensions &&
        rooms.map((r) =>
          r.points.map((_, i) => {
            const [a, b2] = edgeAt(r.points, i);
            const n = outwardNormal(r.points, i);
            const off = -unit * (1.6 + 1.8 * Math.abs(n.x));
            const len = distance(a, b2);
            if (len < unit * 6) return null;
            return (
              <text
                key={`d-${r.id}-${i}`}
                x={(a.x + b2.x) / 2 + n.x * off}
                y={(a.y + b2.y) / 2 + n.y * off}
                fontSize={unit * 1.5}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#71717a"
              >
                {formatLength(len, doc.settings.displayUnit)}
              </text>
            );
          }),
        )}
      {items.map(({ item, style }) => (
        <ItemShape key={`${style}-${item.id}`} item={item} style={style} unit={unit} />
      ))}
      {arrows.map((a, i) => (
        <line
          key={i}
          x1={a.from.x}
          y1={a.from.y}
          x2={a.to.x}
          y2={a.to.y}
          stroke="#2563eb"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          markerEnd="url(#plan-arrow)"
        />
      ))}
      {showLabels &&
        items
          .filter(({ style }) => style !== "ghost")
          .map(({ item, style }) =>
            Math.min(item.width, item.depth) > unit * 4 ? (
              <text
                key={`l-${style}-${item.id}`}
                x={item.x}
                y={item.y}
                fontSize={unit * 1.7}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={style === "removed" ? "#dc2626" : "#18181b"}
              >
                {item.name}
              </text>
            ) : null,
          )}
      {focusId &&
        items
          .filter(({ item }) => item.id === focusId)
          .map(({ item, style }) => {
            const r = Math.max(item.width, item.depth) / 2 + unit * 2;
            return (
              <circle
                key={`focus-${style}-${item.id}`}
                cx={item.x}
                cy={item.y}
                r={r}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={3}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
    </svg>
  );
}
