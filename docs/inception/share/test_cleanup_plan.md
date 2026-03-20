# テスト削減計画: YAGNI違反テストの除去

> **作成日**: 2026-03-17
> **ステータス**: Phase 1（計画） — 人間承認待ち
> **対象**: Wave 1 テストスイート（163ファイル、32,129行、約1,258テスト）
> **削減見込み**: 約141テスト / 約1,220行

---

## 1. 削減方針

**残すもの:** ビジネスロジック、ドメイン不変条件、境界をまたぐ統合
**削除するもの:** 言語仕様の再確認、型システムの保証の再テスト、到達不能パス、重複

---

## 2. カテゴリ別削除対象

### A. Object.freeze 確認テスト（7件）

JavaScript の API 仕様を再テストしている。`Object.freeze()` を呼んでいるコードが動く限り凍結は保証される。

| # | ファイル | 行 |
|---|---------|-----|
| A-1 | `unit/harness-error/severity.test.ts` | 44 |
| A-2 | `unit/harness-error/harness-error.test.ts` | 162 |
| A-3 | `unit/harness-error/harness-error-contract-mapper.test.ts` | 111 |
| A-4 | `unit/harness-error/create-harness-error-use-case.test.ts` | 162 |
| A-5 | `unit/harness-error/harness-error-factory.test.ts` | 237 |
| A-6 | `unit/harness-error/error-definition-registry.test.ts` | 136 |
| A-7 | `unit/harness-error/normalize-validator-errors-use-case.test.ts` | 228 |

> パス接頭辞: `scripts/harness/__tests__/`

---

### B. trivial .value / .toString() プロパティ確認テスト（約50件）

コンストラクタで代入した値を読み返しているだけ。TypeScript の型システムが保証する内容。

| # | ファイル | 行 | 内容 |
|---|---------|-----|------|
| B-1 | `unit/adr-foundation/adr-id.test.ts` | 19, 34, 68 | .value 確認 |
| B-2 | `unit/traceability-model/story-id.test.ts` | 19, 32 | .value 確認 |
| B-3 | `unit/traceability-model/project-relative-path.test.ts` | 23, 36, 118, 135 | .value 確認 |
| B-4 | `unit/harness-error/severity.test.ts` | 20, 32 | .value 確認 |
| B-5 | `unit/harness-error/severity-contract-enforcer.test.ts` | 28, 42, 56, 70, 84 | .value 確認 |
| B-6 | `unit/phase-dependency-model/planning-mode.test.ts` | 28, 59 | .value 確認 |
| B-7 | `unit/phase-dependency-model/phase-structure.test.ts` | 878, 1238 | .value / .type 確認 |
| B-8 | `unit/traceability-model/metadata-tag.test.ts` | 34, 52, 70, 88 | .type 確認 |
| B-9 | `unit/biome-ast-engine/import-cycle.test.ts` | 105, 106 | .toString() 確認 |
| B-10 | `unit/biome-ast-engine/source-module-snapshot.test.ts` | 81, 82 | .toString() 確認 |
| B-11 | `unit/biome-ast-engine/import-graph-builder.test.ts` | 242 | .toString() 確認 |
| B-12 | `unit/biome-ast-engine/required-input.test.ts` | 22, 35, 48, 61 | .toString() 確認 |
| B-13 | `unit/biome-ast-engine/resolve-enabled-rules-usecase.test.ts` | 59 | .toString() 確認 |
| B-14 | `unit/biome-ast-engine/source-module-snapshot-mapper.test.ts` | 42, 44, 104, 105, 107, 109 | .toString() 確認 |
| B-15 | `unit/biome-ast-engine/file-path.test.ts` | 213 | .toString() 確認 |
| B-16 | `unit/biome-ast-engine/rule-type.test.ts` | 22 | .toString() 確認 |
| B-17 | `unit/biome-ast-engine/rule-name.test.ts` | 21, 35, 48, 61, 74 | .toString() 確認 |
| B-18 | `unit/adr-foundation/adr-file-path.test.ts` | 25 | .toString() 確認 |
| B-19 | `unit/traceability-model/resolve-legacy-story-id-usecase.test.ts` | 33 | .toString() 確認 |
| B-20 | `unit/traceability-model/source-metadata-parser.test.ts` | 158, 159 | .toString() 確認 |

---

### C. instanceof チェックテスト（12件）

TypeScript の型システムが戻り値の型を保証済み。振る舞いではなく実装詳細への依存。

| # | ファイル | 行 |
|---|---------|-----|
| C-1 | `unit/config-foundation/harness-config.test.ts` | 327, 328, 329, 330, 331, 332, 333 |
| C-2 | `unit/config-foundation/harness-config.test.ts` | 608, 623, 637, 652 |
| C-3 | `unit/config-foundation/feature-registry.test.ts` | 42 |

