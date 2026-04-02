# ドメインモデル設計計画: adr-foundation

## 1. スコープ

- **対象Unit**: adr-foundation（H-05 ADR基盤）
- **担当ストーリー**: H05-01（テンプレート+archgate）, H05-02（初期11件ADR）, H05-03（ステータス管理+フロントマターバリデーション）
- **他Unitとの境界**:
  - harness-error: adr_refフィールドの参照先としてADRファイルを提供
  - ci-governance: ADRリンクとarchgate検証の基盤を提供
  - validator-system: archgateマッピングに基づくADR-HarnessError紐付け情報を提供

## 2. 集約候補の分析

### ストーリーから抽出した業務名詞

| 名詞 | 出現ストーリー | 分類 |
|------|-------------|------|
| ADR | H05-01, H05-02, H05-03 | ✅ **集約**（ADRのライフサイクル管理） |
| AdrId | H05-01 | 値オブジェクト（ADR識別子） |
| AdrStatus | H05-03 | 値オブジェクト（Proposed/Accepted/Deprecated/Superseded） |
| AdrFrontmatter | H05-01, H05-03 | 値オブジェクト（YAMLフロントマター。archgateフィールド含む） |
| AdrBody | H05-01 | 値オブジェクト（本文構造） |
| ArchgateMapping | H05-01 | 値オブジェクト（ADR→HarnessError codeマッピング。ADRフロントマターに埋め込み） |
| SupersededByRef | H05-03 | 値オブジェクト（後継ADR参照） |
| AdrFilePath | H05-01 | 値オブジェクト（ファイルパス。Unit内ローカル） |

### 集約候補と根拠

1. **ADR（集約ルート）**: v0と同様。ADRは独立したライフサイクル（Proposed→Accepted→Deprecated/Superseded）を持ち、フロントマター+本文で構成される整合性境界

### v0 adr-documentationからの変更点

- **追加**: ArchgateMapping値オブジェクト（ADR→HarnessError codeマッピング）
- **変更**: AdrFrontmatterにarchgateフィールド（オプショナル）を追加
- **維持**: ADR集約のステータス遷移モデルはv0と同等

## 3. 設計方針

- **v0踏襲**: ADR集約の基本構造（エンティティ、値オブジェクト、状態遷移）はv0をベースに、archgate拡張のみを追加
- **archgateパターン**: ArchgateMappingはAdrFrontmatterの一部として定義。機械可読なJSON形式でADR→HarnessError codeの対応を表現。逆引き用のarchgate-registryは生成物として別途作成可能
- **ステータス遷移**: v0の遷移表を維持（Proposed→Accepted→Deprecated/Superseded + Deprecated→Proposed例外遷移）
- **フロントマターバリデーション**: AdrValidationServiceがフロントマターの構造検証（必須フィールド存在、status有効値、Superseded時のsuperseded_by必須）を実行
- **adr_ref表記規約**: `ADR-{nnn}`形式（例: ADR-001）で統一。frontmatter上のadr_idと外部参照表記の対応を明文化
- **採番**: v1は001から開始。v0参照は「AIDLC ADR-XXX」として外部参照

## 4. QA（不明点・確認事項）

### [Question] Q1: archgateフィールドのスキーマ

Unit定義にarchgateマッピングの形式として`{ adr_id, enforced_by: [{ validator_id, error_code }] }`が示されている。これをADRフロントマターに埋め込むか、別ファイル（archgate-registry.json等）で一元管理するか？

**決定**: ADRフロントマターに埋め込む。ADRと強制ルールの紐付けが1ファイルで完結。必要に応じてarchgate-registryを自動生成物として持つ。

[Answer] codexレビュー合意: フロントマター埋め込みが真実の所在として自然。逆引き用registryは生成物として持つ。

### [Question] Q2: 初期11件ADRの採番

v0では001から開始していた。v1で新規作成する11件のADR番号は001から始めるか、v0の続番から始めるか？

**決定**: 001から開始。v1は新規プロダクト（Phasegate）であり、v0（AIDLC Harness）とは別のADR体系。v0参照は「AIDLC ADR-XXX」で明示的に分離。

[Answer] codexレビュー合意: 別プロダクトとして001開始が妥当。

## 5. 前提条件・リスク

- **v0ドメインモデルの再利用**: v0 adr-documentationのドメインモデルはほぼそのまま再利用可能。archgate拡張のみが差分
- **ADRフロントマターの安定性**: ci-governanceとharness-errorが参照するため、フロントマタースキーマの変更は波及範囲大
- **11件ADRの内容品質**: §12 Key Decisionsの内容をADRフォーマットに適切に変換する品質が重要
- **adr_ref表記の統一**: `ADR-{nnn}`形式をShared Kernel利用側に周知
