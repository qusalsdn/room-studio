import { Shape } from "react-konva";
import type { Viewport } from "@/store/editorStore";
import { COLORS } from "./constants";

type Props = { width: number; height: number; viewport: Viewport };

/** 화면 좌표로 그리는 그리드. 확대 정도에 따라 10cm / 50cm / 1m 간격을 고른다. */
export function Grid({ width, height, viewport }: Props) {
  const { scale } = viewport;
  const minor = scale * 100 >= 8 ? 100 : scale * 500 >= 8 ? 500 : 1000;
  const major = minor === 1000 ? 5000 : 1000;

  return (
    <Shape
      listening={false}
      sceneFunc={(ctx) => {
        const c = ctx._context;
        const draw = (step: number, color: string) => {
          const px = step * scale;
          const startX = viewport.x % px;
          const startY = viewport.y % px;
          c.beginPath();
          for (let x = startX; x < width; x += px) {
            c.moveTo(Math.round(x) + 0.5, 0);
            c.lineTo(Math.round(x) + 0.5, height);
          }
          for (let y = startY; y < height; y += px) {
            c.moveTo(0, Math.round(y) + 0.5);
            c.lineTo(width, Math.round(y) + 0.5);
          }
          c.strokeStyle = color;
          c.lineWidth = 1;
          c.stroke();
        };
        draw(minor, COLORS.gridMinor);
        draw(major, COLORS.gridMajor);
      }}
    />
  );
}
