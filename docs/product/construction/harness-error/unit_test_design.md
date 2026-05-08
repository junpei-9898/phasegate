# ユニットテスト設計: harness-error

@story-id H06-01
@story-id H06-02
@story-id H06-03
> **Unit ID**: harness-error
> **作成日**: 2026-03-13
> **Phase**: 2（Construction）
> **正規ソース**: `docs/product/construction/harness-error/domain_model.md`
> **論理設計参照**: `docs/product/construction/harness-error/logical_design.md`
> **テスト規約参照**: `docs/principles/testing-rules.md`
> **Phase 1計画**: `docs/inception/harness-error/unit_test_design_plan.md`

---

## 1. 対象ドメインモデル

harness-error Unitは集約を持たない。`HarnessError`を中心とした不変値オブジェクト群と、生成・検証を担うドメインサービス群で構成される。

### テスト対象コンポーネント

| 分類 | コンポーネント | ソースファイル |
|------|-------------|--------------|
| 値オブジェクト | ErrorCode | `domain/value-objects/error-code.ts` |
| 値オブジェクト | Severity | `domain/value-objects/severity.ts` |
| 値オブジェクト | AdrRef | `domain/value-objects/adr-ref.ts` |
| 値オブジェクト | FixExample | `domain/value-objects/fix-example.ts` |
| 値オブジェクト | FixExampleValidationResult | `domain/value-objects/fix-example-validation-result.ts` |
| 値オブジェクト | ErrorDefinition | `domain/value-objects/error-definition.ts` |
| 値オブジェクト（中心モデル） | HarnessError | `domain/harness-error.ts` |
| ドメインサービス | HarnessErrorFactory | `domain/services/harness-error-factory.ts` |
| ドメインサービス | ErrorDefinitionRegistry | `domain/services/error-definition-registry.ts` |
| ドメインサービス | SeverityContractEnforcer | `domain/services/severity-contract-enforcer.ts` |
| Shared Kernel | isHarnessError / HarnessErrorContract | `shared-kernel/harness-error.ts` |

### QA回答の反映

| QA# | 回答 | 反映箇所 |
|-----|------|---------|
| Q1 | Portテストダブルは同期的に即時解決する（`Promise.resolve()`）モックを使用する。非同期の振る舞いテストはIT層で実施する | HarnessErrorFactoryテストのテストダブル設計 |
| Q2 | 重複code検出時は`DuplicateErrorCodeError`（`HarnessErrorDomainError`のサブクラス）をthrowする | ErrorDefinitionRegistryの異常系テスト |
| Q3 | `defaultAdrRef` + `adrRefRequired=false`の不整合はErrorDefinition生成時にthrowする（DDD不変条件原則） | ErrorDefinitionテストファイルに配置 |

---

## 2. テストファイル構成

すべてのテストファイルは `scripts/harness/__tests__/unit/harness-error/` 配下にkebab-caseで配置する。

```text
scripts/harness/__tests__/unit/harness-error/
├── value-objects/
│   ├── error-code.test.ts
│   ├── severity.test.ts
│   ├── adr-ref.test.ts
│   ├── fix-example.test.ts
│   ├── fix-example-validation-result.test.ts
│   └── error-definition.test.ts
├── harness-error.test.ts
├── services/
│   ├── harness-error-factory.test.ts
│   ├── error-definition-registry.test.ts
│   └── severity-contract-enforcer.test.ts
└── shared-kernel/
    └── harness-error-contract.test.ts
```

### テスト環境

- **フレームワーク**: Vitest 3.0.0
- **設定ファイル**: `scripts/harness/__tests__/vitest.config.ts`（共有）
- **ヘルパー**: `target` / `context` は `describe` のエイリアスとして提供される
- **モック方針**: Domain層は実体のみ使用。Port依存は`Promise.resolve()`で即時解決するテストダブルを使用

---

## 3. 値オブジェクトテストケース

### 3.1 ErrorCode

