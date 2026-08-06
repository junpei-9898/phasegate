---
traceability:
  initial_creation: true
work_item: WI-371
---

# ストーリー固有論理設計: WI-371（quickMode categoryOverrides / allowedCategories enum）

<!-- @work-item-id WI-371 -->

> Unit: quick-mode
> 親: `docs/product/construction/quick-mode/logical_design.md`

---

## 1. 影響ファイル一覧

| 層 | ファイル | 変更 |
|----|---------|------|
| domain | `quick-mode/domain/value-objects/category-override-rules.ts` | **新規** — glob → ChangeCategory 解決 VO |
| domain | `quick-mode/domain/value-objects/quick-mode-config.ts` | 変更 — `categoryOverrides` 保持 / `allowedCategories` enum 検証 |
| domain | `quick-mode/domain/services/quick-mode-judgment-engine.ts` | 変更 — `classify` の config を消費し `categorizeFile` へ伝播 |
| infrastructure | `quick-mode/infrastructure/adapters/harness-config-quick-mode-config-adapter.ts` | 変更 — `quickMode.categoryOverrides` を読む |
| infrastructure | `config-foundation/infrastructure/schemas/harness-config-v3.schema.json` | 変更 — `categoryOverrides` 定義追加 / `allowedCategories` enum |
| infrastructure | `config-foundation/infrastructure/schemas/harness-config-v2.schema.json` | 変更 — 同上（v2 も enum + overrides を受理） |
| domain | `config-foundation/domain/harness-config.ts` | 変更 — `HarnessConfigResolvedDocument["quickMode"]` に `categoryOverrides?` |
| infrastructure | `agent-integration/infrastructure/adapters/quick-mode-full-mode-requirement-adapter.ts` | 変更 — 設定不正時のみ fail-closed（DD-7） |

> `judge()` の 3 拒否ルール本体、`ChangeCategory`、`ChangeClassification`、
> `ValidatorRelaxationService`、application/presentation 層の公開シグネチャは変更しない。

---

## 2. API 契約

### 2.1 `CategoryOverrideRules`（新規 VO）

```ts
export class CategoryOverrideRules {
  static empty(): CategoryOverrideRules;
  static create(raw: Readonly<Record<string, readonly string[]>> | undefined): CategoryOverrideRules;
  isEmpty(): boolean;
  resolve(filePath: string): ChangeCategory | null;
  toRecord(): Readonly<Record<string, readonly string[]>>;
  equals(other: CategoryOverrideRules): boolean;
}
```

- `create(undefined)` / `create({})` → `empty()` 等価
- 未知キー・非配列値・空文字列パターンは `QuickModeConfigError`
- `resolve` は複数マッチ時にリスク優先度最大のカテゴリを返す（DD-4）

### 2.2 `QuickModeConfig`（変更）

```ts
static create(raw: {
  allowedCategories: string[];
  maintainedLayers: string[];
  relaxedGates: string[];
  fullModeRequiredWhen?: Partial<FullModeRequiredRules>;
  categoryOverrides?: Record<string, string[]>;   // 追加
}): QuickModeConfig;

readonly categoryOverrides: CategoryOverrideRules;  // 追加（未設定時は empty）
```

`equals` は `categoryOverrides` も比較対象に含める。

### 2.3 `QuickModeJudgmentEngine`（変更）

```ts
classify(changedFiles: readonly ChangedFile[], config?: QuickModeConfig): ChangeClassification;
```

シグネチャは不変（`_config` → `config` へリネームし実消費するのみ）。
`config` 省略時は override 無し = 現行挙動。

内部:

```ts
function categorizeFile(file: ChangedFile, overrides: CategoryOverrideRules): ChangeCategory
```

`judge()` 内の `describeChangedFile` 用 `categorizeFile(f)` 呼び出しにも
同じ overrides を渡し、遮断メッセージ中のカテゴリ表示と分類結果を一致させる。

### 2.4 config スキーマ

