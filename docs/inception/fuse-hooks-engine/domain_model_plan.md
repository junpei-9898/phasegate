# ドメインモデル設計計画: fuse-hooks-engine

## 1. スコープ
- **対象Unit**: fuse-hooks-engine（HF1-01〜HF1-05）
- **担当ストーリー**: .harness-hooks.yml定義ロード / FUSEパススルー+PreWrite / PreReadブロック / シェルラッパー / 完了ゲート
- **他Unitとの境界**: harness-error（HarnessError読取専用）、config-foundation（HarnessConfigV2読取専用）、traceability-model（StoryId参照）

## 2. 集約候補の分析

### ストーリーから抽出した業務名詞一覧
| 業務名詞 | 抽出元ストーリー | 分類候補 |
|---------|----------------|---------|
| HookDefinition | HF1-01 | 集約ルート |
| FUSEMount | HF1-02 | エンティティ |
| CompletionGate | HF1-05 | エンティティ |
| HookType | HF1-01 | 値オブジェクト |
| FilePattern | HF1-01 | 値オブジェクト |
| HookAction | HF1-01 | 値オブジェクト |
| MagicFile | HF1-05 | 値オブジェクト |
| ProtectedResourceList | HF1-03 | 値オブジェクト |
| DestructiveCommandList | HF1-04 | 値オブジェクト |
| HookYamlConfig | HF1-01 | 値オブジェクト |
| HookEvaluationService | HF1-02 | ドメインサービス |

### 集約候補とその根拠
1. **HookDefinition（集約ルート）**: HookType×HookActionの複合整合性（INV-4/INV-5）を保証。YAMLから都度生成、永続化なし
2. **FUSEMount（エンティティ）**: mounted/unmounted/fallback状態管理。mountPathが識別子
3. **CompletionGate（エンティティ）**: pending→checking→passed/failed状態遷移。storyIdが識別子、永続化あり

## 3. 設計方針
- **集約の粒度**: 3集約（HookDefinition/FUSEMount/CompletionGate）を維持。横断契約§6の降格方針に照らし、HookDefinitionは複合整合性があるため集約ルートを維持
- **VO vs エンティティ判断基準**: 状態遷移・識別性がなければVO。HookType/FilePattern/HookAction等はすべて不変・値等価性あり→VO
- **Shared Kernelとの関係**: HarnessError/HarnessConfigV2を読取専用で消費。StoryIdをtraceability-modelから参照
- **FuseHandlerPortはスタブ設計**: 実FUSEバインディングなし、テスタビリティ優先

## 4. 既存ドメインモデルの品質評価と補完方針

### 既存doc（agent作成）の評価
- Ownership/Import-Export: ✅ 完備
- Aggregate Boundary分析: ✅ 根拠明確
- Model Classification: ✅ 完備
- Port Interfaces: ✅ 5ポート定義済み
- Domain Rules/Invariants: ✅ INV-1〜13定義済み
- Data Flow: ✅ 全ストーリーのフロー記述あり
- 設計判断記録: ✅ D1〜D6
- engineering-perspective評価: ✅ SOLID/スメルチェック済み

### 補完が必要な項目
1. **ドメインイベント定義**: 未定義 → Phase 2で追加
2. **Mermaidクラス図**: 未作成 → Phase 2で追加

## 5. QA（不明点・確認事項）

なし（Unit定義・統合契約から十分な情報が得られている）

## 6. 前提条件・リスク
- FuseHandlerPortはスタブ設計のため、実FUSEテストは不可
- CompletionGateの状態遷移テストが設計の妥当性検証の要
