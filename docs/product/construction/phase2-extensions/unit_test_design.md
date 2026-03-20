# ユニットテスト設計: phase2-extensions

> **Unit ID**: phase2-extensions
> **作成日**: 2026-03-20
> **対応ストーリー**: HF2-01, HF2-02, HF2-03
> **Wave**: 2
> **参照**: domain_model.md, logical_design.md, docs/principles/testing-rules.md

---

## 1. 対象ドメインモデル

- **集約ルート**: DocFreshnessRule, PointerRule
- **値オブジェクト**: FreshnessThreshold, DocumentAge, Pointer, PointerValidationResult, E2EStrategyTemplate
- **ドメインサービス**: FreshnessCheckService, PointerResolutionService

---

## 2. 値オブジェクトテストケース

### 2.1 FreshnessThreshold

**テスト配置**: `scripts/harness/__tests__/unit/phase2-extensions/value-objects/freshness-threshold.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-P2-001 | `warnThresholdDays=14`, `errorThresholdDays=30` | 正常に生成される |
| UT-P2-002 | `warnThresholdDays=7`, `errorThresholdDays=14` | 正常に生成される |
| UT-P2-003 | `warnThresholdDays=30`, `errorThresholdDays=90` | 正常に生成される |
| UT-P2-004 | `warnThresholdDays=0`（0は不正） | Phase2ExtensionsDomainErrorをスロー（INV-3違反） |
| UT-P2-005 | `warnThresholdDays=30`, `errorThresholdDays=30`（warnとerrorが同値） | Phase2ExtensionsDomainErrorをスロー（INV-4違反: error>warnであること） |
| UT-P2-006 | `warnThresholdDays=30`, `errorThresholdDays=29`（errorがwarnより小さい） | Phase2ExtensionsDomainErrorをスロー（INV-4違反） |
| UT-P2-007 | `warnThresholdDays=-1`（負値） | Phase2ExtensionsDomainErrorをスロー（INV-3違反） |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-P2-008 | 同一`warnThresholdDays`/`errorThresholdDays`を持つ2つのFreshnessThreshold | `equals()`がtrueを返す |
| UT-P2-009 | `errorThresholdDays`のみ異なる2つのFreshnessThreshold | `equals()`がfalseを返す |

---

### 2.2 DocumentAge

**テスト配置**: `scripts/harness/__tests__/unit/phase2-extensions/value-objects/document-age.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-P2-010 | `ageInDays=0`, `source='git-log'` | 正常に生成される（当日コミット） |
| UT-P2-011 | `ageInDays=365`, `source='file-mtime'` | 正常に生成される |
| UT-P2-012 | `ageInDays=-1`（負値） | Phase2ExtensionsDomainErrorをスロー（INV-5違反） |
| UT-P2-013 | `source='unknown'`（不正値） | Phase2ExtensionsDomainErrorをスロー |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-P2-014 | 同一`ageInDays`/`source`を持つ2つのDocumentAge | `equals()`がtrueを返す |
| UT-P2-015 | `source`のみ異なる（git-log vs file-mtime）2つのDocumentAge | `equals()`がfalseを返す |

#### isOlderThanテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-P2-016 | `DocumentAge(ageInDays=20).isOlderThan(14)` | trueを返す |
| UT-P2-017 | `DocumentAge(ageInDays=10).isOlderThan(14)` | falseを返す |
| UT-P2-018 | `DocumentAge(ageInDays=14).isOlderThan(14)` | trueを返す（境界値: >=14） |

---

### 2.3 Pointer

**テスト配置**: `scripts/harness/__tests__/unit/phase2-extensions/value-objects/pointer.test.ts`

#### 生成テスト（file-path）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-P2-019 | `type='file-path'`, `rawText='[設計](docs/design.md)'`, `target='docs/design.md'` | 正常に生成される |
| UT-P2-020 | `type='file-path'`, `rawText=''`（空文字） | Phase2ExtensionsDomainErrorをスロー（INV-8違反） |
| UT-P2-021 | `type='file-path'`, `target=''`（空文字） | Phase2ExtensionsDomainErrorをスロー（INV-9違反） |

#### 生成テスト（url）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-P2-022 | `type='url'`, `rawText='[GitHub](https://github.com/)'`, `target='https://github.com/'` | 正常に生成される |

#### 判別メソッドテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-P2-023 | file-pathポインタに対して`isFilePath()` | trueを返す |
| UT-P2-024 | file-pathポインタに対して`isUrl()` | falseを返す |
| UT-P2-025 | urlポインタに対して`isUrl()` | trueを返す |

