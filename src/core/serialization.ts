import { ArchitectureConfig, SerializedNet } from "@/types/architecture";
import { HydratedModule, SerializedModule } from "@/types/manifest";
import { hydrateModule } from "./manifestRegistry";

/**
 * Converts a live diagram state into a serializable configuration.
 * Strips runtime-only data like evaluation functions.
 */
export function serializeArchitecture(
  modules: HydratedModule[],
  nets: SerializedNet[]
): ArchitectureConfig {
  return {
    modules: modules.map(m => ({
      id: m.id,
      typeId: m.typeId,
      position: m.position,
      rotation: m.rotation,
      config: m.config,
    })),
    nets: JSON.parse(JSON.stringify(nets)), // Ensure deep copy of the net tree
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
