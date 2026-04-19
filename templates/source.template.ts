// @unit <UNIT_NAME>
// @layer <LAYER>

/**
 * phasegate ソースファイルテンプレート
 *
 * 使い方:
 *   1. `<UNIT_NAME>` を `docs/product/construction/` 配下の Unit ID に置換
 *      （例: traceability-model, harness-api）
 *   2. `<LAYER>` を以下のいずれかに置換
 *      - domain         : Entity / ValueObject / Port / Domain Service
 *      - application    : UseCase / DTO / Application Service
 *      - infrastructure : Gateway / Adapter（外部 I/O 接続）
 *      - presentation   : CLI Handler / Controller / Formatter
 *   3. 配置ディレクトリと `@layer` 値を一致させる（L1-004 ルール）
 *
 * このメタデータは L1 Biome ルール（L1-001 / L1-002）で検証される。
 */