---

### 2.4 PointerValidationResult

**テスト配置**: `scripts/harness/__tests__/unit/phase2-extensions/value-objects/pointer-validation-result.test.ts`

#### 生成テスト（正常）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-P2-026 | `isResolvable=true`, `errorMessage=null`, `resolvedPath='docs/design.md'` | 正常に生成される |
| UT-P2-027 | `isResolvable=false`, `errorMessage='File not found: docs/missing.md'`, `resolvedPath=null` | 正常に生成される |

#### ファクトリメソッドテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-P2-028 | `PointerValidationResult.resolved(pointer, 'docs/design.md')` | `isResolvable=true`, `errorMessage=null`のインスタンスが生成される |
| UT-P2-029 | `PointerValidationResult.broken(pointer, 'File not found')` | `isResolvable=false`, `resolvedPath=null`のインスタンスが生成される |
| UT-P2-030 | `PointerValidationResult.skipped(pointer)` | `isResolvable=true`, `errorMessage=null`（URLスキップ時）のインスタンスが生成される |

---

### 2.5 E2EStrategyTemplate

**テスト配置**: `scripts/harness/__tests__/unit/phase2-extensions/value-objects/e2e-strategy-template.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-P2-031 | `targetPhase='wave1'` | 正常に生成される。`templateContent`にphase名が含まれる |
| UT-P2-032 | `targetPhase='phase2-extensions'` | 正常に生成される |
| UT-P2-033 | `targetPhase=''`（空文字） | Phase2ExtensionsDomainErrorをスロー（INV-11違反） |

#### templateContent内容テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-P2-034 | `E2EStrategyTemplate.create('wave1')` | `templateContent`に`wave1`の文字列が含まれる |
| UT-P2-035 | `E2EStrategyTemplate.create('wave1')` | `templateContent`にMarkdown見出し（`# `）が含まれる |
| UT-P2-036 | `E2EStrategyTemplate.create('wave1')` | `generatedAt`がISO 8601形式の文字列であること |

---

## 3. 集約ルートテストケース

### 3.1 DocFreshnessRule

**テスト配置**: `scripts/harness/__tests__/unit/phase2-extensions/aggregates/doc-freshness-rule.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-P2-037 | `ruleId='adr-docs'`, `documentPattern='docs/adr/**/*.md'`, `threshold={warn:14,error:30}`, `enabled=true` | 正常に生成される |
| UT-P2-038 | `ruleId='design-docs'`, `documentPattern='docs/product/**/*.md'`, `threshold={warn:30,error:90}` | 正常に生成される |
| UT-P2-039 | `ruleId=''`（空文字） | Phase2ExtensionsDomainErrorをスロー（INV-1違反） |
| UT-P2-040 | `documentPattern=''`（空文字） | Phase2ExtensionsDomainErrorをスロー（INV-2違反） |
| UT-P2-041 | `threshold={warnThresholdDays=30, errorThresholdDays=30}`（equal値） | Phase2ExtensionsDomainErrorをスロー（INV-4: error>warn必須） |

#### enabledフラグテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-P2-042 | `enabled=false`で生成したDocFreshnessRuleに対して`isEnabled()` | falseを返す |
| UT-P2-043 | `enabled=true`で生成したDocFreshnessRuleに対して`isEnabled()` | trueを返す |

#### matchesDocumentテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-P2-044 | `documentPattern='docs/adr/**/*.md'`のルールに`'docs/adr/0001-test.md'`を照合 | trueを返す |
| UT-P2-045 | `documentPattern='docs/adr/**/*.md'`のルールに`'docs/product/design.md'`を照合 | falseを返す |

---

### 3.2 PointerRule

**テスト配置**: `scripts/harness/__tests__/unit/phase2-extensions/aggregates/pointer-rule.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-P2-046 | `ruleId='docs-pointers'`, `documentPattern='docs/**/*.md'`, `failOnBroken=true` | 正常に生成される |
| UT-P2-047 | `ruleId=''`（空文字） | Phase2ExtensionsDomainErrorをスロー（INV-6違反） |
| UT-P2-048 | `documentPattern=''`（空文字） | Phase2ExtensionsDomainErrorをスロー（INV-7違反） |

#### failOnBrokenテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-P2-049 | `failOnBroken=true`のPointerRuleに対して`shouldFailOnBroken()` | trueを返す |
| UT-P2-050 | `failOnBroken=false`のPointerRuleに対して`shouldFailOnBroken()` | falseを返す |

---

## 4. ドメインサービステストケース

