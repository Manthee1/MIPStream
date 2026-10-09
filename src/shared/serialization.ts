/** @format */

import { ArchitectureConfig, ArchitectureConfiguration } from "./types/architecture";
import type { SerializedModule, HydratedModule } from "./types/manifest";
import type { SerializedNet } from "./types/netlist";
import { hydrateModule } from "./manifestRegistry";

/**
 * Converts a live diagram state into a serializable configuration.
 * Strips runtime-only data like evaluation functions. Hydrated modules are
 * accepted directly — their runtime extras are picked away.
 */
export function serializeArchitecture(
  name: string,
  description: string,
  modules: SerializedModule[],
  nets: SerializedNet[],
  configuration: ArchitectureConfiguration
): ArchitectureConfig {
  return {
    name,
    description,
    modules: modules.map((module) => ({
      designator: module.designator,
      typeId: module.typeId,
      position: { x: module.position.x, y: module.position.y },
      rotation: module.rotation,
      config: JSON.parse(JSON.stringify(module.config ?? {})),
    })),
    nets: JSON.parse(JSON.stringify(nets ?? [])), // Deep copy of the net tree
    configuration: JSON.parse(JSON.stringify(configuration ?? {})),
  };
}

/**
 * Restores a live diagram state from a serialized configuration.
 * Rehydrates all modules by resolving them against the manifest registry.
 */
export function deserializeArchitecture(config: ArchitectureConfig): {
  modules: HydratedModule[];
  nets: SerializedNet[];
} {
  const modules = (config.modules ?? []).map((module) => hydrateModule(module));
  return {
    modules,
    nets: config.nets ?? [],
  };
}
