# ISSUE-014 Wave 1: architecture preset schema 提案

## 位置づけ

ADR-015 で採択した「アーキテクチャスタイル preset 化」の**具体スキーマ提案**。本文書は Wave 2 以降（実装フェーズ）の設計入力となる。

- ADR: [ADR-015-architecture-preset.md](../../../ADR/ADR-015-architecture-preset.md)
- 起票: ISSUE-014（2026-04-23）
- Wave 1 状態: 🟢 **DRAFT → 本文書採択で CLOSED**

## 1. 新設セクション: `architecture`

`phasegate.config.json` のトップレベルに `architecture` キーを追加する。schema version を v2 → v3 に bump する。

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
| `architecture` セクション未指定 | `preset: "clean"` を暗黙適用 |
| `preset` のみ指定（`clean / strict-ddd / onion / hexagonal / layered / flat`） | preset から `layers` / `allowedDependencies` を注入 |
| `preset: "custom"` 指定 | `layers` と `allowedDependencies` が**必須**、未指定は schema validation error |
| `metadataTags` 未指定 | `@layer` / `@unit` を既定適用 |
| `layerDetection` 未指定 | `byPath: true, byTag: true` を既定適用 |

### 1.3 既存 schema v2 からのマイグレーション

- **自動**: `phasegate.config.json` の読み込み時、`architecture` キーが無ければ在野で clean デフォルトを合成（ファイル書き換え無し）
- **明示移行（推奨）**: `npx phasegate migrate --schema v3` で `architecture: { preset: "clean" }` を末尾に追記（Wave 5 で CLI 提供予定）

## 2. preset 定義（6 種）

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

### 2.7 `custom`

ユーザーが `layers` と `allowedDependencies` を明示宣言。self-loop（`X → X`）は schema validation 時に自動補完可（実装判断は Wave 3）。

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

## 4. Wave 分割（ADR-015 Decision を実装に落とす）

| Wave | スコープ | 推定 | 依存 |
|---|---|---|---|
| **Wave 1（本文書）** | ADR-015 起票、schema 提案、issue/status 更新 | 0.5d | — |
| **Wave 2** | `LayerName` VO を config 注入形式に改修、既存挙動を `clean` preset として維持 | 1d | Wave 1 |
| **Wave 3** | `harness-config-v3.schema.json` を新設、`config-foundation` で v2→v3 ロード対応 | 1d | Wave 2 |
| **Wave 4** | `flat` preset 実装（L1-001〜004 自動無効化）+ phasegate 自身の dogfood | 0.5d | Wave 3 |
| **Wave 5** | `onion / hexagonal / layered / strict-ddd / custom` 実装 + `/tmp/phasegate-dogfood-*/` 検証 | 1d | Wave 4 |
| **Wave 6** | README / retrofit-adoption.md / CLAUDE.md への preset 選定ガイド追記、`migrate` CLI | 0.5d | Wave 5 |

**合計 4.5d**（issue_description.md 推定より +0.5d — Wave 6 で migrate CLI 明示）

## 5. 受け入れ基準（Wave 1 用）

- [x] ADR-015 起票（Accepted 状態で記録）
- [x] 本文書が ISSUE-014 配下に配置される
- [x] preset 6 種の層構成と依存行列が明文化される
- [x] schema v3 断片が具体 JSON Schema で記載される
- [x] 下位互換戦略（v2 → v3 自動デフォルト合成）が明記される
- [x] Wave 2 以降の実装順序が Wave ごとに推定工数付きで整理される

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
