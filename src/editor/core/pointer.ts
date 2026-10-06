/** @format */

import type Konva from "konva";
import type { Point } from "./types";

/** Container-relative pointer position converted to scene (world) coordinates. */
export function pointerScenePosition(stage: Konva.Stage): Point | null {
  const pointer = stage.getPointerPosition();
  if (!pointer) return null;

  const scale = stage.scaleX();
  return {
    x: (pointer.x - stage.x()) / scale,
    y: (pointer.y - stage.y()) / scale,
  };
}
