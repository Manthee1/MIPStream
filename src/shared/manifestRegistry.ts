import {
  ModuleManifest,
  SerializedModule,
  HydratedModule,
  PortDefinition,
  ModuleCategory
} from "./types/manifest";

const manifestRegistry = new Map<string, ModuleManifest>();
export const moduleCategories : ModuleCategory[] = ["logic", "memory", "iO", "custom"]

/**
 * Registers a module manifest in the global registry.
 */
export function registerManifest(manifest: ModuleManifest) {
  manifestRegistry.set(manifest.typeId, manifest);
}

/**
 * Retrieves a module manifest by its typeId.
 * @param typeId The unique identifier of the module type.
 * @returns The corresponding ModuleManifest or undefined if not found.
 */
export function getManifest(typeId: string): ModuleManifest | undefined {
  return manifestRegistry.get(typeId);
}


/**
 * Retrieves all registered module manifests.
 * @returns An array of all ModuleManifest objects in the registry.
 */
export function getAllManifests(): ModuleManifest[] {
  return Array.from(manifestRegistry.values());
}

/**
 * Resolves a serialized module instance against its manifest.
 * Rehydrates ports and evaluation functions on demand.
 */
export function hydrateModule(instance: SerializedModule): HydratedModule {
  const manifest = manifestRegistry.get(instance.typeId);

  if (!manifest) {
    throw new Error(`Manifest not found for typeId: ${instance.typeId}`);
  }

  // Merge user config with defaults
  const config = { ...manifest.defaultConfig, ...instance.config };

  // Resolve ports and handle visual label overrides
  const basePorts = manifest.generatePorts(config);
  const ports: PortDefinition[] = basePorts.map(port => {
    // Check if user config provides a label override for this specific port ID
    // We expect instance.config.portLabels to be an optional Record<string, string>
    const overrideLabel = instance.config.portLabels?.[port.id];
    return {
      ...port,
      label: overrideLabel || port.label
    };
  });

  // Create evaluation closures
  const evaluators = manifest.createEvaluators(config);

  return {
    ...instance,
    manifest,
    config, // Resolved config
    ports,
    evaluators
  };
}