**ファイル**: `error-code.test.ts`
**制約数**: 2（正規表現`^L[0-4]-[0-9]{3,}$`一致、意味名コード拒否）

| ケースID | target | describe / context | it（期待値） | 種別 |
|---------|--------|-------------------|-------------|------|
| UT-HE-001 | `create` | 有効なエラーコード文字列からErrorCodeを生成する | `L0-001`形式の文字列からErrorCodeが生成されること | 正常系 |
| UT-HE-002 | `create` | 有効なエラーコード文字列からErrorCodeを生成する | `L4-999`形式の文字列（レイヤー上限・3桁上限）からErrorCodeが生成されること | 正常系（境界） |
| UT-HE-003 | `create` | 有効なエラーコード文字列からErrorCodeを生成する | `L0-0001`（4桁連番）の文字列からErrorCodeが生成されること | 正常系（拡張性確認） |
| UT-HE-004 | `getLayer` | レイヤー識別子を返す | layerプロパティがレイヤー識別子を返すこと | 正常系 |
| UT-HE-005 | `toString` | 元の文字列表現を返す | 生成時の文字列と同一の値を返すこと | 正常系 |
| UT-HE-006 | `equals` | 同一値のErrorCode同士を比較する | trueを返すこと | 正常系 |
| UT-HE-007 | `equals` | 異なる値のErrorCode同士を比較する | falseを返すこと | 正常系 |
| UT-HE-008 | `create` | context: 空文字が渡された場合 | InvalidErrorCodeErrorをthrowすること | 異常系 |
| UT-HE-009 | `create` | context: `L5-001`が渡された場合 | InvalidErrorCodeErrorをthrowすること | 異常系（境界） |
| UT-HE-010 | `create` | context: `L2-PHASE-GATE`形式（意味名コード）が渡された場合 | InvalidErrorCodeErrorをthrowすること | 異常系（意味名拒否） |
| UT-HE-011 | `create` | context: `L2-01`（2桁連番）が渡された場合 | InvalidErrorCodeErrorをthrowすること | 異常系（桁数不足） |
| UT-HE-012 | `create` | context: 正規表現に一致しない任意文字列が渡された場合 | InvalidErrorCodeErrorをthrowすること | 異常系 |

### 3.2 Severity

**ファイル**: `severity.test.ts`
**制約数**: 3（error/warning限定、rank比較、Object.freeze適用）

| ケースID | target | describe / context | it（期待値） | 種別 |
|---------|--------|-------------------|-------------|------|
| UT-HE-013 | `create` | 有効なseverity文字列からSeverityを生成する | `"error"`からSeverityが生成されること | 正常系 |
| UT-HE-014 | `create` | 有効なseverity文字列からSeverityを生成する | `"warning"`からSeverityが生成されること | 正常系 |
| UT-HE-015 | `isHigherThan` | severity間のrank比較を行う | errorのrankがwarningより高いことを示すtrueを返すこと | 正常系 |
| UT-HE-016 | `isHigherThan` | severity間のrank比較を行う | warningのrankがerrorより低いことを示すfalseを返すこと | 正常系 |
| UT-HE-017 | `equals` | 同一severity同士を比較する | trueを返すこと | 正常系 |
| UT-HE-018 | `create` | 生成後のオブジェクトが不変である | Object.freezeで凍結されていること | 正常系（不変性） |
| UT-HE-019 | `create` | context: `"info"`が渡された場合 | 入力不正として拒否されること | 異常系 |
| UT-HE-020 | `create` | context: 空文字が渡された場合 | 入力不正として拒否されること | 異常系 |

### 3.3 AdrRef

**ファイル**: `adr-ref.test.ts`
**制約数**: 2（ADR-{nnn}形式、3桁固定）

