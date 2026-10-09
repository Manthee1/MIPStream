/** @format */

import type Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "../../types/manifest";
import type { SplitterConfig } from "./index";
import { addBodyText, addModuleLabel, addRectBody, portPosition } from "../draw-helpers";

/** Bit-range annotations ([hi:lo]) beside each output pin, MSB-first. */
export function drawSplitterBody(
  group: Konva.Group,
  options: ModuleRenderOptions<SplitterConfig>
): ModuleRenderOutput {
  const inPos = portPosition(options.ports, "in");
  const bounds = addRectBody(group, options);
  addModuleLabel(group, options, bounds);

  const outputs = options.ports.filter((port) => port.direction === "output");
  let hi = options.config.inputBits - 1;
  for (const port of outputs) {
    const lo = hi - port.bits + 1;
    const pos = portPosition(options.ports, port.id);
    addBodyText(group, pos.x - 52, pos.y - 5, `[${hi}:${lo}]`, options, {
      align: "right",
      width: 46,
    });
    hi = lo - 1;
  }

  addBodyText(group, inPos.x + 8, inPos.y - 5, "In", options, { width: 16 });

  return { width: bounds.width, height: bounds.height };
}
