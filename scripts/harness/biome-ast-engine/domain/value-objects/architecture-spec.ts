/**
 * @layer domain
 * @unit biome-ast-engine
 */

export type ArchitectureSpec = {
  readonly layers: readonly string[];
  readonly allowedDependencies: Readonly<Record<string, readonly string[]>>;
};

const freezeDependencyMap = (
  map: Record<string, readonly string[]>
): Readonly<Record<string, readonly string[]>> => {
  const frozen: Record<string, readonly string[]> = {};

  for (const [key, value] of Object.entries(map)) {
    frozen[key] = Object.freeze([...value]);
  }

  return Object.freeze(frozen);
};

export const freezeArchitectureSpec = (spec: ArchitectureSpec): ArchitectureSpec => {
  return Object.freeze({
    layers: Object.freeze([...spec.layers]),
    allowedDependencies: freezeDependencyMap({ ...spec.allowedDependencies }),
  });
};

export const CLEAN_PRESET_SPEC: ArchitectureSpec = freezeArchitectureSpec({
  layers: ['domain', 'application', 'infrastructure', 'presentation'],
  allowedDependencies: {
    domain: ['domain'],
    application: ['application', 'domain'],
    infrastructure: ['infrastructure', 'application', 'domain'],
    presentation: ['presentation', 'application', 'domain'],
  },
});