| ケースID | target | describe / context | it（期待値） | 種別 |
|---------|--------|-------------------|-------------|------|
| UT-HE-021 | `create` | 有効なADR参照文字列からAdrRefを生成する | `ADR-001`形式の文字列からAdrRefが生成されること | 正常系 |
| UT-HE-022 | `toString` | 元の文字列を返す | 生成時の文字列と同一の値を返すこと | 正常系 |
| UT-HE-023 | `equals` | 同一値のAdrRef同士を比較する | trueを返すこと | 正常系 |
| UT-HE-024 | `create` | context: `ADR-0001`（4桁）が渡された場合 | エラーをthrowすること | 異常系（境界） |
| UT-HE-025 | `create` | context: `ADR-`（連番なし）が渡された場合 | エラーをthrowすること | 異常系 |
| UT-HE-026 | `create` | context: 形式に一致しない文字列が渡された場合 | エラーをthrowすること | 異常系 |

### 3.4 FixExample

**ファイル**: `fix-example.test.ts`
**制約数**: 2（空文字不可、trim後検証）

| ケースID | target | describe / context | it（期待値） | 種別 |
|---------|--------|-------------------|-------------|------|
| UT-HE-027 | `create` | 有効なコード片文字列からFixExampleを生成する | 有効なコード片文字列からFixExampleが生成されること | 正常系 |
| UT-HE-028 | `toString` | 元の文字列を返す | 生成時の文字列と同一の値を返すこと | 正常系 |
| UT-HE-029 | `equals` | 同一値のFixExample同士を比較する | trueを返すこと | 正常系 |
| UT-HE-030 | `create` | context: 空文字が渡された場合 | エラーをthrowすること | 異常系 |
| UT-HE-031 | `create` | context: 空白のみの文字列が渡された場合 | trim後に空文字としてエラーをthrowすること | 異常系 |

### 3.5 FixExampleValidationResult

**ファイル**: `fix-example-validation-result.test.ts`
**制約数**: 2（passed=true時reason=null、passed=false時diagnostics>=1）

| ケースID | target | describe / context | it（期待値） | 種別 |
|---------|--------|-------------------|-------------|------|
| UT-HE-032 | `success` | 検証成功の結果を生成する | passedがtrueでreasonがnullの結果が生成されること | 正常系 |
| UT-HE-033 | `failure` | 検証失敗の結果を生成する | passedがfalseでreasonとdiagnosticsが設定されること | 正常系 |
| UT-HE-034 | `failure` | 検証失敗の結果を生成する | diagnosticsが1件以上あること | 正常系 |
| UT-HE-035 | `equals` | 同一属性の結果同士を比較する | trueを返すこと | 正常系 |
| UT-HE-036 | `success` | 成功結果のdiagnosticsを確認する | diagnosticsが空配列であること | 正常系 |
| UT-HE-037 | `failure` | context: reasonが未指定の場合 | reasonが必須としてエラーになること | 異常系 |
| UT-HE-038 | `failure` | context: diagnosticsが空配列の場合 | diagnostics>=1の制約違反としてエラーになること | 異常系（境界） |
| UT-HE-112 | `failure` | 構文エラーとvalidator再実行失敗を同時に保持する | diagnosticsに構文エラー由来とvalidator失敗由来の両方のエントリが保持され、reasonが非nullであること | 正常系（同時保持確認） |

### 3.6 ErrorDefinition

**ファイル**: `error-definition.test.ts`
**制約数**: 3（defaultAdrRef保持時のadrRefRequired=false拒否、fixExampleRequired時のdefault/explicit必須、defaultSeverity=warningからerrorへの格上げ許容）

