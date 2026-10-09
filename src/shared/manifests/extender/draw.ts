/** @format */

import Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "../../types/manifest";
import type { ExtenderConfig } from "./index";
import { addBodyText, addModuleLabel, portPosition } from "../draw-helpers";

const IN_HALF = 14;
const OUT_HALF = 28;

/**
 * Widening trapezoid: the narrow edge carries the input, the wide edge the
 * extended output, annotated with both widths.
 */
export function drawExtenderBody(
  group: Konva.Group,
  options: ModuleRenderOptions<ExtenderConfig>
): ModuleRenderOutput {
  const inPort = portPosition(options.ports, "in");
  const outPort = portPosition(options.ports, "out");

  group.add(
    new Konva.Line({
      points: [
        inPort.x, -IN_HALF,
        outPort.x, -OUT_HALF,
        outPort.x, OUT_HALF,
        inPort.x, IN_HALF,
      ],
      closed: true,
      fill: options.theme.bodyFill,
      stroke: options.theme.bodyStroke,
      strokeWidth: 1.5,
      name: "module-body",
    })
  );

  addModuleLabel(group, options, {
    minX: inPort.x,
    minY: -OUT_HALF,
    maxX: outPort.x,
    maxY: OUT_HALF,
    width: outPort.x - inPort.x,
    height: OUT_HALF * 2,
  });

  addBodyText(group, -34, -4, String(options.config.inputBits), options, {
    fontSize: 9,
    align: "center",
    width: 12,
  });
  addBodyText(group, 34, -4, String(options.config.outputBits), options, {
    fontSize: 9,
    align: "center",
    width: 12,
  });
  addBodyText(group, -20, 16, options.config.isSigned ? "signed" : "zero", options, {
    fontSize: 7,
    align: "center",
    width: 40,
  });

  // Flow arrow from the input width toward the output width.
  group.add(
    new Konva.Line({
      points: [-16, 4, 10, 4],
      stroke: options.theme.text,
      strokeWidth: 1.2,
      listening: false,
    })
  );
  group.add(
    new Konva.Line({
      points: [14, 4, 7, 0, 7, 8],
      closed: true,
      fill: options.theme.text,
      listening: false,
    })
  );

  return { width: outPort.x - inPort.x, height: OUT_HALF * 2 };
}
