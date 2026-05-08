/**
 * @layer domain
 * @unit validator-system
 *
 * DesignDocumentPort — 設計文書構造化データ読み取り（L4-001, L4-002）
 */

export interface DesignDocumentConcept {
  readonly name: string;
  readonly type: 'class' | 'interface' | 'type' | 'value-object' | 'service';
  readonly pointers?: readonly string[];
}

export interface StructuredDesignDoc {
  readonly unitName: string;
  readonly docPath: string;
  readonly concepts: readonly DesignDocumentConcept[];
  readonly layerDependencies: readonly { from: string; to: string }[];
  readonly adrRefs: readonly string[];
}

export interface DesignDocumentPort {
  loadDesignDocuments(targetUnits?: readonly string[]): Promise<readonly StructuredDesignDoc[]>;
  /** ConsistencyCheckService用: 文書のレイヤーアノテーション取得 */
  getLayerAnnotations?(targetDocs?: readonly string[]): Promise<Record<string, string>>;
  /** DriftDetectionService用: 要素名一覧取得 */
  getElements?(targetUnits?: readonly string[]): Promise<string[]>;
  /** DriftDetectionService用: 設計要素から対応する実装ファイルへの明示ポインタ */
  getElementPointers?(targetUnits?: readonly string[]): Promise<Record<string, readonly string[]>>;
}