| ケースID | target | describe / context | it（期待値） | 種別 |
|---------|--------|-------------------|-------------|------|
| UT-HE-039 | `create` | 全属性を指定してErrorDefinitionを生成する | 全属性が正しく設定されたErrorDefinitionが生成されること | 正常系 |
| UT-HE-040 | `requiresAdrRef` | ADR必須フラグを返す | adrRefRequired=trueの場合にtrueを返すこと | 正常系 |
| UT-HE-041 | `requiresFixExample` | fix_example必須フラグを返す | fixExampleRequired=trueの場合にtrueを返すこと | 正常系 |
| UT-HE-042 | `resolveAdrRef` | 明示的AdrRefが渡された場合にADRを解決する | 明示的に渡されたAdrRefを返すこと | 正常系 |
| UT-HE-043 | `resolveAdrRef` | 明示的AdrRefが未指定でdefaultAdrRefがある場合にADRを解決する | defaultAdrRefを返すこと | 正常系 |
| UT-HE-044 | `resolveAdrRef` | 明示的AdrRefもdefaultAdrRefもない場合にADRを解決する | nullを返すこと | 正常系 |
| UT-HE-045 | `resolveFixExample` | 明示的FixExampleが渡された場合にfix_exampleを解決する | 明示的に渡されたFixExampleを返すこと | 正常系 |
| UT-HE-046 | `resolveFixExample` | 明示的FixExampleが未指定でdefaultFixExampleがある場合にfix_exampleを解決する | defaultFixExampleを返すこと | 正常系 |
| UT-HE-047 | `resolveFixExample` | 明示的FixExampleもdefaultFixExampleもない場合にfix_exampleを解決する | nullを返すこと | 正常系 |
| UT-HE-048 | `equals` | 同一属性のErrorDefinition同士を比較する | trueを返すこと | 正常系 |
| UT-HE-049 | `create` | context: defaultAdrRefを持つがadrRefRequired=falseの場合 | DDD不変条件違反としてエラーをthrowすること | 異常系（Q3回答） |
| UT-HE-050 | `create` | defaultSeverity=warningの定義に対してerrorへの格上げを検証する | 格上げが許容されること | 正常系（契約確認） |
| UT-HE-051 | `create` | context: fixExampleRequired=trueでdefaultFixExampleもexplicitもない場合 | 必須条件違反としてエラーになること | 異常系（境界） |
| UT-HE-052 | `create` | context: ownerValidatorIdが空文字の場合 | 入力不正として拒否されること | 異常系 |

### 3.7 HarnessError（中心モデル）

**ファイル**: `harness-error.test.ts`
**制約数**: 3（不変性、値等価性、Object.freeze適用）

| ケースID | target | describe / context | it（期待値） | 種別 |
|---------|--------|-------------------|-------------|------|
| UT-HE-053 | `equals` | 全フィールドが一致するHarnessError同士を比較する | trueを返すこと | 正常系 |
| UT-HE-054 | `hasAdrRef` | adrRefを持つHarnessErrorのADR保持を確認する | trueを返すこと | 正常系 |
| UT-HE-055 | `hasAdrRef` | adrRefを持たないHarnessErrorのADR保持を確認する | falseを返すこと | 正常系 |
| UT-HE-056 | `hasFixExample` | fixExampleを持つHarnessErrorのfix_example保持を確認する | trueを返すこと | 正常系 |
| UT-HE-057 | `hasFixExample` | fixExampleを持たないHarnessErrorのfix_example保持を確認する | falseを返すこと | 正常系 |
| UT-HE-058 | `toContract` | Shared Kernel公開DTOへ変換する | HarnessErrorContractの全フィールドが正しく投影されること | 正常系 |
| UT-HE-059 | `toContract` | Shared Kernel公開DTOの不変性を確認する | 戻り値がObject.freezeで凍結されていること | 正常系（不変性） |
| UT-HE-060 | `equals` | 全必須属性を持つHarnessErrorの値等価性を確認する | 全フィールドが一致する場合にtrueを返すこと | 正常系 |

---

## 4. ドメインサービステストケース

### 4.1 HarnessErrorFactory

**ファイル**: `harness-error-factory.test.ts`
**メソッド数**: 1（`create`）
**テストダブル**: `AdrExistenceCheckerPort`と`FixExampleValidatorPort`のみ`Promise.resolve()`で即時解決するダブルを使用（QA Q1回答）。`ErrorDefinitionRegistry`、`SeverityContractEnforcer`、各値オブジェクトは実体を使用。

