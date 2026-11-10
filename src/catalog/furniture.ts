/**
 * 기본 가구 카탈로그. 치수는 mm (가로 width × 깊이 depth × 높이 height).
 * 가구의 "앞"은 회전 0일 때 화면 아래쪽(+y)이고, 등받이·머리판은 위쪽(-y)에 있다.
 */
export type FurnitureCategory =
  "bed" | "sofa" | "table" | "chair" | "storage" | "appliance" | "etc";

export type FurnitureSymbol = "bed" | "sofa" | "round" | "rug" | "plain";

export type CatalogItem = {
  id: string;
  name: string;
  category: FurnitureCategory;
  width: number;
  depth: number;
  height: number;
  color: string;
  symbol: FurnitureSymbol;
};

export const CATEGORY_LABELS: Record<FurnitureCategory, string> = {
  bed: "침대",
  sofa: "소파",
  table: "테이블·책상",
  chair: "의자",
  storage: "수납",
  appliance: "가전",
  etc: "기타",
};

export const FURNITURE_COLORS = [
  "#c8b79e",
  "#a8b5a2",
  "#9fb3c8",
  "#d6c3b4",
  "#bcaed1",
  "#a3a3a3",
  "#e2d6c2",
  "#8d7b68",
];

const wood = "#c8b79e";
const fabric = "#9fb3c8";
const white = "#e5e7eb";
const gray = "#a3a3a3";
const green = "#a8b5a2";

export const FURNITURE_CATALOG: CatalogItem[] = [
  {
    id: "bed-single",
    name: "싱글 침대",
    category: "bed",
    width: 1000,
    depth: 2000,
    height: 450,
    color: fabric,
    symbol: "bed",
  },
  {
    id: "bed-super-single",
    name: "슈퍼싱글 침대",
    category: "bed",
    width: 1100,
    depth: 2000,
    height: 450,
    color: fabric,
    symbol: "bed",
  },
  {
    id: "bed-queen",
    name: "퀸 침대",
    category: "bed",
    width: 1500,
    depth: 2000,
    height: 450,
    color: fabric,
    symbol: "bed",
  },
  {
    id: "bed-king",
    name: "킹 침대",
    category: "bed",
    width: 1600,
    depth: 2000,
    height: 450,
    color: fabric,
    symbol: "bed",
  },

  {
    id: "sofa-1",
    name: "1인 소파",
    category: "sofa",
    width: 900,
    depth: 850,
    height: 800,
    color: green,
    symbol: "sofa",
  },
  {
    id: "sofa-2",
    name: "2인 소파",
    category: "sofa",
    width: 1600,
    depth: 850,
    height: 800,
    color: green,
    symbol: "sofa",
  },
  {
    id: "sofa-3",
    name: "3인 소파",
    category: "sofa",
    width: 2100,
    depth: 900,
    height: 800,
    color: green,
    symbol: "sofa",
  },

  {
    id: "dining-4",
    name: "4인 식탁",
    category: "table",
    width: 1200,
    depth: 800,
    height: 740,
    color: wood,
    symbol: "plain",
  },
  {
    id: "dining-6",
    name: "6인 식탁",
    category: "table",
    width: 1600,
    depth: 900,
    height: 740,
    color: wood,
    symbol: "plain",
  },
  {
    id: "table-round",
    name: "원형 테이블",
    category: "table",
    width: 900,
    depth: 900,
    height: 740,
    color: wood,
    symbol: "round",
  },
  {
    id: "coffee-table",
    name: "거실 테이블",
    category: "table",
    width: 1000,
    depth: 500,
    height: 400,
    color: wood,
    symbol: "plain",
  },
  {
    id: "desk",
    name: "책상",
    category: "table",
    width: 1200,
    depth: 600,
    height: 730,
    color: wood,
    symbol: "plain",
  },

  {
    id: "chair",
    name: "의자",
    category: "chair",
    width: 450,
    depth: 500,
    height: 850,
    color: gray,
    symbol: "plain",
  },
  {
    id: "office-chair",
    name: "사무용 의자",
    category: "chair",
    width: 650,
    depth: 650,
    height: 1100,
    color: gray,
    symbol: "round",
  },

  {
    id: "wardrobe",
    name: "옷장",
    category: "storage",
    width: 1200,
    depth: 600,
    height: 2100,
    color: wood,
    symbol: "plain",
  },
  {
    id: "drawer",
    name: "서랍장",
    category: "storage",
    width: 800,
    depth: 450,
    height: 900,
    color: wood,
    symbol: "plain",
  },
  {
    id: "bookshelf",
    name: "책장",
    category: "storage",
    width: 800,
    depth: 300,
    height: 1800,
    color: wood,
    symbol: "plain",
  },
  {
    id: "tv-stand",
    name: "TV장",
    category: "storage",
    width: 1600,
    depth: 400,
    height: 450,
    color: wood,
    symbol: "plain",
  },

  {
    id: "fridge",
    name: "양문형 냉장고",
    category: "appliance",
    width: 910,
    depth: 920,
    height: 1800,
    color: white,
    symbol: "plain",
  },
  {
    id: "washer",
    name: "세탁기",
    category: "appliance",
    width: 700,
    depth: 700,
    height: 1000,
    color: white,
    symbol: "plain",
  },
  {
    id: "tv",
    name: "TV (65형)",
    category: "appliance",
    width: 1450,
    depth: 80,
    height: 840,
    color: "#3f3f46",
    symbol: "plain",
  },
  {
    id: "aircon",
    name: "스탠드 에어컨",
    category: "appliance",
    width: 400,
    depth: 350,
    height: 1800,
    color: white,
    symbol: "plain",
  },

  {
    id: "plant",
    name: "화분",
    category: "etc",
    width: 400,
    depth: 400,
    height: 800,
    color: green,
    symbol: "round",
  },
  {
    id: "rug",
    name: "러그",
    category: "etc",
    width: 2000,
    depth: 1400,
    height: 10,
    color: "#d6c3b4",
    symbol: "rug",
  },
];

/** 카탈로그 → 캔버스 끌어다 놓기용 dataTransfer 타입 */
export const FURNITURE_DRAG_TYPE = "application/x-room-studio-furniture";

export function findCatalogItem(id: string): CatalogItem | undefined {
  return FURNITURE_CATALOG.find((c) => c.id === id);
}

export function symbolOf(catalogId: string): FurnitureSymbol {
  return findCatalogItem(catalogId)?.symbol ?? "plain";
}
