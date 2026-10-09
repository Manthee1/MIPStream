/** @format */

import { registerManifest } from "./manifestRegistry";
import { StandardManifests } from "./manifests";

/**
 * Initializes the manifest registry with all standard components.
 */
export function initStandardManifests() {
  for (const manifest of StandardManifests) {
    registerManifest(manifest);
  }
}
