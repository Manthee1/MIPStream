import { registerManifest } from "./manifestRegistry";
import { MuxManifest } from "./manifests/mux";
import { AdderManifest } from "./manifests/adder";
import { ShifterManifest } from "./manifests/shifter";
import { ExtenderManifest } from "./manifests/extender";
import { LogicGateManifest } from "./manifests/logic";

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