| ケースID | target | describe / context | it（期待値） | 種別 | 対応不変条件 |
|---------|--------|-------------------|-------------|------|------------|
| UT-HE-061 | `create` | 全条件を満たすパラメータからHarnessErrorを生成する | HarnessErrorが正常に生成されること | 正常系 | INV-1〜8 |
| UT-HE-062 | `create` | requestedSeverity未指定時にdefaultSeverityを適用する | ErrorDefinitionのdefaultSeverityが使用されること | 正常系 | INV-3 |
| UT-HE-063 | `create` | warningからerrorへの格上げを検証する | 格上げが許容されerrorのHarnessErrorが生成されること | 正常系 | INV-3 |
| UT-HE-064 | `create` | adrRef省略時にdefaultAdrRefを使用する | ErrorDefinitionのdefaultAdrRefが適用されること | 正常系 | INV-5 |
| UT-HE-065 | `create` | fixExample省略時にdefaultFixExampleを使用する | ErrorDefinitionのdefaultFixExampleが適用されること | 正常系 | INV-7 |
| UT-HE-066 | `create` | 生成されたHarnessErrorの不変性を確認する | Object.freezeで凍結されていること | 正常系 | INV-8 |
| UT-HE-067 | `create` | context: 未登録のErrorCodeが渡された場合 | UnknownErrorDefinitionErrorをthrowすること | 異常系 | INV-2 |
| UT-HE-068 | `create` | context: errorからwarningへの格下げが要求された場合 | SeverityDowngradeViolationErrorをthrowすること | 異常系 | INV-3 |
| UT-HE-069 | `create` | context: adrRefRequired=trueでadr_refが未指定の場合 | MissingAdrRefErrorをthrowすること | 異常系 | INV-5 |
| UT-HE-070 | `create` | context: ADR実在性検証が失敗した場合 | AdrReferenceNotFoundErrorをthrowすること | 異常系 | INV-4 |
| UT-HE-071 | `create` | context: fixExampleRequired=trueでfix_exampleが未指定の場合 | MissingFixExampleErrorをthrowすること | 異常系 | INV-7 |
| UT-HE-072 | `create` | context: fix_example構文検証が失敗した場合 | InvalidFixExampleErrorをthrowすること | 異常系 | INV-6 |
| UT-HE-073 | `create` | context: messageが空文字の場合 | EmptyMessageErrorをthrowすること | 異常系 | - |
| UT-HE-074 | `create` | context: suggestionが空文字の場合 | EmptySuggestionErrorをthrowすること | 異常系 | - |
| UT-HE-075 | `create` | context: adr_refがADR-{nnn}形式に準拠しない場合 | 形式不正としてエラーをthrowすること | 異常系 | INV-4 |
| UT-HE-076 | `create` | context: FixExampleValidatorPortが失敗を返した場合 | InvalidFixExampleErrorをthrowすること | 異常系 | INV-6 |
| UT-HE-077 | `create` | context: AdrExistenceCheckerPortがfalseを返した場合 | AdrReferenceNotFoundErrorをthrowすること | 異常系 | INV-4 |
| UT-HE-078 | `create` | context: ErrorCodeがL{n}-{nnn}形式に準拠しない場合 | InvalidErrorCodeErrorをthrowすること | 異常系 | INV-1 |

#### テストダブル設計

```text
AdrExistenceCheckerPort:
  - 正常系: { exists: () => Promise.resolve(true) }
  - ADR不存在系: { exists: () => Promise.resolve(false) }

FixExampleValidatorPort:
  - 正常系: { validate: () => Promise.resolve(FixExampleValidationResult.success(validatorId)) }
  - 検証失敗系: { validate: () => Promise.resolve(FixExampleValidationResult.failure(validatorId, reason, diagnostics)) }
```

### 4.2 ErrorDefinitionRegistry

**ファイル**: `error-definition-registry.test.ts`
**メソッド数**: 5（`getDefinition`, `getAllDefinitions`, `listByValidator`, `listByLayer`, `hasDefinition`）
**テストダブル**: なし。ErrorDefinition実体を使用。

