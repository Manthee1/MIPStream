/** @format */

import Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "../../types/manifest";
import type { MergerConfig } from "./logic";
import { addBodyText, addModuleLabel, portPosition } from "../draw-helpers";
import { clampWiringBits, fieldMappingLabel } from "../wiring-logic";
import { resolveMergerFields } from "./logic";

const SPINE_X = 22;     // spine center between the conductors and the trunk
const SPINE_HALF = 3;    // trunk/spine half thickness
const CONDUCTOR_X = SPINE_X - SPINE_HALF;
const SPINE_MARGIN = 6;
const MIN_SPAN = 12;

/**
 * Compact Logisim-style fork symbol (the splitter's mirror, no box):
 * individual conductors from each input pin converge into a slim vertical
 * spine; a short trunk carries the merged word to the output pin, annotated
 * with each field's bit mapping.
 */
export function drawMergerBody(
  group: Konva.Group,
  options: ModuleRenderOptions<MergerConfig>
): ModuleRenderOutput {
  const outPos = portPosition(options.ports, "out");
  const inputs = options.ports.filter((port) => port.direction === "input");
  const ys = inputs.map((port) => portPosition(options.ports, port.id).y);
  const topY = Math.min(Math.min(...ys) - SPINE_MARGIN, -MIN_SPAN);
  const botY = Math.max(Math.max(...ys) + SPINE_MARGIN, MIN_SPAN);

  // Spine + trunk body (mirrored "T" shape), the symbol's clickable body.
  group.add(
    new Konva.Line({
      points: [
        outPos.x, outPos.y - SPINE_HALF,
        SPINE_X, outPos.y - SPINE_HALF,
        SPINE_X, topY,
        SPINE_X - SPINE_HALF, topY,
        SPINE_X - SPINE_HALF, botY,
        SPINE_X, botY,
        SPINE_X, outPos.y + SPINE_HALF,
        outPos.x, outPos.y + SPINE_HALF,
      ],
      closed: true,
      fill: options.theme.bodyFill,
      stroke: options.theme.bodyStroke,
      strokeWidth: 1.5,
      name: "module-body",
    })
  );

  const fields = resolveMergerFields(options.config);
  inputs.forEach((port, i) => {
    const pos = portPosition(options.ports, port.id);

    // Conductor from the input pin into the spine.
    group.add(
      new Konva.Line({
        points: [pos.x, pos.y, CONDUCTOR_X, pos.y],
        stroke: options.theme.bodyStroke,
        strokeWidth: 1,
        listening: false,
      })
    );

    // Mapping annotation just above the conductor.
    const field = fields[i];
    addBodyText(
      group,
      pos.x + 6,
      pos.y - 8,
      field ? fieldMappingLabel(field) : String(port.bits),
      options,
      { fontSize: 7, align: "left", width: 52 }
    );
  });

  // Output width marker under the trunk.
  addBodyText(
    group,
    outPos.x - 18,
    outPos.y + 5,
    String(clampWiringBits(options.config.outputBits)),
    options,
    { fontSize: 7, width: 12 }
  );

  addModuleLabel(group, options, {
    minX: -44,
    minY: topY,
    maxX: outPos.x,
    maxY: botY,
    width: outPos.x + 44,
    height: botY - topY,
  });

  return { width: outPos.x + 44, height: botY - topY };
}