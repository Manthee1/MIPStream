/** @format */

import Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "../../types/manifest";
import type { RegisterConfig } from "./logic";
import {
  registerInputPortId,
  registerOutputPortId,
  registerPinLabel,
  resolveRegisterPins,
  RESET_PORT_ID,
} from "./logic";
import { addBodyText, addModuleLabel, addRectBody, portPosition } from "../draw-helpers";

/**
 * D-type register symbol: a sharp rectangle with the classic edge-trigger
 * triangle on the clocked side. The held value is the output net, owned by
 * the engine. Each configured pin draws its own input/output label pair;
 * the optional reset pin marks the top edge.
 */
export function drawStageRegisterBody(
  group: Konva.Group,
  options: ModuleRenderOptions<RegisterConfig>
): ModuleRenderOutput {
  const bounds = addRectBody(group, options);
  addModuleLabel(group, options, bounds);

  // Edge-trigger marker: triangle pointing into the body from the data edge.
  group.add(
    new Konva.Line({
      points: [bounds.minX + 3, -6, bounds.minX + 11, 0, bounds.minX + 3, 6],
      closed: true,
      fill: options.theme.bodyFill,
      stroke: options.theme.bodyStroke,
      strokeWidth: 1.2,
      listening: false,
    })
  );

  // Per-pin labels: the main pair keeps the classic D/Q; extra pins show
  // their label on both halves (the same signal before/after the edge).
  const pins = resolveRegisterPins(options.config);
  pins.forEach((pin, index) => {
    const d = portPosition(options.ports, registerInputPortId(pin, index));
    const q = portPosition(options.ports, registerOutputPortId(pin, index));
    const name = index === 0 ? undefined : registerPinLabel(pin, index);
    addBodyText(group, d.x + 8, d.y - 5, name ?? "D", options, { width: 12 });
    addBodyText(group, q.x - 20, q.y - 5, name ?? "Q", options, { align: "right", width: 12 });
  });

  // Optional synchronous reset pin marker beside the top port.
  const hasReset = options.config?.reset === true;
  if (hasReset) {
    const rst = portPosition(options.ports, RESET_PORT_ID);
    addBodyText(group, rst.x + 8, rst.y - 5, "R", options, { width: 10 });
  }

  // Managed pipeline boundary registers display their stage id ("IF/ID"),
  // shifted below the reset pin row when one is present.
  const stageId = options.config?.stageId;
  if (stageId) {
    const resetY = hasReset ? portPosition(options.ports, RESET_PORT_ID).y : -Infinity;
    addBodyText(group, 0, Math.max(bounds.minY + 4, resetY + 10), stageId, options, {
      align: "center",
      width: bounds.width,
      bold: true,
    });
  }

  return { width: bounds.width, height: bounds.height };
}
