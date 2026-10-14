/** @format */

import Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "../../types/manifest";
import type { SplitterConfig } from "./logic";
import { addBodyText, addModuleLabel, portPosition } from "../draw-helpers";
import { clampWiringBits, fieldMappingLabel } from "../wiring-logic";
import { resolveSplitterFields } from "./logic";

const SPINE_X = -22;     // spine center between the trunk and the conductors
const SPINE_HALF = 3;    // trunk/spine half thickness
const CONDUCTOR_X = SPINE_X + SPINE_HALF;
const SPINE_MARGIN = 6;
const MIN_SPAN = 12;

/**
 * Compact Logisim-style fan symbol (no box): a short trunk from the input
 * pin feeds a slim vertical spine; individual conductors branch off the
 * spine toward each output pin, annotated with the field's bit mapping.
 */
export function drawSplitterBody(
  group: Konva.Group,
  options: ModuleRenderOptions<SplitterConfig>
): ModuleRenderOutput {
  const inPos = portPosition(options.ports, "in");
  const outputs = options.ports.filter((port) => port.direction === "output");
  const ys = outputs.map((port) => portPosition(options.ports, port.id).y);
  const topY = Math.min(Math.min(...ys) - SPINE_MARGIN, -MIN_SPAN);
  const botY = Math.max(Math.max(...ys) + SPINE_MARGIN, MIN_SPAN);

  // Trunk + spine body ("T" shape), the symbol's clickable body.
  group.add(
    new Konva.Line({
      points: [
        inPos.x, inPos.y - SPINE_HALF,
        SPINE_X, inPos.y - SPINE_HALF,
        SPINE_X, topY,
        SPINE_X + SPINE_HALF, topY,
        SPINE_X + SPINE_HALF, botY,
        SPINE_X, botY,
        SPINE_X, inPos.y + SPINE_HALF,
        inPos.x, inPos.y + SPINE_HALF,
      ],
      closed: true,
      fill: options.theme.bodyFill,
      stroke: options.theme.bodyStroke,
      strokeWidth: 1.5,
      name: "module-body",
    })
  );

  const fields = resolveSplitterFields(options.config);
  outputs.forEach((port, i) => {
    const pos = portPosition(options.ports, port.id);

    // Conductor branching from the spine to the output pin.
    group.add(
      new Konva.Line({
        points: [CONDUCTOR_X, pos.y, pos.x, pos.y],
        stroke: options.theme.bodyStroke,
        strokeWidth: 1,
        listening: false,
      })
    );

    // Mapping annotation just above the conductor.
    const field = fields[i];
    addBodyText(
      group,
      pos.x - 58,
      pos.y - 8,
      field ? fieldMappingLabel(field) : String(port.bits),
      options,
      { fontSize: 7, align: "right", width: 52 }
    );
  });

  // Input width marker under the trunk.
  addBodyText(
    group,
    inPos.x + 6,
    inPos.y + 5,
    String(clampWiringBits(options.config.inputBits)),
    options,
    { fontSize: 7, width: 12 }
  );

  addModuleLabel(group, options, {
    minX: inPos.x,
    minY: topY,
    maxX: 44,
    maxY: botY,
    width: 44 - inPos.x,
    height: botY - topY,
  });

  return { width: 44 - inPos.x, height: botY - topY };
}
