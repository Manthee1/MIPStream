import { registerManifest } from "./manifestRegistry";
import {
  MuxManifest,
  AdderManifest,
  ShifterManifest,
  ExtenderManifest,
  LogicGateManifest,
} from "./manifests";

/**
 * Initializes the manifest registry with all standard components.
 */
export function initStandardManifests() {
  registerManifest(MuxManifest);
  registerManifest(AdderManifest);
  registerManifest(ShifterManifest);
  registerManifest(ExtenderManifest);
  registerManifest(LogicGateManifest);
}
