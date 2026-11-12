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

/** 평면도 SVG를 주어진 가로 픽셀로 이미지화. pxPerMm은 축척 막대용 */
async function loadPlanImage(doc: HouseDocument, layout: Layout, width: number) {
  const svg = renderPlanSvg(doc, layout);
  const svgEl = new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;
  const [, , vbW, vbH] = (svgEl.getAttribute("viewBox") ?? "0 0 1 1").split(" ").map(Number);
  const height = Math.round((width * vbH) / vbW);
  svgEl.setAttribute("width", String(width));
  svgEl.setAttribute("height", String(height));
  const blob = new Blob([new XMLSerializer().serializeToString(svgEl)], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    return { img, width, height, pxPerMm: width / vbW };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 평면도의 가로:세로 비율 (가로/세로) */
function planAspect(doc: HouseDocument, layout: Layout): number {
  const svg = renderPlanSvg(doc, layout);
  const svgEl = new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;
  const [, , vbW, vbH] = (svgEl.getAttribute("viewBox") ?? "0 0 1 1").split(" ").map(Number);
  return vbW / vbH;
}

function drawHeader(ctx: CanvasRenderingContext2D, doc: HouseDocument, layout: Layout) {
  ctx.fillStyle = "#18181b";
  ctx.font = `600 52px ${FONT}`;
  ctx.fillText(doc.name, 60, 80);
  ctx.fillStyle = "#71717a";
  ctx.font = `32px ${FONT}`;
  const date = new Date().toLocaleDateString("ko-KR");
  ctx.fillText(`${layout.name} · ${date}`, 60, 122);
}

/** 축척 막대(왼쪽)와 Room Studio 표기(오른쪽) */
function drawFooter(ctx: CanvasRenderingContext2D, pxPerMm: number, y: number, right: number) {
  const meters = [0.5, 1, 2, 5].find((m) => m * 1000 * pxPerMm >= 160) ?? 5;
  const barW = meters * 1000 * pxPerMm;
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
  ctx.textAlign = "left";
  ctx.fillText(meters < 1 ? `${meters * 100}cm` : `${meters}m`, 60 + barW + 16, y + 2);
  ctx.textAlign = "right";
  ctx.fillStyle = "#a1a1aa";
  ctx.fillText("Room Studio", right, y + 2);
  ctx.textAlign = "left";
}

async function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  const png = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!png) throw new Error("이미지를 만들지 못했어요");
  return png;
}

function scene3dCanvas(): HTMLCanvasElement {
  const canvas = document.querySelector<HTMLCanvasElement>("[data-scene3d] canvas");
  if (!canvas) throw new Error("3D 화면이 열려 있지 않아요");
  return canvas;
}

/** 평면도를 PNG로 저장: 제목, 배치안 이름, 날짜, 축척 막대 포함 */
export async function exportPlanPng(doc: HouseDocument, layout: Layout) {
  const plan = await loadPlanImage(doc, layout, WIDTH);
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEADER + plan.height + FOOTER;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawHeader(ctx, doc, layout);
  ctx.drawImage(plan.img, 0, HEADER, WIDTH, plan.height);
  drawFooter(ctx, plan.pxPerMm, HEADER + plan.height + 40, WIDTH - 60);
  download(
    await canvasToPng(canvas),
    `${safeFileName(doc.name)}-${safeFileName(layout.name)}-평면도.png`,
  );
}

/** 지금 보이는 3D 화면을 PNG로 저장 */
export async function export3dPng(doc: HouseDocument, layout: Layout) {
  const png = await canvasToPng(scene3dCanvas());
  download(png, `${safeFileName(doc.name)}-${safeFileName(layout.name)}-3D.png`);
}

const PANEL_H = 1400; // 나란히 저장할 때 두 그림의 기본 높이 (px)
const MAX_PANELS_W = 4200; // 두 그림 합친 가로가 이보다 크면 줄인다
const GAP = 60;
const MARGIN = 60;
const CAPTION = 56; // 각 그림 위 "평면도" / "3D" 글씨 자리

/** 평면도(왼쪽)와 지금 보이는 3D 화면(오른쪽)을 한 장의 PNG로 저장 */
export async function exportSideBySidePng(doc: HouseDocument, layout: Layout) {
  const scene = scene3dCanvas();
  // 3D 캔버스는 다음 프레임에 지워질 수 있으니 먼저 복사해 둔다
  const sceneImg = await createImageBitmap(scene);
  const sceneAspect = scene.width / scene.height;
  const aspect = planAspect(doc, layout);

  let panelH = PANEL_H;
  const total = panelH * (aspect + sceneAspect);
  if (total > MAX_PANELS_W) panelH = Math.round((panelH * MAX_PANELS_W) / total);
  const planW = Math.round(panelH * aspect);
  const sceneW = Math.round(panelH * sceneAspect);

  const plan = await loadPlanImage(doc, layout, planW);
  const width = MARGIN + planW + GAP + sceneW + MARGIN;
  const top = HEADER + CAPTION;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = top + panelH + FOOTER;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawHeader(ctx, doc, layout);

  ctx.fillStyle = "#52525b";
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText("평면도", MARGIN, top - 18);
  ctx.fillText("3D", MARGIN + planW + GAP, top - 18);

  ctx.drawImage(plan.img, MARGIN, top, planW, plan.height);
  ctx.drawImage(sceneImg, MARGIN + planW + GAP, top, sceneW, panelH);
  sceneImg.close();

  drawFooter(ctx, plan.pxPerMm, top + panelH + 40, width - MARGIN);
  download(
    await canvasToPng(canvas),
    `${safeFileName(doc.name)}-${safeFileName(layout.name)}-평면도+3D.png`,
  );
}
