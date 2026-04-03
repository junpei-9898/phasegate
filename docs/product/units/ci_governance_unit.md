# Unit定義: ci-governance

> **Unit ID**: ci-governance
> **作成日**: 2026-03-12
> **Wave**: 3（拡張・運用・保証）
> **対応Epic**: H-13 Scheduled Governance & CI/CDテンプレート

---

## 1. 概要

CI/CDテンプレート（aidlc-gate.yml、consistency-check.yml、.husky/pre-commit）の整備、反復エラーの自動エスカレーション、AGENTS.mdのポインタ型移行を担当するUnit。品質ゲートをCIパイプラインとgitフックに標準的に組み込み、運用フェーズでの品質維持を自動化する。

v0には対応するUnitが存在しない新規Unitである。v0ではCI/CDテンプレートが標準化されておらず、AGENTS.mdの管理がharness-dx（現harness-error）に含まれていた。v1ではCI/CDテンプレートの標準化、反復エラー検出による「スタック状態」の自動検出、AGENTS.mdのポインタ型移行による肥大化防止を、独立したUnitとして体系化する。

**Cross-Unit Contract**: 本UnitはAGENTS.md Schemaを所有する。skill-qualityが出力するlesson artifactを消費し、AGENTS.mdに集約・反映する責務を持つ。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| H13-01 | CI/CDテンプレート | Must |
| H13-02 | 反復エラー自動エスカレーション | Should |
| H13-03 | AGENTS.mdポインタ型移行 | Should |

---

## 3. 機能要件

### 3.1 CI/CDテンプレート（H13-01）

- `aidlc-gate.yml`テンプレートの作成。PR時にL1-L3バリデータを実行
- `consistency-check.yml`テンプレートの作成。週次でL4バリデータを実行
- `.husky/pre-commit`テンプレートの作成。commit時にL2バリデータを実行
- 各テンプレートがphasegate.config.jsonのプリセット設定を参照

### 3.2 反復エラー自動エスカレーション（H13-02）

- 同一HarnessError codeの繰り返し（閾値: 3回以上）の検出
- 反復検出時の自動エスカレーション（ログ出力 + 警告メッセージ）の実行
- エスカレーション閾値のphasegate.config.jsonによる設定
- 反復検出のリセット条件（エラー解消時）の定義

### 3.3 AGENTS.mdポインタ型移行（H13-03）

- AGENTS.mdの記述的バリデータ一覧を`phasegate:status`実行へのポインタに置換
- AGENTS.mdへのADR参照リンクの追加
- 移行前と比較して行数50%以上の削減
- ポインタが参照する先（コマンド、ファイル）の実在性検証
- skill-qualityから出力されたlesson artifactのAGENTS.mdへの集約・反映

---

## 4. ドメインモデル概要

- **CiTemplate（集約ルート）**: CI/CDテンプレートの生成・Preset連動を統括
  - `templateType`: テンプレート種別（aidlc-gate / consistency-check / husky-pre-commit）
  - `targetLayers`: 実行対象レイヤー（L1-L3 / L4 / L2）
  - `presetRef`: 参照するプリセットID
- **TemplateConfig（値オブジェクト）**: テンプレートごとのバリデータ実行設定（対象バリデータID一覧、トリガー条件）
- **ErrorRepetition（集約ルート）**: 同一エラーコードの繰り返し検出・エスカレーション判定を統括
  - `code`: 対象HarnessError.codeフィールドと一致する検出対象コード
  - `occurrenceCount`: 発生回数
  - `threshold`: エスカレーション閾値（デフォルト: 3）
  - `escalated`: エスカレーション済みフラグ
- **EscalationAction（値オブジェクト）**: エスカレーション時のアクション定義（ログレベル、メッセージテンプレート）
- **RepetitionResetCondition（値オブジェクト）**: リセット条件定義（エラー解消時にoccurrenceCountをリセット）
- **AgentsMdPointer（集約ルート）**: AGENTS.mdのポインタ型構造を統括
  - `pointers`: ポインタ一覧（コマンドポインタ / ファイルポインタ）
  - `adrLinks`: ADR参照リンク一覧
- **PointerEntry（値オブジェクト）**: 個別ポインタ定義（参照先タイプ: command / file、参照先パス/コマンド名）
- **PointerValidator（ドメインサービス）**: ポインタ参照先の実在性検証ロジック
- **LessonAggregator（ドメインサービス）**: skill-qualityからのlesson artifactを読み取り、AGENTS.mdに構造化された形式で集約・反映するロジック
- **RepetitionDetector（ドメインサービス）**: HarnessErrorの発生履歴管理・閾値判定ロジック
- **TemplateGenerator（ドメインサービス）**: Preset設定からCI/CDテンプレートのバリデータ実行設定を導出するロジック

---

## 5. 外部依存

### 5.1 Shared Kernel参照

