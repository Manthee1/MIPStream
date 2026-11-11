/** @format */

import type Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "../../types/manifest";
import type { DataMemoryConfig } from "./index";
import {
  addBodyText,
  addFoldedMemoryBody,
  addModuleLabel,
  portPosition,
} from "../draw-helpers";

/** Folded-corner memory block with classic Address/Data pin names. */
export function drawDataMemoryBody(
  group: Konva.Group,
  options: ModuleRenderOptions<DataMemoryConfig>
): ModuleRenderOutput {
  const addr = portPosition(options.ports, "addr");
  const wd = portPosition(options.ports, "wd");
  const rdata = portPosition(options.ports, "rdata");
  const memWrite = portPosition(options.ports, "memWrite");
  const memRead = portPosition(options.ports, "memRead");
  // Vertical extent: top clears the "Address" label above the topmost pin,
  // bottom lands exactly on the MemWrite/MemRead control pins.
  const bounds = addFoldedMemoryBody(group, options, -40, 55);
  // addModuleLabel(group, options, {
  //   ...bounds,

  // });

  // Add label to the center
  addBodyText(group, (bounds.minX + bounds.maxX) / 2 - 20, (bounds.minY + bounds.maxY) / 2 - 10, options.label, options, {
    fontSize: 10,
    bold: true,
    align: "center",
    width: 40,
  });


  addBodyText(group, addr.x + 8, addr.y - 5, "Address", options);
  addBodyText(group, wd.x + 8, wd.y - 5, "Write data", options);
  addBodyText(group, rdata.x - 54, rdata.y - 5, "Read data", options, {
    align: "right",
    width: 48,
  });
  addBodyText(group, memWrite.x - 20, memWrite.y + 6, "MemWrite", options, { width: 40 });
  addBodyText(group, memRead.x-20, memRead.y + 6, "MemRead", options, { width: 40 });

  return { width: bounds.width, height: bounds.height };
}