### 4.1 FreshnessCheckService

**テスト配置**: `scripts/harness/__tests__/unit/phase2-extensions/services/freshness-check-service.test.ts`

#### checkテスト（levelの判定）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-P2-051 | `rule({warn:14,error:30})`, `documentAge(ageInDays=5)` | `level='ok'`のFreshnessCheckResultが返る |
| UT-P2-052 | `rule({warn:14,error:30})`, `documentAge(ageInDays=14)` | `level='warn'`のFreshnessCheckResultが返る（境界値: warnThreshold到達） |
| UT-P2-053 | `rule({warn:14,error:30})`, `documentAge(ageInDays=20)` | `level='warn'`のFreshnessCheckResultが返る |
| UT-P2-054 | `rule({warn:14,error:30})`, `documentAge(ageInDays=30)` | `level='error'`のFreshnessCheckResultが返る（境界値: errorThreshold到達） |
| UT-P2-055 | `rule({warn:14,error:30})`, `documentAge(ageInDays=100)` | `level='error'`のFreshnessCheckResultが返る |
| UT-P2-056 | `rule({warn:14,error:30})`, `documentAge(ageInDays=13)` | `level='ok'`のFreshnessCheckResultが返る（warnThreshold未満） |

#### checkテスト（メッセージ・メタデータ）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-P2-057 | `rule(ruleId='adr-docs')`, `documentAge(ageInDays=5, source='git-log')` | `result.ruleId='adr-docs'`, `result.ageSource='git-log'` |
| UT-P2-058 | `documentAge(source='file-mtime')` | `result.ageSource='file-mtime'` |

#### enabled=falseルールのテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-P2-059 | `rule(enabled=false)`, `documentAge(ageInDays=365)` | `level='ok'`（無効ルールはチェックをスキップ） |

---

### 4.2 PointerResolutionService

**テスト配置**: `scripts/harness/__tests__/unit/phase2-extensions/services/pointer-resolution-service.test.ts`

#### resolveテスト

| ケースID | 入力 | モック設定 | 期待結果 |
|---------|------|----------|---------|
| UT-P2-060 | `[file-path Pointer('docs/design.md')]` | PointerResolverPort: `resolve()`→true | `[PointerValidationResult(isResolvable=true)]` が返る |
| UT-P2-061 | `[file-path Pointer('docs/missing.md')]` | PointerResolverPort: `resolve()`→false | `[PointerValidationResult(isResolvable=false, errorMessage!==null)]` が返る |
| UT-P2-062 | `[url Pointer('https://example.com')]` | PointerResolverPortは呼び出されない | `[PointerValidationResult(isResolvable=true)]` が返る（URLスキップ） |
| UT-P2-063 | `[]`（空配列） | PointerResolverPortは呼び出されない | 空の`PointerValidationResult[]`が返る |
| UT-P2-064 | `[file-path1（実在）, file-path2（不在）, url1（スキップ）]`の3件 | PointerResolverPort: file-path1→true, file-path2→false | 3件のPointerValidationResult[]。broken=1件、skipped=1件 |

#### PointerResolverPortエラーハンドリングテスト

| ケースID | 入力 | モック設定 | 期待結果 |
|---------|------|----------|---------|
| UT-P2-065 | `[file-path Pointer]` | PointerResolverPort: `resolve()`→I/Oエラーをスロー | HarnessErrorがスローされるか、`isResolvable=false`のPointerValidationResultが返る |

---

## 5. テストケース総数サマリー

| 対象クラス | 生成テスト | 不変条件テスト | 等値性テスト | その他 | 合計 |
|----------|-----------|-------------|------------|------|------|
| FreshnessThreshold | 7 | — | 2 | — | 9 |
| DocumentAge | 4 | — | 2 | 3（isOlderThan） | 9 |
| Pointer | 4 | — | — | 3（判別メソッド） | 7 |
| PointerValidationResult | 2 | — | — | 3（ファクトリ） | 5 |
| E2EStrategyTemplate | 3 | — | — | 3（content/generatedAt） | 6 |
| DocFreshnessRule | 5 | — | — | 4（enabled/matches） | 9 |
| PointerRule | 3 | — | — | 2（failOnBroken） | 5 |
| FreshnessCheckService | 6 | — | — | 3（メッセージ/enabled） | 9 |
| PointerResolutionService | 5 | — | — | 1（エラーハンドリング） | 6 |
| **合計** | **39** | **—** | **4** | **22** | **65** |

> 不変条件テストは各生成テストの異常系に含んでいるため別カウントなし。
