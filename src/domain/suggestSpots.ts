import { ruleTerms } from "@/domain/arrangeRules";
import { rankSpots, roomOf, type Candidate, type RankedSpot } from "@/domain/autoArrange";
import type { FurnitureItem, HouseDocument } from "@/domain/document";

/**
 * 가구 하나의 자리 추천. 다른 가구는 그대로 두고, 그 가구가 있는 방 안에서
 * 서로 다른 좋은 자리를 몇 곳 고른다.
 * - 새 가구: 놓은 자리가 대충 고른 곳이라 옮기는 거리는 거의 따지지 않는다.
 * - 기존 가구: 지금 자리보다 나은 곳만 추천한다.
 */

type Doc = Pick<HouseDocument, "floorplan" | "settings">;

export type Suggestion = Candidate & {
  /** 이 자리의 좋은 점 (예: "TV 맞은편", "창가") */
  reasons: string[];
};

export type SuggestResult = {
  spots: Suggestion[];
  /** 기존 가구인데 지금 자리보다 나은 곳이 없음 */
  currentIsBest: boolean;
};

export const SUGGESTION_COUNT = 3;
/** 새 가구는 옮기는 비용을 이만큼만 친다 */
const NEW_ITEM_MOVE_WEIGHT = 0.1;
/** 지금 자리보다 이만큼(1m 옮기기 = 100)은 나아야 추천한다 */
const MIN_GAIN = 30;

export function suggestSpots(
  doc: Doc,
  items: FurnitureItem[],
  itemId: string,
  options: { isNew?: boolean } = {},
): SuggestResult {
  const item = items.find((i) => i.id === itemId);
  const rooms = doc.floorplan.rooms;
  const room = item && roomOf(item, rooms);
  if (!item || !room) return { spots: [], currentIsBest: false };

  const others = items.filter((i) => i.id !== itemId && roomOf(i, rooms)?.id === room.id);
  const moveWeight = options.isNew ? NEW_ITEM_MOVE_WEIGHT : 1;
  const ranked = rankSpots(doc, room, item, others, {
    limit: SUGGESTION_COUNT + 1,
    moveWeight,
  });

  // 지금 자리 그대로인 후보는 빼고, 기존 가구라면 지금 자리보다 나은 것만 남긴다
  const here = (c: Candidate) =>
    Math.hypot(c.x - item.x, c.y - item.y) < 100 && c.rotation === item.rotation;
  let spots = ranked.filter((s) => !here(s));
  let currentIsBest = false;
  if (!options.isNew) {
    const current = rankSpots(doc, room, item, others, { limit: 1, moveWeight, only: item });
    const currentCost = current[0]?.cost ?? Infinity;
    spots = spots.filter((s) => s.cost < currentCost - MIN_GAIN);
    currentIsBest = spots.length === 0 && Number.isFinite(currentCost);
  }

  const reasonsOf = (spot: RankedSpot) => {
    const reasons = ruleTerms(
      { ...item, ...spot },
      { room, openings: doc.floorplan.openings, placed: others },
    ).reasons;
    if (spot.addedWarnings > 0) reasons.push(`확인할 점 ${spot.addedWarnings}개`);
    else if (reasons.length === 0) reasons.push("겹치거나 막는 것 없음");
    return reasons;
  };

  return {
    spots: spots.slice(0, SUGGESTION_COUNT).map((s) => ({
      x: s.x,
      y: s.y,
      rotation: s.rotation,
      reasons: reasonsOf(s),
    })),
    currentIsBest,
  };
}