---

### D. 自明な equals テスト（約17件）

`this.value === other.value` の単純比較を確認しているだけ。複合プロパティの等価性テストは除外済み。

| # | ファイル | 行 |
|---|---------|-----|
| D-1 | `unit/biome-ast-engine/rule-name.test.ts` | 22 |
| D-2 | `unit/biome-ast-engine/rule-definition-registry.test.ts` | 236, 250, 288 |
| D-3 | `unit/adr-foundation/adr-status.test.ts` | 56, 70 |
| D-4 | `unit/adr-foundation/adr-frontmatter.test.ts` | 81, 83, 207, 223, 237, 270, 287 |
| D-5 | `unit/adr-foundation/superseded-by-ref.test.ts` | 22 |
| D-6 | `unit/adr-foundation/adr.test.ts` | 265, 266, 301, 315, 351, 403, 541 |

---

### E. 型判別メソッドテスト（10件）

`return this.value === 'X'` の1行メソッドの true/false 全パターン。TypeScript の型ガードで十分。

| # | ファイル | 行 | メソッド |
|---|---------|-----|---------|
| E-1 | `unit/biome-ast-engine/rule-type.test.ts` | 67-112 | isBiomeNative(), isExternalAnalyzer() 全8アサーション |
| E-2 | `unit/adr-foundation/adr-status.test.ts` | 154-165 | isSuperseded() 2アサーション |

---

### F. ファクトリ委譲テスト（2件）

`create('Proposed')` を呼ぶだけの `proposed()` を別途テスト。create のテストと完全重複。

| # | ファイル | 行 | メソッド |
|---|---------|-----|---------|
| F-1 | `unit/adr-foundation/adr-status.test.ts` | 45-60 | proposed() |
| F-2 | `unit/adr-foundation/adr-status.test.ts` | 61-72 | accepted() |

---

### G. 到達不能エラーパス — 型システムが防ぐもの（約8件）

TypeScript の union 型で無効値がコンパイル時に排除されるケース。テスト内で `as` キャストして無理やり到達させている。

| # | ファイル | 行 | 理由 |
|---|---------|-----|------|
| G-1 | `unit/harness-error/severity.test.ts` | 48-59 | `'info'` は `'error' \| 'warning'` 型で到達不能 |
| G-2 | `unit/harness-error/severity.test.ts` | 62-74 | 空文字は型で到達不能 |
| G-3 | `unit/biome-ast-engine/rule-type.test.ts` | 39-50 | `'RustPlugin'` は union 外 |
| G-4 | `unit/biome-ast-engine/rule-type.test.ts` | 52-63 | `'unknown'` は union 外 |
| G-5 | `unit/biome-ast-engine/layer-name.test.ts` | 64-87 | v0語彙（'port', 'usecase', 'controller'） |
| G-6 | `unit/biome-ast-engine/layer-name.test.ts` | 90-101 | 空文字 |

---

### H. 到達不能エラーパス — スキーマ/上流バリデーションが防ぐもの（約20件）

JSON Schema（AJV）やパーサーが上流で排除する入力を、下流の VO で再検証しているテスト。

| # | ファイル | 行 | 理由 |
|---|---------|-----|------|
| H-1 | `unit/config-foundation/harnesses-config.test.ts` | 62-79 | bundleSizeLimit=-1 は schema minimum:0 で排除 |
| H-2 | `unit/config-foundation/harnesses-config.test.ts` | 291-307 | 同上の重複 |
| H-3 | `unit/adr-foundation/adr-id.test.ts` | 39-54 | 不正ID形式はパーサーが排除 |
| H-4 | `unit/adr-foundation/adr-body.test.ts` | 46-64 | 空セクションはMarkdownパーサーが排除 |
| H-5 | `unit/adr-foundation/adr-body.test.ts` | 86-101 | 空白のみセクションも同上 |
| H-6 | `unit/biome-ast-engine/file-path.test.ts` | 26-37 | 空文字パスはglob/FS操作で排除 |
| H-7 | `unit/biome-ast-engine/file-path.test.ts` | 38-49 | '..' パスはglob で排除 |
| H-8 | `unit/biome-ast-engine/file-path.test.ts` | 50-61 | 絶対パスはglob relative で排除 |
| H-9 | `unit/biome-ast-engine/file-path.test.ts` | 62-73 | Windows パスは macOS/Linux 環境で不要 |
| H-10 | `unit/biome-ast-engine/file-path.test.ts` | 74-89 | '.' のみパスはglob で排除 |
| H-11 | `unit/traceability-model/project-relative-path.test.ts` | 40-55 | 空文字は glob で排除 |
| H-12 | `unit/traceability-model/project-relative-path.test.ts` | 56-67 | 絶対パスは同上 |
| H-13 | `unit/traceability-model/project-relative-path.test.ts` | 68-79 | '..' は同上 |
| H-14 | `unit/traceability-model/project-relative-path.test.ts` | 80-91 | バックスラッシュは同上 |
| H-15 | `unit/traceability-model/project-relative-path.test.ts` | 92-103 | 不正root prefixは glob prefix で排除 |
| H-16 | `unit/biome-ast-engine/rule-name.test.ts` | 78-89 | 未知ルール名はレジストリが排除 |
| H-17 | `unit/harness-error/error-code.test.ts` | 50-118 | 不正コード形式はエラー定義レジストリが排除 |
| H-18 | `unit/config-foundation/feature-name.test.ts` | 37-48 | 未知機能名はレジストリが排除 |

