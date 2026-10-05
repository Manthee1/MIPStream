/** @format */

import Konva from "konva";
import { getManifest, hydrateModule } from "@/shared/manifestRegistry";
import type { SerializedModule } from "@/shared/types/manifest";
import { createModuleNode } from "./module-node";
import { readRenderTheme } from "./theme";

const GHOST_OPACITY = 0.5;
const GHOST_DESIGNATOR = "__ghost__";

/**
 * Builds a translucent, non-interactive preview node for "Select & Place"
 * mode. Uses the exact same draw pipeline as placed modules (manifest render
 * or default body + port circles), so the preview matches the placed result.
 * Returns null for unknown typeIds.
 */
export function createGhostNode(typeId: string, rotation: number): Konva.Group | null {
  const manifest = getManifest(typeId);
  if (!manifest) return null;

  const serialized: SerializedModule = {
    designator: GHOST_DESIGNATOR,
    typeId,
    position: { x: 0, y: 0 },
    rotation,
    config: {},
  };

  const hydrated = hydrateModule(serialized);
  const ghost = createModuleNode(hydrated, "editor");

  ghost.name("ghost-node");
  ghost.draggable(false);
  ghost.listening(false);
  ghost.opacity(GHOST_OPACITY);

  // Dashed accent outline visually distinguishes the preview from placed modules.
  const body = ghost.findOne(".module-body");
  if (body instanceof Konva.Shape) {
    body.stroke(readRenderTheme().accent);
    body.dash([4, 4]);
    body.strokeScaleEnabled(false);
  }

  return ghost;
}
