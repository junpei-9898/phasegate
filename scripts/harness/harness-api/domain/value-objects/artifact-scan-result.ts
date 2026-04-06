// @layer domain
// artifact-scan-result.ts — ArtifactScanResult Value Object

import type { LayerHealth, LayerId } from './layer-health.js';

export interface ArtifactPresence {
  artifactType?: string;
  layer?: LayerId | string;
  layerId?: LayerId | string;
  present: boolean;
  path?: string | null;
  lastModified?: string;
}

export interface ArtifactScanResultProps {
  scannedPaths: readonly string[];
  foundArtifacts: readonly ArtifactPresence[];
  derivedLayerHealth: readonly LayerHealth[];
}

export class ArtifactScanResult {
  readonly scannedPaths: readonly string[];
  readonly foundArtifacts: readonly ArtifactPresence[];
  readonly derivedLayerHealth: readonly LayerHealth[];

  private constructor(props: ArtifactScanResultProps) {
    this.scannedPaths = Object.freeze([...props.scannedPaths]);
    this.foundArtifacts = Object.freeze([...props.foundArtifacts]);
    this.derivedLayerHealth = Object.freeze([...props.derivedLayerHealth]);
    Object.freeze(this);
  }

  static create(props: ArtifactScanResultProps): ArtifactScanResult {
    return new ArtifactScanResult(props);
  }
}