| ケースID | target | describe / context | it（期待値） | 種別 |
|---------|--------|-------------------|-------------|------|
| UT-HE-079 | `getDefinition` | 登録済みコードに対して定義を取得する | 対応するErrorDefinitionが返されること | 正常系 |
| UT-HE-080 | `getDefinition` | context: 未登録コードが指定された場合 | UnknownErrorDefinitionErrorをthrowすること | 異常系 |
| UT-HE-081 | `getAllDefinitions` | 全定義をcode昇順で返す | code昇順で全定義が返されること | 正常系 |
| UT-HE-082 | `getAllDefinitions` | 全定義の戻り値が読み取り専用であることを確認する | readonly配列が返されること | 正常系 |
| UT-HE-083 | `listByValidator` | 指定validatorIdの定義のみを返す | 該当validatorIdの定義のみが含まれること | 正常系 |
| UT-HE-084 | `listByValidator` | context: 該当するvalidatorIdが存在しない場合 | 空配列を返すこと | 正常系 |
| UT-HE-085 | `listByLayer` | 指定layerの定義のみを返す | 該当layerの定義のみが含まれること | 正常系 |
| UT-HE-086 | `listByLayer` | context: 該当するlayerの定義が存在しない場合 | 空配列を返すこと | 正常系 |
| UT-HE-087 | `hasDefinition` | 登録済みコードの存在を確認する | trueを返すこと | 正常系 |
| UT-HE-088 | `hasDefinition` | 未登録コードの存在を確認する | falseを返すこと | 正常系 |
| UT-HE-089 | constructor | context: 重複codeのErrorDefinitionが渡された場合 | DuplicateErrorCodeErrorをthrowすること | 異常系（Q2回答） |
| UT-HE-090 | `listByValidator` | 戻り値の並び順を確認する | code昇順で返されること | 正常系 |
| UT-HE-091 | `listByLayer` | 戻り値の並び順を確認する | code昇順で返されること | 正常系 |
| UT-HE-092 | constructor | 空の定義配列でレジストリを構築する | 正常に構築されること | 正常系（境界） |

### 4.3 SeverityContractEnforcer

**ファイル**: `severity-contract-enforcer.test.ts`
**メソッド数**: 2（`resolveEffectiveSeverity`, `assertNoDowngrade`）
**テストダブル**: なし。Severity実体を使用。

| ケースID | target | describe / context | it（期待値） | 種別 |
|---------|--------|-------------------|-------------|------|
| UT-HE-093 | `resolveEffectiveSeverity` | requested未指定時にdefaultSeverityを返す | defaultSeverityが返されること | 正常系 |
| UT-HE-094 | `resolveEffectiveSeverity` | requestedがdefaultと同一の場合にrequestedを返す | requestedが返されること | 正常系 |
| UT-HE-095 | `resolveEffectiveSeverity` | warningからerrorへの格上げを検証する | errorが返されること | 正常系 |
| UT-HE-096 | `resolveEffectiveSeverity` | context: errorからwarningへの格下げが要求された場合 | SeverityDowngradeViolationErrorをthrowすること | 異常系 |
| UT-HE-097 | `assertNoDowngrade` | context: 格下げが検出された場合 | SeverityDowngradeViolationErrorをthrowすること | 異常系 |
| UT-HE-098 | `assertNoDowngrade` | 格上げの場合に例外をthrowしないことを確認する | 例外がthrowされないこと | 正常系 |
| UT-HE-099 | `assertNoDowngrade` | 同一severityの場合に例外をthrowしないことを確認する | 例外がthrowされないこと | 正常系 |
| UT-HE-100 | `resolveEffectiveSeverity` | defaultSeverity=error、requested=errorの場合を検証する | errorが返されること | 正常系（境界） |
| UT-HE-101 | `resolveEffectiveSeverity` | defaultSeverity=warning、requested=warningの場合を検証する | warningが返されること | 正常系（境界） |
| UT-HE-102 | `resolveEffectiveSeverity` | context: defaultSeverity=error、requested=warningの場合 | SeverityDowngradeViolationErrorをthrowすること | 異常系 |

