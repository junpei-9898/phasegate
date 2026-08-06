---
traceability:
  initial_creation: true
work_item: WI-371
---

# ストーリー固有ドメインモデル: WI-371（quickMode categoryOverrides / allowedCategories enum）

<!-- @work-item-id WI-371 -->

> Unit: quick-mode
> 親: `docs/product/construction/quick-mode/domain_model.md`

---

## 1. 追加・変更される概念

| 概念 | 分類 | 変更 | 説明 |
|------|------|------|------|
| `CategoryOverrideRules` | 値オブジェクト（新規） | 追加 | ChangeCategory → glob パターン列 の写像。パスから override カテゴリを解決する |
| `QuickModeConfig` | 値オブジェクト | 変更 | `categoryOverrides: CategoryOverrideRules` を保持。`allowedCategories` に enum 不変条件を追加 |
| `QuickModeJudgmentEngine` | ドメインサービス | 変更 | `classify(files, config?)` の `config` を実際に消費し `categorizeFile(file, overrides)` へ伝播 |
| `ChangeCategory` | 値オブジェクト | 変更なし | 7 値の語彙定義がそのまま override キー／`allowedCategories` の enum 権威になる |

---

## 2. CategoryOverrideRules

### 構造

```ts
// raw 形: Record<ChangeCategoryValue, string[]>
{ "docs": ["results/**", "notes/**"], "config": ["deploy/*.yaml"] }
```

### 不変条件

| ID | 不変条件 | 違反時 |
|----|---------|--------|
| INV-CO-1 | キーは ChangeCategory 7 値（`bugfix` / `docs` / `test` / `config` / `feature` / `domain` / `api`）のみ | `QuickModeConfigError` |
| INV-CO-2 | 値は文字列配列。空文字列パターンを含まない | `QuickModeConfigError` |
| INV-CO-3 | 生成後は不変（`Object.freeze`） | TypeError |
| INV-CO-4 | 未設定時は空ルール。空ルールは分類に一切影響しない | — |

### 解決規則

`resolve(filePath): ChangeCategory | null`

1. 全カテゴリのパターンを走査し、マッチしたカテゴリを集める
2. マッチが 0 件なら `null`（組み込みルールへ委譲）
3. マッチが複数なら **リスク優先度（`api` > `domain` > `feature` > `bugfix` > `test` > `config` > `docs`）が最も高いカテゴリ**を返す（DD-4）

JSON オブジェクトのキー列挙順に依存しないため、同じ config は常に同じ結果を返す。

### glob 構文（DD-5）

domain 層は repo 全体で外部 npm 依存を持たないため、
`agent-integration/domain/value-objects/protected-file-list.ts` と同型の
純粋な正規表現変換で実装する。

| 記法 | 意味 |
|------|------|
| `**` | `/` を含む任意の文字列 |
| `*` | `/` を含まない任意の文字列 |
| `?` | `/` 以外の 1 文字 |
| その他 | リテラル（正規表現メタ文字はエスケープ） |

パスはプロジェクト相対の POSIX 形式（`ChangedFile.filePath` の既存前提）。

---

## 3. 分類ロジックの改訂（親 §3 ChangeClassification分類ロジック の差分）

```
categorizeFile(file, overrides):
  builtIn  = <従来の組み込み分類>
  override = overrides.resolve(file.filePath)

  if override == null:                      → builtIn                （後方互換: 完全一致）
  if builtIn in {domain, api}:               → max_risk(builtIn, override)  （DD-2 構造降格ガード）
  else:                                      → override               （DD-1 明示優先）
```

### DD-1: override 先行評価の根拠

override は「このプロジェクトではこのパスはこの種類の変更である」という
利用者の明示宣言であり、組み込みルールの後段に置くと
`notes/deploy.config.json` のような偶発的な組み込みマッチに常に負けて、
「設定したのに効かない」不可解な挙動になる。明示 > 推論。

### DD-2: 構造降格ガードの根拠

override の唯一の防御弱体化ベクトルは「組み込みで `domain` / `api` と判定される
ファイルを低リスクカテゴリへ移す」こと（例: `scripts/**/domain/**` → `docs`）。
`judge()` の NEW_DOMAIN は CREATE のみ、API_CONTRACT は `*port.ts` / `*adapter.ts` のみを
見るため、domain ファイルの MODIFY はガードが無ければ `docs` として素通りしてしまう。
よって組み込みが `domain` / `api` のときは override による降格を禁じ、
昇格（`domain` → `api` 等）のみ許す。

### DD-3: `domain` を override のキーに許す根拠

`domain` / `api` / `feature` は既定 `allowedCategories`（`bugfix` / `docs` / `test` / `config`）
の外にある。あるパスをそれらへ割り当てる行為は Quick Mode 通過を**難しくする**方向にしか
働かないため、拒否する理由が無い。防御弱体化リスクは「割り当て先」ではなく
「割り当て元」に存在し、それは DD-2 のガードで塞ぐ。

### DD-6: 3拒否ルールは override 非依存

`judge()` の NEW_DOMAIN / API_CONTRACT はパスベースのまま維持する。
MIXED_CHANGES のみが（override 反映後の）分類結果を消費する。
これにより override が誤設定されても構造的な高リスク変更は必ず Full Mode に落ちる
二重防御が保たれる。

---

## 4. allowedCategories の enum 不変条件（WI-373）

| ID | 不変条件 | 違反時 |
|----|---------|--------|
| INV-AC-1 | 空配列でない（既存） | `QuickModeConfigError: allowedCategories must not be empty` |
| INV-AC-2 | 全要素が ChangeCategory 7 値のいずれか（**厳密一致・大文字小文字の正規化はしない**） | `QuickModeConfigError: allowedCategories contains unknown category` |

`ChangeCategory.fromString` は小文字化するが、分類結果のキーは常に小文字であるため
config 側で `"Docs"` を受理しても実質マッチしない「効かない設定」になる。
よって正規化せず厳密一致で拒否する（fail-closed かつ診断が明快）。

### DD-7: hook 経路の fail-open 補正

`QuickModeFullModeRequirementAdapter.check()` は例外を握り潰して
`requiresFullMode: false` を返す（WI-333: config 不在時の fail-open）。
enum 検証の導入により「config の typo」が例外になるため、この経路をそのままにすると
typo が **全書き込み許可** に化ける（現状の「その要素が単に効かない」より悪化する）。
したがって `QuickModeConfigError`（= 設定不正）に限り fail-closed
（`requiresFullMode: true`）へ倒す。それ以外の例外は WI-333 の fail-open を維持する。

### session.json との関係

`normalizeAllowedCategories`（`agent-integration/infrastructure/adapters/file-system-full-mode-session-query-adapter.ts`）は
`.phasegate/session.json` の旧形式（`domain` / `application` 等の layer 語彙）を
救済するための正規化であり、config の検証経路とは別系統。本 WI では変更しない。
config 側で enum が保証されるようになった結果、将来的には session 生成側が
常に ChangeCategory 語彙で書くことが保証でき、session 側の silent widening
（未知値混在 → 全 7 カテゴリ許可）は削除可能になる。
