# ISSUE-014 Wave 1: architecture preset schema 提案

## 位置づけ

ADR-015 で採択した「アーキテクチャスタイル preset 化」の**具体スキーマ提案**。本文書は Wave 2 以降（実装フェーズ）の設計入力となる。

- ADR: [ADR-015-architecture-preset.md](../../../ADR/ADR-015-architecture-preset.md)
- 起票: ISSUE-014（2026-04-23）
- Wave 1 状態: 🟢 **DRAFT → 本文書採択で CLOSED**

## 1. 新設セクション: `architecture`

`phasegate.config.json` のトップレベルに `architecture` キーを追加する。schema version を v2 → v3 に bump する。

### 1.0 schema version 識別戦略（重要）

既存 config に `$schemaVersion` フィールドは追加しない（無害変更を避ける）。代わりに loader 側で**構造検出**を行う:

```typescript
function detectSchemaVersion(config: unknown): 'v2' | 'v3' {
  if (typeof config === 'object' && config !== null && 'architecture' in config) {
    return 'v3';
  }
  return 'v2';
}
```

- v2 互換モードで読み込んだ場合、ローダー内部で `architecture: { preset: "clean" }` を合成して v3 内部表現に正規化する（ファイル書き換えなし）
- 明示移行 CLI（`phasegate migrate --schema v3`）は Wave 6 で提供
- 将来の v4 想定時には同じ構造検出パターンを踏襲（新規 top-level キーの有無で判別）

### 1.1 JSON Schema v3 断片

```json
{
  "architecture": {
    "type": "object",
    "additionalProperties": false,
    "required": ["preset"],
    "properties": {
      "preset": {
        "type": "string",
        "enum": ["clean", "strict-ddd", "onion", "hexagonal", "layered", "flat", "custom"]
      },
      "layers": {
        "type": "array",
        "items": {
          "type": "string",
          "pattern": "^[a-z][a-z0-9-]*$",
          "minLength": 1
        },
        "uniqueItems": true,
        "minItems": 1
      },
      "allowedDependencies": {
        "type": "object",
        "additionalProperties": {
          "type": "array",
          "items": {
            "type": "string",
            "pattern": "^[a-z][a-z0-9-]*$"
          },
          "uniqueItems": true
        }
      },
      "metadataTags": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "layer": {
            "type": "string",
            "pattern": "^@[a-z][a-zA-Z0-9]*$",
            "default": "@layer"
          },
          "unit": {
            "type": "string",
            "pattern": "^@[a-z][a-zA-Z0-9]*$",
            "default": "@unit"
          }
        }
      },
      "layerDetection": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "byPath": { "type": "boolean", "default": true },
          "byTag":  { "type": "boolean", "default": true }
        }
      }
    },
    "allOf": [
      {
        "if": { "properties": { "preset": { "const": "custom" } }, "required": ["preset"] },
        "then": { "required": ["preset", "layers", "allowedDependencies"] }
      }
    ]
  }
}
```

### 1.2 下位互換ルール

| ケース | 挙動 |
|---|---|
| `architecture` セクション未指定 | `preset: "clean"` を暗黙適用（v2 互換モード） |
| `preset` のみ指定（`clean / strict-ddd / onion / hexagonal / layered / flat`） | preset から `layers` / `allowedDependencies` を注入 |
| **preset + 明示 `layers` / `allowedDependencies` 併記**（`custom` 以外） | **明示値が preset 既定を override**。partial override 可（`layers` のみ明示なら `allowedDependencies` は preset 既定） |
| `preset: "custom"` 指定 | `layers` と `allowedDependencies` が**必須**、未指定は schema validation error |
| `metadataTags` 未指定 | `@layer` / `@unit` を既定適用 |
| `layerDetection` 未指定 | `byPath: true, byTag: true` を既定適用 |

### 1.3 semantic validation（JSON Schema では validate できない制約）

`custom` preset および preset + 明示 override 時には、JSON Schema を通過した後に追加検証を行う（Wave 3 で loader に実装）:

| 制約 | ルール | 違反時 |
|---|---|---|
| **C1: 層名の自己参照** | `allowedDependencies[X]` は必ず `X` 自身を含む（同層内の import を許容するため） | Loader が自動補完（warn ログ）または error（Wave 3 で決定） |
| **C2: allowedDependencies キーの整合** | `allowedDependencies` のすべてのキーは `layers` 配列に含まれる | Validation error |
| **C3: allowedDependencies 値の整合** | `allowedDependencies[X]` の各要素は `layers` 配列に含まれる（typo 検出） | Validation error |
| **C4: 全 layer のカバレッジ** | `layers` の全要素が `allowedDependencies` のキーに存在する（silent な「依存不可」層の検出） | Loader が自動補完（該当 layer に空配列 + 自己参照）または warn（Wave 3 で決定） |
| **C5: 循環依存の許容判定** | A→B かつ B→A が同時許容される custom config は warn（典型的な設計 smell） | Warn（Wave 3 で決定） |

これら semantic validation の具体挙動（自動補完 vs error vs warn）は Wave 3 で決定する。Wave 1 時点では「存在を認識する」ことが目的。

### 1.4 既存 schema v2 からのマイグレーション

- **自動**: `phasegate.config.json` の読み込み時、`architecture` キーが無ければ内部で clean デフォルトを合成（ファイル書き換え無し）
- **明示移行（推奨）**: `npx phasegate migrate --schema v3` で `architecture: { preset: "clean" }` を末尾に追記（Wave 6 で CLI 提供予定）
- **v0.85.0 以前からの upgrade 注意**: ADR-014（v0.86.0）で `clean` の既定が `presentation → domain` 許容に変化済み。当時の厳格 DDD 挙動を維持したい PJ は `architecture.preset: "strict-ddd"` を明示する必要がある

## 2. preset 定義（7 種）

### 2.1 `clean`（default）

```json
{
  "layers": ["domain", "application", "infrastructure", "presentation"],
  "allowedDependencies": {
    "domain":         ["domain"],
    "application":    ["application", "domain"],
    "infrastructure": ["infrastructure", "application", "domain"],
    "presentation":   ["presentation", "application", "domain"]
  }
}
```

- ADR-014 準拠（`presentation → domain` 許容）
- PhaseGate 自身が採用（dogfood）

### 2.2 `strict-ddd`（ADR-014 opt-out）

```json
{
  "layers": ["domain", "application", "infrastructure", "presentation"],
  "allowedDependencies": {
    "domain":         ["domain"],
    "application":    ["application", "domain"],
    "infrastructure": ["infrastructure", "application", "domain"],
    "presentation":   ["presentation", "application"]
  }
}
```

- Presentation → Domain 直接依存を禁じる厳格派
- DDD Layered の古典解釈に忠実

### 2.3 `onion`

```json
{
  "layers": ["domain", "application", "interface"],
  "allowedDependencies": {
    "domain":      ["domain"],
    "application": ["application", "domain"],
    "interface":   ["interface", "application", "domain"]
  }
}
```

- Jeffrey Palermo 版 Onion Architecture
- 3 層で infrastructure と presentation を `interface` に統合

### 2.4 `hexagonal`

```json
{
  "layers": ["core", "ports", "adapters"],
  "allowedDependencies": {
    "core":     ["core"],
    "ports":    ["ports", "core"],
    "adapters": ["adapters", "ports", "core"]
  }
}
```

- Alistair Cockburn 版 Ports & Adapters
- PhaseGate 自身の構造（ADR-005）は内部的に Hexagonal だが、phasegate.config では `clean` を名乗る（4 層で細分化しているため）

### 2.5 `layered`（MVC / N-tier）

```json
{
  "layers": ["controller", "service", "repository"],
  "allowedDependencies": {
    "controller": ["controller", "service"],
    "service":    ["service", "repository"],
    "repository": ["repository"]
  }
}
```