```jsonc
"quickMode": {
  "properties": {
    "allowedCategories": {
      "type": "array",
      "items": { "enum": ["bugfix","docs","test","config","feature","domain","api"] },
      "uniqueItems": true
    },
    "categoryOverrides": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "bugfix": { "type": "array", "items": { "type": "string", "minLength": 1 }, "uniqueItems": true },
        // docs / test / config / feature / domain / api も同型
      }
    }
  }
}
```

`additionalProperties: false` により未知カテゴリキーは schema 段で拒否される
（VO 側の INV-CO-1 は raw JSON を直接読む quick-mode adapter 経路の二重防御）。

---

## 3. データフロー（3 経路の一貫性）

```
[hook 経路]
  pre-tool-use-hook
    → createQuickModeCompositionRoot({ configPath, rootDir })
      → HarnessConfigQuickModeConfigAdapter.getQuickModeConfig()   ← categoryOverrides 読込
    → QuickModeFullModeRequirementAdapter.check()
      → ClassifyChangeCategoryUseCase.execute()
        → engine.classify(files, config) / engine.judge(files, config)

[CLI 経路]  phasegate check-change-category --paths ...
  main.ts → createQuickModeCompositionRoot(resolveQuickModeCompositionOptions())
    → CheckChangeCategoryHandler → ClassifyChangeCategoryUseCase（同上）

[CI 経路]  phasegate ci-check --quick
  main.ts → createQuickModeCompositionRoot()
    → CiCheckQuickModeHandler → ExecuteQuickCiCheckUseCase
      → JudgeQuickModeEligibilityUseCase → engine.judge(files, config)
        → engine.classify(files, config)
```

3 経路とも `QuickModeConfigPort.getConfig()` が返す同一 `QuickModeConfig` を
`classify` / `judge` に渡すため、override は自動的に全経路へ一貫して効く。
**新しい分岐は不要**（`_config` が未使用だったことが唯一の欠落だった）。

---

## 4. 設計判断記録

### LD-9: `_config` を消費する形での実装（新規クラス／新規ポートを増やさない）

**論点**: 分類ルールの設定化をどこに置くか。

**判断**: 既存の `classify(files, config)` シグネチャをそのまま使い、
`QuickModeConfig` に `CategoryOverrideRules` を持たせる。
新しい Port / UseCase / CompositionRoot 配線は追加しない。

**根拠**: 3 経路すべてが既に `QuickModeConfigPort` から config を取得して
`classify` / `judge` に渡す構造になっており、`_config` の未使用が唯一の欠落だった。
新規経路を足すと 3 経路の一貫性を再び壊すリスクがある。

### LD-10: glob 実装を domain 層内に閉じる（picomatch を使わない）

**論点**: repo には `picomatch`（`ci-governance` / `phase-dependency-model` の
infrastructure adapter）と、`agent-integration/domain` の純正規表現実装が併存する。

**判断**: domain 層の `CategoryOverrideRules` は純正規表現実装を採る。

**根拠**: `scripts/harness/*/domain/**` は repo 全体で外部 npm パッケージを
一切 import していない（node: 組込みと相対 import のみ）。分類判定は
`QuickModeJudgmentEngine` と同じ domain 層の純粋計算であり、
そこに npm 依存を持ち込むと domain 層の依存規律が崩れる。
`**` / `*` / `?` の 3 記法があれば `results/**` 型のユースケースは満たせる。

**影響**: brace expansion（`{a,b}`）や negation（`!`）は非サポート。
必要になった場合は infrastructure に GlobMatcherPort を切って注入する
（本 WI ではオーバーエンジニアリングとして見送る）。

### LD-11: 設定不正時の hook fail-closed（DD-7）

**論点**: enum 検証の例外が hook の `catch { return { requiresFullMode: false } }` に
吸収されると、typo が全書き込み許可に化ける。

**判断**: `QuickModeConfigError` に限って `requiresFullMode: true` を返し、
`rejectionRule: "MIXED_CHANGES"` 相当の理由文字列で設定不正を通知する。
それ以外の例外（config 不在・IO エラー）は WI-333 の fail-open を維持する。

**根拠**: 「設定を壊すと防御が全部外れる」は品質防御ツールとして許容できない。
一方 config 不在の fail-open は greenfield 導入体験のために WI-333 で意図的に
選択された挙動であり、区別して扱う必要がある。
