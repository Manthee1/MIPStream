import { 
  ModuleManifest, 
  SerializedModule, 
  HydratedModule, 
  PortDefinition 
} from "./types/manifest";

const manifestRegistry = new Map<string, ModuleManifest>();

/**
 * Registers a module manifest in the global registry.
 */
export function registerManifest(manifest: ModuleManifest) {
  manifestRegistry.set(manifest.typeId, manifest);
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