- Rails / Django 系 MVC PJ 向け
- `repository` が最下層（DB アクセス）、`controller` が最上層

### 2.6 `flat`

```json
{
  "layers": [],
  "allowedDependencies": {}
}
```

- 層概念なし。L1-001〜004 は自動無効化
- 小規模 CLI / script / プロトタイプ向け
- **`@layer` タグが残存するファイルの扱い**: `layers: []` のため任意の値が「未知の層」となる。Wave 4 の実装で以下の挙動を確定する方針（本文書では候補として記録）:
  - 案 A: **無視**（layer-related rule が無効なので tag があっても no-op）
  - 案 B: **warn**（legacy tag の存在を CI で可視化）
  - 案 C: **error**（config と実態の乖離を強制解消）
  - Wave 1 の推奨: **案 A（無視）** — flat preset の選定理由が「層強制したくない」である以上、残存 tag への error は本末転倒

### 2.8 preset が解決する `L1 rule enable` と user 上書きの優先順位

`flat` preset は L1-001〜004 を「preset レベルで無効化」する。ただし user が `layers.L1.rules["L1-001"]: "error"` を明示した場合、**user 明示設定を優先**する（preset より個別設定が強い）。整合性検査は Wave 4 で実装:

- preset 既定: L1-001〜004 = `off`（flat の場合）
- user 明示: L1-001 = `error` → 最終 `error`（user 勝ち）
- 矛盾を warn ログで可視化（「flat preset 下で L1-001 を有効化しています」）

### 2.7 `custom`

ユーザーが `layers` と `allowedDependencies` を明示宣言。§1.3 の semantic validation (C1〜C5) が適用される。特に self-loop（`X → X`）の自動補完か error かは Wave 3 で最終決定するが、本文書の推奨は **Wave 3 で自動補完 + warn ログ**（後方互換性を優先）。

## 3. metadataTags の挙動

### 3.1 既定（省略時）

```typescript
// @unit biome-ast-engine
// @layer domain
```

### 3.2 社内規約で `@tier` / `@module` 採用する PJ

```json
{
  "metadataTags": {
    "layer": "@tier",
    "unit":  "@module"
  }
}
```

```typescript
// @module billing
// @tier service
```

L1-001 `require-unit-comment` / L1-002 `require-layer-comment` は内部的に config の tag 文字列を参照してチェックする（Wave 2 で `LayerName` / `UnitName` 参照側の抽象化が必要）。

### 3.3 `@story` タグは本 issue スコープ外

テストファイルで使われる `@story HXX-XX` タグ（`story-implementor` / `quick-implementor` スキルで付与、`test-coverage-checker` / nyquist が集計に使用）は本 Wave の `metadataTags` に**含めない**。理由:

- `@story` は traceability-model Unit が管理する story catalog と紐付く概念で、アーキスタイルとは直交
- 社内規約で `@story` を別名（`@ticket`, `@jira`）にしたい要求が顕在化すれば別 issue で扱う
- 現状、`@story` は `traceability-model` / `skill-quality` に閉じて参照されており、preset 化による影響を受けない

### 3.4 `layerDetection` の precedence

| `byPath` | `byTag` | 挙動 |
|---|---|---|
| `true` | `true`（既定） | **tag を優先**、tag 欠落時は path から推論（例: `scripts/harness/x/domain/y.ts` → `@layer domain`） |
| `true` | `false` | path のみから推論。`@layer` tag は無視 |
| `false` | `true` | tag のみから判定。path は無視 |
| `false` | `false` | **無効な組み合わせ**。schema v3 ロード時 error（「少なくとも一方を有効化する必要がある」） |

tag と path が矛盾した場合（例: `infrastructure/adapters/x.ts` に `@layer domain` が付与）は、`byTag: true` なら tag 採用 + warn ログ。`byPath: true` のみなら path 採用。Wave 3 で loader に warn hook を実装。

## 4. Wave 分割（ADR-015 Decision を実装に落とす）