---

### I. 重複統合テスト（約10件）

ユニットテストと同一シナリオを統合テストが再実行。Adapter の結線確認以外の価値がない。

| # | 統合テストファイル | 行 | 重複先ユニットテスト |
|---|-------------------|-----|---------------------|
| I-1 | `integration/config-foundation/ajv-config-schema-validator.test.ts` | 22-36 | `validate-config-use-case.test.ts:211-237` |
| I-2 | `integration/config-foundation/ajv-config-schema-validator.test.ts` | 37-52 | 同上 |
| I-3 | `integration/config-foundation/ajv-config-schema-validator.test.ts` | 55-72 | `validate-config-use-case.test.ts:239-293` |
| I-4 | `integration/config-foundation/ajv-config-schema-validator.test.ts` | 74-91 | 同上 |
| I-5 | `integration/config-foundation/ajv-config-schema-validator.test.ts` | 115-152 | 同上 |
| I-6 | `integration/harness-error/harness-error-infrastructure.test.ts` | 849-887 | 各 error-definition ユニットテスト |

---

### J. エラーメッセージ文字列検証テスト（約5件）

エラーメッセージの正規表現マッチ。メッセージ文言変更で壊れる脆いテスト。

| # | ファイル | 行 | 内容 |
|---|---------|-----|------|
| J-1 | `unit/harness-error/error-code.test.ts` | 50-70 | エラーメッセージ正規表現 |
| J-2 | `unit/harness-error/error-code.test.ts` | 71-95 | 同上（別パターン） |
| J-3 | `unit/harness-error/error-code.test.ts` | 96-118 | 同上（別パターン） |
| J-4 | `unit/config-foundation/feature-name.test.ts` | 37-48 | エラーメッセージ正規表現 |

---

## 3. 削減サマリ

| カテゴリ | テスト数 | 行数 |
|---------|---------|------|
| A. Object.freeze | 7 | ~50 |
| B. trivial .value/.toString() | ~50 | ~250 |
| C. instanceof | 12 | ~60 |
| D. 自明な equals | ~17 | ~100 |
| E. 型判別メソッド | 10 | ~80 |
| F. ファクトリ委譲 | 2 | ~30 |
| G. 到達不能（型システム） | ~8 | ~120 |
| H. 到達不能（スキーマ） | ~20 | ~300 |
| I. 重複統合テスト | ~10 | ~150 |
| J. エラーメッセージ検証 | ~5 | ~80 |
| **合計** | **~141** | **~1,220行** |

| 指標 | 削減前 | 削減後 |
|------|-------|--------|
| テスト数 | ~1,258 | ~1,117 |
| テストコード行数 | 32,129 | ~30,900 |

---

## 4. 実行順序

依存関係がないため、カテゴリ単位で並列実行可能。

```
Phase 1: 確実に不要なもの（A + E + F + G）  →  27件
Phase 2: trivial 系（B + C + D）             →  79件
Phase 3: 到達不能パス（H）                   →  20件
Phase 4: 重複・脆いテスト（I + J）            →  15件
```

各 Phase 後に `npm test` で回帰確認。

---

## 5. 今後のテスト設計指針

| 原則 | 内容 |
|------|------|
| **テストすべき** | ビジネスロジック（ルール評価、Gate判定、グラフ解析）、ドメイン不変条件、境界をまたぐ統合 |
| **テストしない** | 言語仕様（Object.freeze）、型システムの保証（instanceof、union型の排他性）、1行委譲メソッド |
| **VO のテスト** | ドメイン上の意味がある振る舞い（比較ロジック、計算、変換）のみ。プロパティ代入確認は不要 |
| **エラーパス** | システム境界（外部入力、API）のみ。内部の VO 間受け渡しでは上流が保証済み |
| **統合テスト** | Adapter の結線確認に特化。ユニットテスト済みのロジック再実行は避ける |
