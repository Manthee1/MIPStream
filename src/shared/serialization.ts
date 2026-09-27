import { ArchitectureConfig, ArchitectureConfiguration, SerializedNet } from "./types/architecture";
import { HydratedModule } from "./types/manifest";
import { hydrateModule } from "./manifestRegistry";

/**
 * Converts a live diagram state into a serializable configuration.
 * Strips runtime-only data like evaluation functions.
 */
export function serializeArchitecture(
  name: string,
  description: string,
  modules: HydratedModule[],
  nets: SerializedNet[],
  configuration: ArchitectureConfiguration
): ArchitectureConfig {
  return {
    name,
    description,
    modules: modules.map(m => ({
      id: m.id,
      typeId: m.typeId,
      position: m.position,
      rotation: m.rotation,
      config: m.config,
    })),
    nets: JSON.parse(JSON.stringify(nets)), // Ensure deep copy of the net tree
    configuration: JSON.parse(JSON.stringify(configuration)),
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
  const modules = config.modules.map(m => hydrateModule(m));
  return {
    modules,
    nets: config.nets || [],
  };
}