| Wave | スコープ | 推定 | 依存 |
|---|---|---|---|
| **Wave 1（本文書）** | ADR-015 起票、schema 提案、issue/status 更新 | 0.5d | — |
| **Wave 2** | `LayerName` VO を config 注入形式に改修、既存挙動を `clean` preset として維持。phasegate レポ自身の `phasegate.config.json` に `architecture: { preset: "clean" }` を明示追記（dogfood） | 1d | Wave 1 |
| **Wave 3** | `harness-config-v3.schema.json` を新設、`config-foundation` で構造検出による v2/v3 ロード対応、§1.3 semantic validation (C1〜C5) 実装、§3.4 layerDetection precedence 実装 | 1d | Wave 2 |
| **Wave 4** | `flat` preset 実装（L1-001〜004 自動無効化 + §2.6 flat 残存 tag 扱い + §2.8 preset/user 優先度） | 0.5d | Wave 3 |
| **Wave 5** | `onion / hexagonal / layered / strict-ddd / custom` 実装 + `/tmp/phasegate-dogfood-*/` で外部 PJ シナリオ検証（3 preset 最低限） | 1d | Wave 4 |
| **Wave 6** | README / retrofit-adoption.md / CLAUDE.md への preset 選定ガイド追記、`phasegate migrate --schema v3` CLI、v0.86.0 未満からの upgrade 警告 | 0.5d | Wave 5 |

**合計 4.5d**（issue_description.md 推定より +0.5d — Wave 6 で migrate CLI 明示）

**Wave 分割の原則**: 各 Wave は独立にリリース可能（既存挙動を壊さず、段階的に機能を足す）。Wave 1 完了時点で実装コード変更 0、Wave 2 完了時点でも PhaseGate 自身の挙動は不変（`clean` preset が既定として動くため）。

## 5. 受け入れ基準（Wave 1 用）

成果物の存在チェック（物理検証）:
- [x] ADR-015 起票（Accepted 状態で記録）
- [x] 本文書が ISSUE-014 配下に配置される
- [x] preset **7 種**の層構成と依存行列が明文化される
- [x] schema v3 断片が具体 JSON Schema で記載される
- [x] 下位互換戦略（v2 → v3 自動デフォルト合成、構造検出、v0.86.0 境界）が明記される
- [x] semantic validation (C1〜C5) が列挙される
- [x] `layerDetection` precedence が表形式で明示される
- [x] `project.preset` vs `architecture.preset` の直交関係が明文化される
- [x] Wave 2 以降の実装順序が Wave ごとに推定工数付きで整理される

設計品質のレビュー（user レビュー必須）:
- [ ] user が設計文書を一読し、穴・矛盾・不明点を指摘する機会を経る
- [ ] 指摘された穴が修正されるか、別 Wave / 別 issue に明示的に deferred される

本 Wave は **user レビュー完了時点で完了**とする（物理的な成果物揃いだけでは不十分）。

## 6. 非対象（Wave 1 スコープ外）

- `LayerName` / `LayerBoundary` / `biome-ast-engine` 配下の実装改修（Wave 2〜3）
- `harness-config-v3.schema.json` の実体追加（Wave 3）
- dogfood 検証環境（`/tmp/phasegate-dogfood-onion/` 等）の構築（Wave 4〜5）
- ガイド文書追記（Wave 6）

## 7. 参照

- [ADR-015-architecture-preset.md](../../../ADR/ADR-015-architecture-preset.md) — 本提案の決定根拠
- [ADR-014-presentation-domain-dependency.md](../../../ADR/ADR-014-presentation-domain-dependency.md) — `clean` preset の既定挙動
- [ADR-005-hexagonal-architecture.md](../../../ADR/ADR-005-hexagonal-architecture.md) — PhaseGate 自身の構造的選択
- [ISSUE-014 issue_description.md](./issue_description.md) — 本 Wave を含む issue 全体
- [ISSUE-007 retrofit-adoption.md](../../../guide/retrofit-adoption.md) — preset 選定ガイドの統合先候補（Wave 6）
