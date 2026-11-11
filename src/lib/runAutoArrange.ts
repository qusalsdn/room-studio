import { autoArrange, type ArrangeOptions, type ArrangeResult } from "@/domain/autoArrange";
import type { ArrangeRequest } from "@/domain/autoArrange.worker";
import type { FurnitureItem, HouseDocument } from "@/domain/document";

/** 자동 배치를 웹 워커에서 돌린다. 워커를 못 쓰는 환경이면 그 자리에서 돌린다 */
export function runAutoArrange(
  doc: Pick<HouseDocument, "floorplan" | "settings">,
  items: FurnitureItem[],
  options: ArrangeOptions = {},
): Promise<ArrangeResult> {
  const request: ArrangeRequest = {
    doc: { floorplan: doc.floorplan, settings: doc.settings },
    items,
    options,
  };
  const inline = () => autoArrange(request.doc, request.items, request.options);
  if (typeof Worker === "undefined") return Promise.resolve(inline());

  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("../domain/autoArrange.worker.ts", import.meta.url), {
        type: "module",
      });
    } catch {
      resolve(inline());
      return;
    }
    worker.onmessage = (e: MessageEvent<ArrangeResult>) => {
      worker.terminate();
      resolve(e.data);
    };
    worker.onerror = () => {
      worker.terminate();
      resolve(inline());
    };
    worker.postMessage(request);
  });
}