---

## 5. Shared Kernel契約テスト

**ファイル**: `harness-error-contract.test.ts`

Shared Kernel公開面（`scripts/harness/shared-kernel/harness-error.ts`）の型ガードと契約DTOの構造を検証する。

### 5.1 isHarnessError型ガード

| ケースID | target | describe / context | it（期待値） | 種別 |
|---------|--------|-------------------|-------------|------|
| UT-HE-103 | `isHarnessError` | 全必須フィールドを持つオブジェクトを検証する | trueを返すこと | 正常系 |
| UT-HE-104 | `isHarnessError` | adr_refとfix_exampleを含むオブジェクトを検証する | trueを返すこと | 正常系 |
| UT-HE-105 | `isHarnessError` | context: codeフィールドが欠落している場合 | falseを返すこと | 異常系 |
| UT-HE-106 | `isHarnessError` | context: severityが不正な値の場合 | falseを返すこと | 異常系 |
| UT-HE-107 | `isHarnessError` | context: nullが渡された場合 | falseを返すこと | 異常系 |
| UT-HE-108 | `isHarnessError` | context: undefinedが渡された場合 | falseを返すこと | 異常系 |
| UT-HE-109 | `isHarnessError` | context: プリミティブ値（文字列）が渡された場合 | falseを返すこと | 異常系 |

### 5.2 HarnessErrorContract構造

| ケースID | target | describe / context | it（期待値） | 種別 |
|---------|--------|-------------------|-------------|------|
| UT-HE-110 | `HarnessErrorContract` | HarnessError.toContract()の戻り値が契約形式に準拠する | code, severity, message, suggestion, adr_ref, fix_exampleの各フィールドが文字列として投影されていること | 正常系 |
| UT-HE-111 | `HarnessErrorContract` | 契約DTOのseverityがreadonlyである | readonlyプロパティとして変更不可であること | 正常系（不変性） |

---

## 6. 境界値・異常系

### 6.1 境界値テスト対象一覧

| 対象 | 境界値 | 該当ケースID |
|------|-------|-------------|
| ErrorCode.layer | L0（最小）、L4（最大）、L5（範囲外） | UT-HE-001, UT-HE-002, UT-HE-009 |
| ErrorCode.sequence | 001（最小3桁）、999（最大3桁）、0001（4桁） | UT-HE-001, UT-HE-002, UT-HE-003 |
| ErrorCode.sequence | 01（2桁=桁数不足） | UT-HE-011 |
| AdrRef | ADR-001（最小）、ADR-999（最大）、ADR-0001（4桁=形式外） | UT-HE-021, UT-HE-024 |
| FixExample.value | 空文字、空白のみ、1文字（最小有効値） | UT-HE-027, UT-HE-030, UT-HE-031 |
| Severity | error（rank=2）、warning（rank=1）、info（範囲外） | UT-HE-013, UT-HE-014, UT-HE-019 |
| FixExampleValidationResult.diagnostics | 空配列（境界）、1件（最小有効値） | UT-HE-034, UT-HE-038 |
| ErrorDefinitionRegistry | 空配列（0件）、重複code | UT-HE-092, UT-HE-089 |
| SeverityContractEnforcer | 同一severity同士（境界） | UT-HE-100, UT-HE-101 |

### 6.2 ドメインエラー分類

