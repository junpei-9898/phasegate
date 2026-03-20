/**
 * @layer application
 * @unit biome-ast-engine
 */

export type ExecuteLintInput = {
  readonly targets?: readonly string[];
  readonly includeBiomeNative?: boolean;
};
