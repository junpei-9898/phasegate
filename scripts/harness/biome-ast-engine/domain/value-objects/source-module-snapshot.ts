/**
 * @layer domain
 * @unit biome-ast-engine
 */

import { FilePath } from './file-path.js';
import { ImportEdge } from './import-edge.js';
import { LayerName } from './layer-name.js';

type SourceModuleSnapshotProps = {
  readonly filePath: FilePath;
  readonly declaredUnit: string | null;
  readonly declaredLayer: LayerName | string | null;
  readonly imports: readonly ImportEdge[];
  readonly anyTypeCount: number;
  readonly typedNodeCount: number;
  readonly commentLineCount: number;
  readonly logicalLineCount: number;
  readonly repeatedCommentBlocks: number;
  readonly duplicationFingerprints: readonly string[];
  readonly exportedSymbols: readonly string[];
  readonly isEntrypointCandidate: boolean;
};

const ensureNonNegative = (value: number, label: string): number => {
  if (value < 0) {
    throw new Error(`${label} must be greater than or equal to zero`);
  }

  return value;
};

const normalizeDeclaredLayer = (value: LayerName | string | null): LayerName | null => {
  if (value === null) {
    return null;
  }

  if (value instanceof LayerName) {
    return value;
  }

  if (typeof value === 'string') {
    return LayerName.tryFromString(value);
  }

  return null;
};

export class SourceModuleSnapshot {
  readonly filePath: FilePath;
  readonly declaredUnit: string | null;
  readonly declaredLayer: LayerName | null;
  readonly imports: readonly ImportEdge[];
  readonly anyTypeCount: number;
  readonly typedNodeCount: number;
  readonly commentLineCount: number;
  readonly logicalLineCount: number;
  readonly repeatedCommentBlocks: number;
  readonly duplicationFingerprints: readonly string[];
  readonly exportedSymbols: readonly string[];
  readonly isEntrypointCandidate: boolean;
  readonly hasRawLayerAnnotation: boolean;

  private constructor(props: Omit<SourceModuleSnapshotProps, 'declaredLayer'> & { declaredLayer: LayerName | null; hasRawLayerAnnotation: boolean }) {
    this.filePath = props.filePath;
    this.declaredUnit = props.declaredUnit;
    this.declaredLayer = props.declaredLayer;
    this.imports = props.imports;
    this.anyTypeCount = props.anyTypeCount;
    this.typedNodeCount = props.typedNodeCount;
    this.commentLineCount = props.commentLineCount;
    this.logicalLineCount = props.logicalLineCount;
    this.repeatedCommentBlocks = props.repeatedCommentBlocks;
    this.duplicationFingerprints = props.duplicationFingerprints;
    this.exportedSymbols = props.exportedSymbols;
    this.isEntrypointCandidate = props.isEntrypointCandidate;
    this.hasRawLayerAnnotation = props.hasRawLayerAnnotation;
  }

  static create(props: SourceModuleSnapshotProps): SourceModuleSnapshot {
    const declaredLayer = normalizeDeclaredLayer(props.declaredLayer);

    return Object.freeze(
      new SourceModuleSnapshot({
        filePath: props.filePath,
        declaredUnit: props.declaredUnit,
        declaredLayer,
        hasRawLayerAnnotation: props.declaredLayer !== null,
        imports: Object.freeze([...props.imports]),
        anyTypeCount: ensureNonNegative(props.anyTypeCount, 'anyTypeCount'),
        typedNodeCount: ensureNonNegative(props.typedNodeCount, 'typedNodeCount'),
        commentLineCount: ensureNonNegative(props.commentLineCount, 'commentLineCount'),
        logicalLineCount: ensureNonNegative(props.logicalLineCount, 'logicalLineCount'),
        repeatedCommentBlocks: ensureNonNegative(
          props.repeatedCommentBlocks,
          'repeatedCommentBlocks'
        ),
        duplicationFingerprints: Object.freeze([...props.duplicationFingerprints]),
        exportedSymbols: Object.freeze([...props.exportedSymbols]),
        isEntrypointCandidate: props.isEntrypointCandidate,
      })
    );
  }

  hasUnitComment(): boolean {
    return this.declaredUnit !== null;
  }

  hasLayerComment(): boolean {
    return this.hasRawLayerAnnotation;
  }

  anyRatio(): number {
    if (this.typedNodeCount === 0) {
      return 0;
    }

    return this.anyTypeCount / this.typedNodeCount;
  }

  commentDensity(): number {
    if (this.logicalLineCount === 0) {
      return 0;
    }

    return this.commentLineCount / this.logicalLineCount;
  }

  belongsToLayerDirectory(): boolean {
    if (this.declaredLayer === null) {
      return false;
    }

    return this.filePath.segments().includes(this.declaredLayer.toPathSegment());
  }
}