| エラークラス | 親クラス | 発生箇所 | 該当ケースID |
|------------|---------|---------|-------------|
| InvalidErrorCodeError | HarnessErrorDomainError | ErrorCode.create | UT-HE-008〜012, UT-HE-078 |
| UnknownErrorDefinitionError | HarnessErrorDomainError | ErrorDefinitionRegistry.getDefinition, HarnessErrorFactory.create | UT-HE-067, UT-HE-080 |
| SeverityDowngradeViolationError | HarnessErrorDomainError | SeverityContractEnforcer, HarnessErrorFactory.create | UT-HE-068, UT-HE-096, UT-HE-097, UT-HE-102 |
| MissingAdrRefError | HarnessErrorDomainError | HarnessErrorFactory.create | UT-HE-069 |
| AdrReferenceNotFoundError | HarnessErrorDomainError | HarnessErrorFactory.create | UT-HE-070, UT-HE-077 |
| MissingFixExampleError | HarnessErrorDomainError | HarnessErrorFactory.create | UT-HE-071 |
| InvalidFixExampleError | HarnessErrorDomainError | HarnessErrorFactory.create | UT-HE-072, UT-HE-076 |
| EmptyMessageError | HarnessErrorDomainError | HarnessErrorFactory.create | UT-HE-073 |
| EmptySuggestionError | HarnessErrorDomainError | HarnessErrorFactory.create | UT-HE-074 |
| DuplicateErrorCodeError | HarnessErrorDomainError | ErrorDefinitionRegistry constructor | UT-HE-089 |

---

## 7. テスト環境設定

### 7.1 フレームワーク

- **Vitest**: 3.0.0
- **設定**: `scripts/harness/__tests__/vitest.config.ts`（共有設定）

### 7.2 ヘルパー

- `target`: `describe`のエイリアス。テスト対象メソッドを記述する
- `context`: `describe`のエイリアス。前提条件を記述する
- インポート元: `../../helper/common-helper`

### 7.3 テスト規約の適用

| 規約 | 適用方法 |
|------|---------|
| テストケース名は日本語 | 全itブロックを日本語で記述する |
| AAAパターン | 全テストケースで`// Arrange` / `// Act` / `// Assert`コメントを明示する |
| Act結果は`actual`変数 | テスト実行結果を`actual`に代入する |
| ドメイン実体のモック禁止 | 値オブジェクト・ドメインサービスは全て実体を使用する |
| Portのみモック使用可 | `AdrExistenceCheckerPort`と`FixExampleValidatorPort`のみテストダブルを使用する |
| ファイル名はkebab-case | `error-code.test.ts`、`harness-error-factory.test.ts`等 |
| describe/it構造 | `target` / `describe` / `context` / `it`パターンを使用する |
| 実装の詳細をテストケース名に表さない | 内部プロパティ名やクラス名に依存しない仕様表現を使う |

### 7.4 テストダブル方針

| Port | テストダブル種別 | 解決方式 | 根拠 |
|------|---------------|---------|------|
| AdrExistenceCheckerPort | Stub | `Promise.resolve(true/false)` 同期即時解決 | QA Q1回答 |
| FixExampleValidatorPort | Stub | `Promise.resolve(FixExampleValidationResult)` 同期即時解決 | QA Q1回答 |

非同期の振る舞い（タイムアウト、遅延、並行実行等）はIT層で検証する。

### 7.5 テストデータ戦略

- ErrorDefinitionの属性数が多い（9属性）ため、テストヘルパーまたはオブジェクトマザーパターンでデフォルト値付きファクトリを用意する
- HarnessErrorFactoryのPort依存テストでは、テスト対象外のPortは常時成功を返すダブルを使用し、テスト対象のPortのみ挙動を切り替える

### 7.6 合計テストケース数

| カテゴリ | ケース数 |
|---------|---------|
| 値オブジェクト（ErrorCode） | 12 |
| 値オブジェクト（Severity） | 8 |
| 値オブジェクト（AdrRef） | 6 |
| 値オブジェクト（FixExample） | 5 |
| 値オブジェクト（FixExampleValidationResult） | 8 |
| 値オブジェクト（ErrorDefinition） | 14 |
| 値オブジェクト（HarnessError） | 8 |
| ドメインサービス（HarnessErrorFactory） | 18 |
| ドメインサービス（ErrorDefinitionRegistry） | 14 |
| ドメインサービス（SeverityContractEnforcer） | 10 |
| Shared Kernel契約テスト | 9 |
| **合計** | **112** |
