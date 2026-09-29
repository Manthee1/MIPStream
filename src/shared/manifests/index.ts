/** @format */

import { AdderManifest } from "./adder";
import { ExtenderManifest } from "./extender";
import { LogicGateManifest } from "./logic";
import { MuxManifest } from "./mux";
import { ShifterManifest } from "./shifter";

/**
 * Registry of all standard hardware module manifests.
 */
export const StandardManifests = [
  AdderManifest,
  ExtenderManifest,
  LogicGateManifest,
  MuxManifest,
  ShifterManifest,
];

export * from "./adder";
export * from "./extender";
export * from "./logic";
export * from "./mux";
export * from "./shifter";
