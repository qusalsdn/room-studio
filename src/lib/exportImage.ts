"use client";

import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { StaticPlan } from "@/components/plan/StaticPlan";
import type { HouseDocument, Layout } from "@/domain/document";

const WIDTH = 2400; // 내보내는 이미지 가로 (px)
const HEADER = 140;
const FOOTER = 90;

function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, "_").trim() || "room-studio";
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** StaticPlan을 화면 밖에서 그려 SVG 문자열로 얻는다 */
function renderPlanSvg(doc: HouseDocument, layout: Layout): string {
  const host = document.createElement("div");
  const root = createRoot(host);
  flushSync(() => {
    root.render(
      createElement(StaticPlan, {
        doc,
        items: layout.items.map((item) => ({ item, style: "normal" as const })),
        showDimensions: true,
      }),
    );
  });
  const svg = host.innerHTML;
  root.unmount();
  return svg;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 만들지 못했어요"));
    img.src = src;
  });
}

const FONT = "system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

/** 평면도를 PNG로 저장: 제목, 배치안 이름, 날짜, 축척 막대 포함 */
export async function exportPlanPng(doc: HouseDocument, layout: Layout) {
  const svg = renderPlanSvg(doc, layout);
  const svgEl = new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;
  const [, , vbW, vbH] = (svgEl.getAttribute("viewBox") ?? "0 0 1 1").split(" ").map(Number);
  const planH = Math.round((WIDTH * vbH) / vbW);
  const pxPerMm = WIDTH / vbW;

  svgEl.setAttribute("width", String(WIDTH));
  svgEl.setAttribute("height", String(planH));
  const blob = new Blob([new XMLSerializer().serializeToString(svgEl)], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEADER + planH + FOOTER;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#18181b";
    ctx.font = `600 52px ${FONT}`;
    ctx.fillText(doc.name, 60, 80);
    ctx.fillStyle = "#71717a";
    ctx.font = `32px ${FONT}`;
    const date = new Date().toLocaleDateString("ko-KR");
    ctx.fillText(`${layout.name} · ${date}`, 60, 122);

    ctx.drawImage(img, 0, HEADER, WIDTH, planH);

    // 축척 막대
    const meters = [0.5, 1, 2, 5].find((m) => m * 1000 * pxPerMm >= 160) ?? 5;
    const barW = meters * 1000 * pxPerMm;
    const y = HEADER + planH + 40;
    ctx.strokeStyle = "#3f3f46";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(60, y - 14);
    ctx.lineTo(60, y);
    ctx.lineTo(60 + barW, y);
    ctx.lineTo(60 + barW, y - 14);
    ctx.stroke();
    ctx.fillStyle = "#3f3f46";
    ctx.font = `28px ${FONT}`;
    ctx.fillText(meters < 1 ? `${meters * 100}cm` : `${meters}m`, 60 + barW + 16, y + 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#a1a1aa";
    ctx.fillText("Room Studio", WIDTH - 60, y + 2);

    const png = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!png) throw new Error("이미지를 만들지 못했어요");
    download(png, `${safeFileName(doc.name)}-${safeFileName(layout.name)}-평면도.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 지금 보이는 3D 화면을 PNG로 저장 */
export async function export3dPng(doc: HouseDocument, layout: Layout) {
  const canvas = document.querySelector<HTMLCanvasElement>("[data-scene3d] canvas");
  if (!canvas) throw new Error("3D 화면이 열려 있지 않아요");
  const png = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!png) throw new Error("이미지를 만들지 못했어요");
  download(png, `${safeFileName(doc.name)}-${safeFileName(layout.name)}-3D.png`);
}
