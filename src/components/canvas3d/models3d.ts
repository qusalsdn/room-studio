import { APPLIANCE_MODELS } from "./appliances3d";
import { MISC_MODELS } from "./misc3d";
import type { Model3D } from "./parts";
import { SEATING_MODELS } from "./seating3d";
import { STORAGE_MODELS } from "./storage3d";
import { TABLE_MODELS } from "./tables3d";

/** 카탈로그 id → 3D 모양. 여기 없는 가구는 Furniture3D의 기본 모양으로 그린다 */
export const MODELS_3D: Record<string, Model3D> = {
  ...SEATING_MODELS,
  ...TABLE_MODELS,
  ...STORAGE_MODELS,
  ...APPLIANCE_MODELS,
  ...MISC_MODELS,
};