- **HarnessError型**（harness-errorが定義）: 反復エラー検出の対象フォーマット。errorCodeフィールドでの照合
- **HarnessConfigV2型**（config-foundationが定義）: プリセット設定の参照、エスカレーション閾値の読み取り

### 5.2 Cross-Unit Contract

| 契約 | 役割 | 相手Unit | 内容 |
|------|------|---------|------|
| **AGENTS.md Schema** | 提供（所有） | regression-suite | AGENTS.mdの最終文書構造定義（ポインタ型） |
| **LessonArtifact Schema** | 提供（所有） | skill-quality | lesson artifactのJSON構造定義。skill-qualityがこのスキーマに準拠してartifactを出力 |
| **Harness API Response DTO** | 消費 | harness-api | `phasegate:status`の出力JSON構造。AGENTS.mdポインタの参照先 |
| **ADR Frontmatter Schema** | 消費 | adr-foundation | AGENTS.mdに追加するADR参照リンクの参照先ADR実在性検証 |
| **Validator ID Registry** | 消費 | validator-system | CI/CDテンプレートで実行するバリデータID一覧の参照 |
| **Preset ID Registry** | 消費 | config-foundation | テンプレートごとの有効レイヤー・バリデータ設定の導出 |
| **CLI Command Registry** | 消費 | harness-api | AGENTS.mdポインタが参照するCLIコマンドの実在性検証 |

---

## 6. 非交渉要件（K要件）対応

| K# | 要件 | 本Unitでの対応 |
|----|------|---------------|
| K1 | 4層防御モデル（L1-L4） | CI/CDテンプレートによりL1-L4バリデータのCIパイプライン・gitフックへの標準的な組み込みを実現 |
| K9 | Agent-Lesson System | skill-qualityからのlesson artifactをAGENTS.mdに集約・反映。AGENTS.md Schemaの所有によりlesson構造の一貫性を保証 |
| K13 | phasegate.config.json | CI/CDテンプレートがphasegate.config.jsonのプリセット設定を参照し、品質設定のSingle Source of Truthを維持 |

---

## 7. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| テンプレート | aidlc-gate.yml（PR検証ワークフロー） | 外部利用者（GitHub Actions） |
| テンプレート | consistency-check.yml（週次整合性チェック） | 外部利用者（GitHub Actions） |
| テンプレート | .husky/pre-commit（Pre-commitフック） | 外部利用者（git hook） |
| 型定義 | AGENTS.md Schema（AGENTS.md構造定義） | skill-quality（lesson artifact出力フォーマット） |
| モジュール | LessonAggregator（lesson artifact集約） | 内部利用（H13-03 AGENTS.mdポインタ型移行の一部として実行） |
| モジュール | RepetitionDetector（反復エラー検出） | 内部利用（H13-02 反復エラー自動エスカレーションの一部として実行） |
| データ | EscalationAction（エスカレーション結果） | regression-suite（K9回帰テスト対象） |

---

## 8. 実装上の制約・注意事項

- **CI/CDテンプレートのPreset連動**: 各テンプレートはphasegate.config.jsonのプリセット設定（minimal/standard/strict）に基づいて実行対象バリデータを動的に決定する。テンプレート内にバリデータID一覧をハードコードしない。Preset解決はconfig-foundationのPreset ID Registryを通じて行う
- **反復エラーの発生履歴管理**: エラー発生履歴は`.harness/error-history.json`等のローカルファイルで管理する。セッション間で永続化し、エラー解消時にリセットする。ファイルシステムベースの管理により、エージェント非依存性を維持
- **AGENTS.mdポインタ型の実在性検証**: ポインタが参照するコマンド（`phasegate:status`等）はharness-apiのCLI Command Registryに登録されていること、参照するファイルはファイルシステム上に存在することを検証する。Dead Pointer（参照先なし）を許容しない
- **lesson artifact集約のべき等性**: 同一lessonの重複集約を防止する。LessonAggregatorはlesson artifactのlessonIdで重複を検出し、既存エントリの更新または新規追加を判断する
- **AGENTS.md行数削減目標**: ポインタ型移行後のAGENTS.mdは移行前比50%以上の行数削減を達成すること。これは移行のKPIとして回帰テストで検証する
- **テンプレートの拡張性**: CI/CDテンプレートはGitHub Actions前提で作成するが、将来の他CIプラットフォーム対応（GitLab CI等）を考慮し、バリデータ実行部分をプラットフォーム非依存のスクリプト呼び出しに抽象化する
- **エスカレーション閾値のデフォルト値**: phasegate.config.jsonで未設定の場合、デフォルト閾値は3回。GSD由来機能のデフォルト無効原則に基づき、反復エラー検出機能自体はデフォルトで有効（検出は品質保証の基本機能）だが、外部通知（Issue作成等）はデフォルト無効
