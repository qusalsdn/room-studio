/// <reference lib="webworker" />
import { autoArrange, type ArrangeOptions } from "@/domain/autoArrange";
import type { FurnitureItem, HouseDocument } from "@/domain/document";

export type ArrangeRequest = {
  doc: Pick<HouseDocument, "floorplan" | "settings">;
  items: FurnitureItem[];
  options: ArrangeOptions;
};

/** 자동 배치는 큰 집에서 1초 넘게 걸릴 수 있어 화면이 멈추지 않도록 워커에서 돌린다 */
self.onmessage = (e: MessageEvent<ArrangeRequest>) => {
  const { doc, items, options } = e.data;
  self.postMessage(autoArrange(doc, items, options));
};
