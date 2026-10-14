/** @format */

import Konva from "konva";
import type { Pos } from "@/shared/types/manifest";
import { readRenderTheme } from "./theme";

const PADDING = 6;
/** Approximate monospace glyph width at fontSize 11. */
const CHAR_WIDTH = 6.2;
const TOOLTIP_HEIGHT = 26;
const TOOLTIP_LIFETIME_MS = 2500;

let activeTooltip: Konva.Group | null = null;
let tooltipTimer: number | null = null;

/**
 * A transient, non-interactive label on the interaction layer — e.g. the
 * bit-width mismatch warning shown when a connection commits. One at a
 * time; auto-destroys after a short lifetime. Theme tokens only; the
 * jagged aesthetic keeps sharp corners.
 */
export function showTransientTooltip(
  layer: Konva.Layer,
  position: Pos,
  text: string
): void {
  destroyTransientTooltip();

  const theme = readRenderTheme();
  const width = Math.ceil(text.length * CHAR_WIDTH) + PADDING * 2;

  const group = new Konva.Group({
    x: position.x,
    y: position.y - 30,
    listening: false,
    name: "transient-tooltip",
  });

  group.add(
    new Konva.Rect({
      width,
      height: TOOLTIP_HEIGHT,
      fill: theme.bodyFill,
      stroke: theme.warning,
      strokeWidth: 1.5,
      cornerRadius: 0,
      name: "tooltip-body",
    })
  );
  group.add(
    new Konva.Text({
      x: PADDING,
      y: PADDING + 1,
      text,
      fontSize: 11,
      fontFamily: "monospace",
      fill: theme.warning,
      listening: false,
    })
  );

  layer.add(group);
  activeTooltip = group;
  tooltipTimer = window.setTimeout(destroyTransientTooltip, TOOLTIP_LIFETIME_MS);
}

/** Destroys the active transient tooltip and cancels its timer, if any. */
export function destroyTransientTooltip(): void {
  if (tooltipTimer !== null) {
    window.clearTimeout(tooltipTimer);
    tooltipTimer = null;
  }
  if (activeTooltip) {
    activeTooltip.destroy();
    activeTooltip = null;
  }
}
