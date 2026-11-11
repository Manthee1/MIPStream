/** @format */

import Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "../../types/manifest";
import type { MuxConfig } from "./logic";
import { muxSelBits, muxSelCode, resolveMuxSelMap } from "./logic";
import { addBodyText, addModuleLabel, portPosition } from "../draw-helpers";

/** Fraction of the data-input span cut away on the narrow (output) side. */
export const SLANT_RATIO = 0.3;

/**
 * Custom draw function for the Multiplexer: a trapezoid body whose tall left
 * edge spans the data inputs and whose narrow right edge meets the output.
 * The trapezoid is derived only from the data inputs/output so the output pin
 * sits vertically centered on the right edge; the selector pin hangs beyond
 * the data span on the configured edge rather than stretching the body.
 * Each data input is annotated with the binary selector code that forwards
 * it ("0"/"1" on a 2:1), mirroring the splitter's mapping annotations.
 */
export function drawMuxBody(
  group: Konva.Group,
  options: ModuleRenderOptions<MuxConfig>
): ModuleRenderOutput {
  const dataInputs = options.ports.filter(
    (port) => port.direction === "input" && port.id !== "sel"
  );
  const inputYs = dataInputs.map((port) => portPosition(options.ports, port.id).y);
  const topY = Math.min(...inputYs) - 15;
  const botY = Math.max(...inputYs) + 15;
  const inX = Math.min(...dataInputs.map((port) => portPosition(options.ports, port.id).x));
  const outPos = portPosition(options.ports, "out");
  const slant = (botY - topY) * SLANT_RATIO;

  group.add(
    new Konva.Line({
      points: [
        inX, topY,
        outPos.x, topY + slant,
        outPos.x, botY - slant,
        inX, botY,
      ],
      closed: true,
      fill: options.theme.bodyFill,
      stroke: options.theme.bodyStroke,
      strokeWidth: 1.5,
      name: "module-body",
    })
  );

  // Selector codes beside each data input: the binary Sel value that
  // forwards it, read from the configured sel→input assignment.
  const selBits = muxSelBits(dataInputs.length);
  const selMap = resolveMuxSelMap(options.config?.selMap, dataInputs.length);
  dataInputs.forEach((port) => {
    const index = Number.parseInt(port.id.slice(2), 10);
    if (!Number.isInteger(index)) return;
    const pos = portPosition(options.ports, port.id);
    addBodyText(
      group,
      inX + 5,
      pos.y - 4,
      muxSelCode(selMap[index] ?? index, selBits),
      options,
      { fontSize: 7, width: 20 }
    );
  });

  addBodyText(group, inX, -5, "mux", options, { align: "center", width: outPos.x - inX });

  return { width: outPos.x - inX, height: botY - topY };
}
