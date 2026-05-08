# ユニットテスト設計: adr-foundation

@story-id H05-01
@story-id H05-02
@story-id H05-03
> **Unit ID**: adr-foundation
> **作成日**: 2026-03-13
> **フェーズ**: Phase 2（確定版）
> **正規ソース**: `domain_model.md`（INV-1〜INV-6）, `logical_design.md`（INV-7, INV-8, 全メソッド仕様）
> **テスト規約**: `docs/principles/testing-rules.md`
> **総テストケース数**: 139件

---

## 1. 対象ドメインモデル

本設計はadr-foundation Unitのdomain層を対象とする。テスト対象は以下のとおり。

| 分類 | コンポーネント | 不変条件/制約 | テストケース数 |
|------|--------------|-------------|-------------|
| 集約 | ADR | INV-1〜INV-8 | 35件 |
| 値オブジェクト | AdrId | 4制約 | 12件 |
| 値オブジェクト | AdrStatus | 3制約 | 14件 |
| 値オブジェクト | AdrFrontmatter | 6制約 | 16件 |
| 値オブジェクト | AdrBody | 3制約 | 10件 |
| 値オブジェクト | ArchgateEntry | 3制約 | 10件 |
| 値オブジェクト | ArchgateMapping | 3制約 | 12件 |
| 値オブジェクト | SupersededByRef | 2制約 | 5件 |
| 値オブジェクト | AdrFilePath | 4制約 | 10件 |
| ドメインサービス | AdrValidationService | 3メソッド | 15件 |
| **合計** | | | **139件** |

### QA回答の反映

| QA ID | 質問要旨 | 回答 | 反映先 |
|-------|---------|------|--------|
| Q-UT-1 | `compare()` の昇順ソート前提 | 昇順。`compare(a,b)`: a<b で負、a===b で 0、a>b で正。`Array.sort()` と同契約 | UT-AF-011, UT-AF-012 |
| Q-UT-2 | `transitionStatus()` のイミュータブル設計 | イミュータブル。新インスタンスを返す。元インスタンスは不変 | UT-AF-040, UT-AF-041 |
| Q-UT-3 | `errorCode` 正規表現は3桁固定 | `^L[0-4]-\d{3}$`（3桁固定）。4桁以上は異常系 | UT-AF-063, UT-AF-064, UT-AF-125 |

---

## 2. テストファイル構成

```
scripts/harness/__tests__/unit/adr-foundation/
├── adr.test.ts
├── adr-id.test.ts
├── adr-status.test.ts
├── adr-frontmatter.test.ts
├── adr-body.test.ts
├── archgate-entry.test.ts
├── archgate-mapping.test.ts
├── superseded-by-ref.test.ts
├── adr-file-path.test.ts
└── adr-validation-service.test.ts
```

### テスト共通方針

- テストフレームワーク: Vitest 3.0.0
- テストケース名: 日本語
- 構造: `target / describe / context / it`（`target`, `context` はdescribeエイリアス）
- パターン: AAA（Arrange / Act / Assert）
- 実行結果変数名: `actual`
- domain層: モック禁止、全て実体を使用
- `AdrValidationService` はドメインサービスのため実体を注入

---

## 3. 集約テストケース: ADR (`adr.test.ts`)

### 不変条件一覧

| ID | 不変条件 |
|----|----------|
| INV-1 | `AdrId` は `NNN` の3桁数字で一意 |
| INV-2 | `AdrStatus` は4つの有効値のいずれか |
| INV-3 | `Superseded` の場合は `superseded_by` が必須 |
| INV-4 | 許可された状態遷移のみ実行できる |
| INV-5 | `archgate.enforced_by[*].error_code` は `L{n}-{nnn}` 形式 |
| INV-6 | 外部公開参照は必ず `ADR-{NNN}` 形式 |
| INV-7 | `archgate.enforced_by` の `(validator_id, error_code)` 組は重複不可 |
| INV-8 | 本文は `Context / Decision / Consequences` 必須、`Alternatives` 任意 |

### 3.1 `create()` / `reconstitute()`

| ケースID | target | describe | context | it | 検証する不変条件 |
|----------|--------|----------|---------|----|--------------:|
| UT-AF-001 | `create` | ADR集約を生成する | 正常なfrontmatterとbodyが渡された場合 | ADR集約が生成される | INV-1〜INV-8 |
| UT-AF-002 | `create` | ADR集約を生成する | archgate付きfrontmatterが渡された場合 | archgateを保持したADR集約が生成される | INV-5, INV-7 |
| UT-AF-003 | `create` | ADR集約を生成する | frontmatterのtitleが空文字の場合 | AdrValidationErrorがスローされる | INV-1 |
| UT-AF-004 | `create` | ADR集約を生成する | bodyの必須セクションが欠落している場合 | AdrBodySectionRequiredErrorがスローされる | INV-8 |
| UT-AF-005 | `create` | ADR集約を生成する | archgateのerrorCodeが不正形式の場合 | InvalidArchgateErrorCodeErrorがスローされる | INV-5 |
| UT-AF-006 | `create` | ADR集約を生成する | archgateに重複エントリがある場合 | DuplicateArchgateEntryErrorがスローされる | INV-7 |
| UT-AF-007 | `reconstitute` | 永続化済みADRを再構築する | 正常なデータの場合 | ADR集約が再構築される | INV-1〜INV-8 |
| UT-AF-008 | `reconstitute` | 永続化済みADRを再構築する | 不正なデータの場合 | MalformedAdrDocumentErrorがスローされる | INV-1〜INV-8 |

### 3.2 状態遷移メソッド

| ケースID | target | describe | context | it | 検証する不変条件 |
|----------|--------|----------|---------|----|--------------:|
| UT-AF-009 | `approve` | ADRを承認する | ステータスがProposedの場合 | ステータスがAcceptedに遷移する | INV-2, INV-4 |
| UT-AF-010 | `approve` | ADRを承認する | ステータスがAcceptedの場合 | InvalidAdrStatusTransitionErrorがスローされる | INV-4 |
| UT-AF-011 | `approve` | ADRを承認する | ステータスがDeprecatedの場合 | InvalidAdrStatusTransitionErrorがスローされる | INV-4 |
| UT-AF-012 | `approve` | ADRを承認する | ステータスがSupersededの場合 | InvalidAdrStatusTransitionErrorがスローされる | INV-4 |
| UT-AF-013 | `deprecate` | ADRを非推奨にする | ステータスがProposedの場合 | ステータスがDeprecatedに遷移する | INV-2, INV-4 |
| UT-AF-014 | `deprecate` | ADRを非推奨にする | ステータスがAcceptedの場合 | ステータスがDeprecatedに遷移する | INV-2, INV-4 |
| UT-AF-015 | `deprecate` | ADRを非推奨にする | ステータスがSupersededの場合 | InvalidAdrStatusTransitionErrorがスローされる | INV-4 |
| UT-AF-016 | `deprecate` | ADRを非推奨にする | ステータスがDeprecatedの場合 | InvalidAdrStatusTransitionErrorがスローされる | INV-4 |
| UT-AF-017 | `supersede` | ADRを後継に置換する | ステータスがAcceptedで異なるAdrIdが渡された場合 | ステータスがSupersededに遷移しsuperseded_byが設定される | INV-2, INV-3, INV-4 |
| UT-AF-018 | `supersede` | ADRを後継に置換する | 自分自身のAdrIdが渡された場合 | SelfSupersedeNotAllowedErrorがスローされる | INV-1 |
| UT-AF-019 | `supersede` | ADRを後継に置換する | ステータスがProposedの場合 | InvalidAdrStatusTransitionErrorがスローされる | INV-4 |
| UT-AF-020 | `supersede` | ADRを後継に置換する | ステータスがDeprecatedの場合 | InvalidAdrStatusTransitionErrorがスローされる | INV-4 |
| UT-AF-021 | `supersede` | ADRを後継に置換する | ステータスがSupersededの場合 | InvalidAdrStatusTransitionErrorがスローされる | INV-4 |
| UT-AF-022 | `repropose` | ADRを再提案する | ステータスがDeprecatedの場合 | ステータスがProposedに遷移する | INV-2, INV-4 |
| UT-AF-023 | `repropose` | ADRを再提案する | ステータスがAcceptedの場合 | InvalidAdrStatusTransitionErrorがスローされる | INV-4 |
| UT-AF-024 | `repropose` | ADRを再提案する | ステータスがProposedの場合 | InvalidAdrStatusTransitionErrorがスローされる | INV-4 |
| UT-AF-025 | `repropose` | ADRを再提案する | ステータスがSupersededの場合 | InvalidAdrStatusTransitionErrorがスローされる | INV-4 |

### 3.3 `updateBody()` / `replaceArchgate()`

| ケースID | target | describe | context | it | 検証する不変条件 |
|----------|--------|----------|---------|----|--------------:|
| UT-AF-026 | `updateBody` | 本文を更新する | 正常なAdrBodyが渡された場合 | 本文が更新される | INV-8 |
| UT-AF-027 | `updateBody` | 本文を更新する | 必須セクションが欠落したAdrBodyの場合 | AdrBodySectionRequiredErrorがスローされる | INV-8 |
| UT-AF-028 | `replaceArchgate` | archgateを設定する | 正常なArchgateMappingが渡された場合 | archgateが設定される | INV-5, INV-7 |
| UT-AF-029 | `replaceArchgate` | archgateを削除する | undefinedが渡された場合 | archgateが未設定になる | — |
| UT-AF-030 | `replaceArchgate` | archgateを設定する | errorCodeが不正形式の場合 | InvalidArchgateErrorCodeErrorがスローされる | INV-5 |
| UT-AF-031 | `replaceArchgate` | archgateを設定する | 重複エントリがある場合 | DuplicateArchgateEntryErrorがスローされる | INV-7 |

### 3.4 getterメソッド / `toAdrRef()`

| ケースID | target | describe | context | it | 検証する不変条件 |
|----------|--------|----------|---------|----|--------------:|
| UT-AF-032 | `getStatus` | 現在のステータスを返す | — | AdrStatusが返される | — |
| UT-AF-033 | `getArchgate` | archgateを返す | archgateが設定されている場合 | ArchgateMappingが返される | — |
| UT-AF-034 | `getArchgate` | archgateを返す | archgateが未設定の場合 | undefinedが返される | — |
| UT-AF-035 | `getFrontmatter` | frontmatterを返す | — | AdrFrontmatterが返される | — |
| UT-AF-036 | `getBody` | 本文を返す | — | AdrBodyが返される | — |
| UT-AF-037 | `toAdrRef` | ADR参照表記を返す | — | `ADR-{NNN}` 形式の文字列が返される | INV-6 |

---

## 4. 値オブジェクトテストケース

### 4.1 AdrId (`adr-id.test.ts`) — 12件

| ケースID | target | describe | context | it |
|----------|--------|----------|---------|-----|
| UT-AF-038 | `create` | AdrIdを生成する | 3桁数字文字列 `"001"` が渡された場合 | 正規化されたAdrIdが生成される |
| UT-AF-039 | `create` | AdrIdを生成する | ADR-prefix付き `"ADR-001"` が渡された場合 | prefixが除去されて `"001"` で保持される |
| UT-AF-040 | `create` | AdrIdを生成する | `"000"` が渡された場合 | エラーがスローされる |
| UT-AF-041 | `create` | AdrIdを生成する | 非数字文字列 `"abc"` が渡された場合 | エラーがスローされる |
| UT-AF-042 | `create` | AdrIdを生成する | 空文字が渡された場合 | エラーがスローされる |
| UT-AF-043 | `create` | AdrIdを生成する | 2桁 `"01"` が渡された場合 | エラーがスローされる |
| UT-AF-044 | `fromAdrRef` | ADR参照からAdrIdを生成する | `"ADR-001"` が渡された場合 | `"001"` のAdrIdが生成される |
| UT-AF-045 | `toNumber` | 数値に変換する | `"001"` のAdrIdの場合 | `1` が返される |
| UT-AF-046 | `toAdrRef` | ADR参照形式を返す | `"001"` のAdrIdの場合 | `"ADR-001"` が返される |
| UT-AF-047 | `equals` | 等価性を比較する | 同じ値のAdrId同士の場合 | trueが返される |
| UT-AF-048 | `equals` | 等価性を比較する | 異なる値のAdrId同士の場合 | falseが返される |
| UT-AF-049 | `compare` | ソート用比較を行う | AdrId `"001"` と `"002"` を比較した場合 | 負の値が返される（昇順） |

### 4.2 AdrStatus (`adr-status.test.ts`) — 14件

| ケースID | target | describe | context | it |
|----------|--------|----------|---------|-----|
| UT-AF-050 | `create` | AdrStatusを生成する | `"Proposed"` が渡された場合 | Proposed状態のAdrStatusが生成される |
| UT-AF-051 | `create` | AdrStatusを生成する | `"Accepted"` が渡された場合 | Accepted状態のAdrStatusが生成される |
| UT-AF-052 | `create` | AdrStatusを生成する | `"Deprecated"` が渡された場合 | Deprecated状態のAdrStatusが生成される |
| UT-AF-053 | `create` | AdrStatusを生成する | `"Superseded"` が渡された場合 | Superseded状態のAdrStatusが生成される |
| UT-AF-054 | `create` | AdrStatusを生成する | 小文字 `"proposed"` が渡された場合 | エラーがスローされる |
| UT-AF-055 | `create` | AdrStatusを生成する | 無効な文字列 `"Invalid"` が渡された場合 | エラーがスローされる |
| UT-AF-056 | `proposed` | ファクトリメソッドでProposedを生成する | — | Proposed状態のAdrStatusが生成される |
| UT-AF-057 | `accepted` | ファクトリメソッドでAcceptedを生成する | — | Accepted状態のAdrStatusが生成される |
| UT-AF-058 | `canTransitionTo` | 遷移可否を判定する | ProposedからAcceptedへの遷移 | trueが返される |
| UT-AF-059 | `canTransitionTo` | 遷移可否を判定する | ProposedからDeprecatedへの遷移 | trueが返される |
| UT-AF-060 | `canTransitionTo` | 遷移可否を判定する | AcceptedからSupersededへの遷移 | trueが返される |
| UT-AF-061 | `canTransitionTo` | 遷移可否を判定する | ProposedからSupersededへの遷移 | falseが返される |
| UT-AF-062 | `equals` | 等価性を比較する | 同じステータス同士の場合 | trueが返される |
| UT-AF-063 | `isSuperseded` | Superseded状態を判定する | Superseded状態の場合 | trueが返される |

### 4.3 AdrFrontmatter (`adr-frontmatter.test.ts`) — 16件

| ケースID | target | describe | context | it |
|----------|--------|----------|---------|-----|
| UT-AF-064 | `create` | AdrFrontmatterを生成する | 全必須項目が正常に指定された場合 | AdrFrontmatterが生成される |
| UT-AF-065 | `create` | AdrFrontmatterを生成する | titleが空文字の場合 | エラーがスローされる |
| UT-AF-066 | `create` | AdrFrontmatterを生成する | dateが不正形式 `"2026-1-1"` の場合 | エラーがスローされる |
| UT-AF-067 | `create` | AdrFrontmatterを生成する | status=Supersededでsuperseded_byが未指定の場合 | エラーがスローされる |
| UT-AF-068 | `create` | AdrFrontmatterを生成する | status=Acceptedでsuperseded_byが指定された場合 | superseded_byが未設定に正規化される |
| UT-AF-069 | `create` | AdrFrontmatterを生成する | archgate.adrIdと自身のadrIdが不一致の場合 | エラーがスローされる |
| UT-AF-070 | `create` | AdrFrontmatterを生成する | archgate付きで正常に指定された場合 | archgateを保持したAdrFrontmatterが生成される |
| UT-AF-071 | `transitionStatus` | ステータスを遷移する | ProposedからAcceptedへの正常遷移の場合 | 新しいAdrFrontmatterインスタンスが返される |
| UT-AF-072 | `transitionStatus` | ステータスを遷移する | 遷移後に元インスタンスを確認した場合 | 元インスタンスのステータスは変更されていない |
| UT-AF-073 | `transitionStatus` | ステータスを遷移する | 不正な遷移の場合 | エラーがスローされる |
| UT-AF-074 | `withSupersededBy` | 後継ADR参照を設定する | SupersededByRefが渡された場合 | superseded_byが設定された新インスタンスが返される |
| UT-AF-075 | `withArchgate` | archgateを設定する | ArchgateMappingが渡された場合 | archgateが設定された新インスタンスが返される |
| UT-AF-076 | `withArchgate` | archgateを削除する | undefinedが渡された場合 | archgateが未設定の新インスタンスが返される |
| UT-AF-077 | `toPrimitives` | プリミティブ値に変換する | 全項目が設定されている場合 | 各フィールドがプリミティブ型で返される |
| UT-AF-078 | `toPrimitives` | プリミティブ値に変換する | archgateが未設定の場合 | archgateフィールドが含まれない |
| UT-AF-079 | `toPrimitives` | プリミティブ値に変換する | superseded_byが未設定の場合 | superseded_byフィールドが含まれない |

### 4.4 AdrBody (`adr-body.test.ts`) — 10件

| ケースID | target | describe | context | it |
|----------|--------|----------|---------|-----|
| UT-AF-080 | `create` | AdrBodyを生成する | 必須3セクションが指定された場合 | AdrBodyが生成される |
| UT-AF-081 | `create` | AdrBodyを生成する | contextが空文字の場合 | エラーがスローされる |
| UT-AF-082 | `create` | AdrBodyを生成する | decisionが空文字の場合 | エラーがスローされる |
| UT-AF-083 | `create` | AdrBodyを生成する | consequencesが空文字の場合 | エラーがスローされる |
| UT-AF-084 | `create` | AdrBodyを生成する | alternatives未指定の場合 | alternativesがundefinedで正常に生成される |
| UT-AF-085 | `create` | AdrBodyを生成する | alternativesが空白のみの場合 | エラーがスローされる |
| UT-AF-086 | `withAlternatives` | 代替案を設定する | 文字列が渡された場合 | alternativesが設定された新インスタンスが返される |
| UT-AF-087 | `withAlternatives` | 代替案を削除する | undefinedが渡された場合 | alternativesが未設定の新インスタンスが返される |
| UT-AF-088 | `toSectionMap` | セクションマップに変換する | 全セクションが設定されている場合 | 4セクションのRecordが返される |
| UT-AF-089 | `equals` | 等価性を比較する | 同じ内容のAdrBody同士の場合 | trueが返される |

### 4.5 ArchgateEntry (`archgate-entry.test.ts`) — 10件

| ケースID | target | describe | context | it |
|----------|--------|----------|---------|-----|
| UT-AF-090 | `create` | ArchgateEntryを生成する | validatorIdがkebab-case、errorCodeがL{n}-{nnn}形式の場合 | ArchgateEntryが生成される |
| UT-AF-091 | `create` | ArchgateEntryを生成する | validatorIdが空文字の場合 | エラーがスローされる |
| UT-AF-092 | `create` | ArchgateEntryを生成する | validatorIdがcamelCaseの場合 | エラーがスローされる |
| UT-AF-093 | `create` | ArchgateEntryを生成する | validatorIdが大文字を含む場合 | エラーがスローされる |
| UT-AF-094 | `create` | ArchgateEntryを生成する | errorCodeが `"L5-001"` の場合 | エラーがスローされる（レイヤ範囲外） |
| UT-AF-095 | `create` | ArchgateEntryを生成する | errorCodeが `"L1-01"` の場合 | エラーがスローされる（2桁） |
| UT-AF-096 | `create` | ArchgateEntryを生成する | errorCodeが `"X1-001"` の場合 | エラーがスローされる（prefix不正） |
| UT-AF-097 | `matchesValidatorId` | validatorIdの一致を判定する | 一致するvalidatorIdの場合 | trueが返される |
| UT-AF-098 | `matchesErrorCode` | errorCodeの一致を判定する | 一致するerrorCodeの場合 | trueが返される |
| UT-AF-099 | `equals` | 等価性を比較する | 同じ内容のArchgateEntry同士の場合 | trueが返される |

### 4.6 ArchgateMapping (`archgate-mapping.test.ts`) — 12件

| ケースID | target | describe | context | it |
|----------|--------|----------|---------|-----|
| UT-AF-100 | `create` | ArchgateMappingを生成する | enforcedByが1件以上の場合 | ArchgateMappingが生成される |
| UT-AF-101 | `create` | ArchgateMappingを生成する | enforcedByが複数件の場合 | 全エントリを保持したArchgateMappingが生成される |
| UT-AF-102 | `create` | ArchgateMappingを生成する | enforcedByが空配列の場合 | エラーがスローされる |
| UT-AF-103 | `create` | ArchgateMappingを生成する | enforcedByに重複エントリがある場合 | DuplicateArchgateEntryErrorがスローされる |
| UT-AF-104 | `findByValidatorId` | validatorIdでエントリを検索する | 一致するエントリが存在する場合 | 一致するArchgateEntry配列が返される |
| UT-AF-105 | `findByValidatorId` | validatorIdでエントリを検索する | 一致するエントリが存在しない場合 | 空配列が返される |
| UT-AF-106 | `findByErrorCode` | errorCodeでエントリを検索する | 一致するエントリが存在する場合 | 一致するArchgateEntry配列が返される |
| UT-AF-107 | `findByErrorCode` | errorCodeでエントリを検索する | 一致するエントリが存在しない場合 | 空配列が返される |
| UT-AF-108 | `hasEntry` | エントリの存在を判定する | 指定のvalidatorIdとerrorCodeが存在する場合 | trueが返される |
| UT-AF-109 | `hasEntry` | エントリの存在を判定する | 指定のvalidatorIdとerrorCodeが存在しない場合 | falseが返される |
| UT-AF-110 | `toPrimitives` | プリミティブ値に変換する | 複数エントリがある場合 | enforced_by配列がプリミティブ型で返される |
| UT-AF-111 | `toPrimitives` | プリミティブ値に変換する | 1件のエントリの場合 | enforced_by配列が1要素で返される |

### 4.7 SupersededByRef (`superseded-by-ref.test.ts`) — 5件

| ケースID | target | describe | context | it |
|----------|--------|----------|---------|-----|
| UT-AF-112 | `create` | SupersededByRefを生成する | 有効なAdrIdが渡された場合 | SupersededByRefが生成される |
| UT-AF-113 | `toAdrRef` | ADR参照形式を返す | AdrId `"002"` のSupersededByRefの場合 | `"ADR-002"` が返される |
| UT-AF-114 | `equals` | 等価性を比較する | 同じAdrIdのSupersededByRef同士の場合 | trueが返される |
| UT-AF-115 | `equals` | 等価性を比較する | 異なるAdrIdのSupersededByRef同士の場合 | falseが返される |
| UT-AF-116 | `create` | SupersededByRefを生成する | AdrIdのadrRef形式が保持されることを確認する場合 | 内部のAdrIdがtoAdrRef()で正しく返される |

### 4.8 AdrFilePath (`adr-file-path.test.ts`) — 10件

| ケースID | target | describe | context | it |
|----------|--------|----------|---------|-----|
| UT-AF-117 | `create` | AdrFilePathを生成する | `"docs/ADR/001-some-title.md"` が渡された場合 | AdrFilePathが生成される |
| UT-AF-118 | `create` | AdrFilePathを生成する | `"docs/ADR/template.md"` が渡された場合 | エラーがスローされる |
| UT-AF-119 | `create` | AdrFilePathを生成する | パス形式が不正 `"invalid/path.md"` の場合 | エラーがスローされる |
| UT-AF-120 | `create` | AdrFilePathを生成する | 拡張子が `.txt` の場合 | エラーがスローされる |
| UT-AF-121 | `create` | AdrFilePathを生成する | basenameの先頭が3桁数字-でない場合 | エラーがスローされる |
| UT-AF-122 | `fromAdr` | AdrIdとタイトルからAdrFilePathを生成する | AdrId `"001"` とタイトルが渡された場合 | `"docs/ADR/001-{slug}.md"` 形式のパスが生成される |
| UT-AF-123 | `getAdrId` | パスからAdrIdを抽出する | `"docs/ADR/001-some-title.md"` のAdrFilePathの場合 | `"001"` のAdrIdが返される |
| UT-AF-124 | `toString` | パス文字列を返す | — | 保持しているパス文字列が返される |
| UT-AF-125 | `equals` | 等価性を比較する | 同じパスのAdrFilePath同士の場合 | trueが返される |
| UT-AF-126 | `equals` | 等価性を比較する | 異なるパスのAdrFilePath同士の場合 | falseが返される |

---

## 5. ドメインサービステストケース: AdrValidationService (`adr-validation-service.test.ts`)

### 5.1 `validateFrontmatter()` — 6件

| ケースID | target | describe | context | it |
|----------|--------|----------|---------|-----|
| UT-AF-127 | `validateFrontmatter` | frontmatterを検証する | 全項目が正常な場合 | 例外がスローされない |
| UT-AF-128 | `validateFrontmatter` | frontmatterを検証する | 必須項目が欠落している場合 | AdrValidationErrorがスローされる |
| UT-AF-129 | `validateFrontmatter` | frontmatterを検証する | status=Supersededでsuperseded_byが未設定の場合 | SupersededByRequiredErrorがスローされる |
| UT-AF-130 | `validateFrontmatter` | frontmatterを検証する | archgate.adrIdがfrontmatterのadrIdと不一致の場合 | AdrValidationErrorがスローされる |
| UT-AF-131 | `validateFrontmatter` | frontmatterを検証する | archgateのerrorCodeが不正形式の場合 | InvalidArchgateErrorCodeErrorがスローされる |
| UT-AF-132 | `validateFrontmatter` | frontmatterを検証する | archgateに重複エントリがある場合 | DuplicateArchgateEntryErrorがスローされる |

### 5.2 `validateBody()` — 4件

| ケースID | target | describe | context | it |
|----------|--------|----------|---------|-----|
| UT-AF-133 | `validateBody` | 本文を検証する | 必須3セクションが正常な場合 | 例外がスローされない |
| UT-AF-134 | `validateBody` | 本文を検証する | context/decision/consequencesのいずれかが空の場合 | AdrBodySectionRequiredErrorがスローされる |
| UT-AF-135 | `validateBody` | 本文を検証する | alternativesが空白のみの場合 | AdrBodySectionRequiredErrorがスローされる |
| UT-AF-136 | `validateBody` | 本文を検証する | alternativesが未指定の場合 | 例外がスローされない |

### 5.3 `validateArchgate()` — 3件

| ケースID | target | describe | context | it |
|----------|--------|----------|---------|-----|
| UT-AF-137 | `validateArchgate` | archgateを検証する | 正常なArchgateMappingの場合 | 例外がスローされない |
| UT-AF-138 | `validateArchgate` | archgateを検証する | errorCodeが不正形式の場合 | InvalidArchgateErrorCodeErrorがスローされる |
| UT-AF-139 | `validateArchgate` | archgateを検証する | 重複エントリがある場合 | DuplicateArchgateEntryErrorがスローされる |

---

## 6. ドメインエラーテストケース

ドメインエラーのスロー検証は各コンポーネントテスト内で実施する。以下はエラー種別と検証箇所の対応表。

| エラークラス | 発生元 | 検証ケースID |
|-------------|--------|-------------|
| `AdrValidationError` | ADR.create, ADR.reconstitute, AdrValidationService.validateFrontmatter | UT-AF-003, UT-AF-008, UT-AF-128, UT-AF-130 |
| `MalformedAdrDocumentError` | ADR.reconstitute | UT-AF-008 |
| `InvalidAdrStatusError` | AdrStatus.create | UT-AF-054, UT-AF-055 |
| `InvalidAdrStatusTransitionError` | ADR.approve, ADR.deprecate, ADR.supersede, ADR.repropose | UT-AF-010〜012, UT-AF-015〜016, UT-AF-019〜021, UT-AF-023〜025 |
| `InvalidArchgateErrorCodeError` | ADR.create, ADR.replaceArchgate, AdrValidationService | UT-AF-005, UT-AF-030, UT-AF-131, UT-AF-138 |
| `DuplicateArchgateEntryError` | ADR.create, ADR.replaceArchgate, ArchgateMapping.create, AdrValidationService | UT-AF-006, UT-AF-031, UT-AF-103, UT-AF-132, UT-AF-139 |
| `SelfSupersedeNotAllowedError` | ADR.supersede | UT-AF-018 |
| `SupersededByRequiredError` | AdrValidationService.validateFrontmatter | UT-AF-129 |
| `AdrBodySectionRequiredError` | ADR.updateBody, AdrValidationService.validateBody | UT-AF-027, UT-AF-134, UT-AF-135 |

### エラー検証方針

- 各エラーはドメイン固有の例外クラスとしてスローされることを `expect(...).toThrow(XxxError)` で検証する
- エラーメッセージの内容検証は実装詳細に依存するため、テストケース名には含めない
- エラーが正しいクラスのインスタンスであることの型チェックのみ行う

---

## 7. 境界値・異常系

### 7.1 AdrId 境界値

| ケースID | 入力 | 期待 | 観点 |
|----------|------|------|------|
| UT-AF-040 | `"000"` | エラー | 下限外（0は不許可） |
| UT-AF-038 | `"001"` | 正常 | 下限（最小有効値） |
| — (UT-AF-038内) | `"999"` | 正常 | 上限（最大3桁） |
| UT-AF-043 | `"01"` | エラー | 桁数不足 |

### 7.2 AdrId `compare()` 境界値

| ケースID | 比較 | 期待 | 観点 |
|----------|------|------|------|
| UT-AF-049 | `"001"` vs `"002"` | 負の値 | 昇順ソート: a < b |
| — (UT-AF-049付近) | `"002"` vs `"001"` | 正の値 | 昇順ソート: a > b |
| — (UT-AF-049付近) | `"001"` vs `"001"` | 0 | 等価 |

> `compare()` はQ-UT-1回答に基づき `Array.sort()` 標準比較関数契約。UT-AF-049で代表検証。

### 7.3 AdrStatus 遷移表マトリクス

| 現在 \ 遷移先 | Proposed | Accepted | Deprecated | Superseded |
|--------------|----------|----------|------------|------------|
| **Proposed** | UT-AF-024 (NG) | UT-AF-058 (OK) | UT-AF-059 (OK) | UT-AF-061 (NG) |
| **Accepted** | — (NG) | — (NG) | UT-AF-014 (OK) | UT-AF-060 (OK) |
| **Deprecated** | UT-AF-022 (OK) | — (NG) | UT-AF-016 (NG) | — (NG) |
| **Superseded** | — (NG) | UT-AF-012 (NG) | UT-AF-015 (NG) | — (NG) |

> OK: 許可遷移（5パターン）、NG: 禁止遷移。集約メソッド経由で全パターンを網羅。

### 7.4 ArchgateEntry.errorCode 境界値

| ケースID | 入力 | 期待 | 観点 |
|----------|------|------|------|
| UT-AF-090 | `"L0-001"` | 正常 | レイヤ下限 |
| — (UT-AF-090内) | `"L4-999"` | 正常 | レイヤ上限 + 数字上限 |
| UT-AF-094 | `"L5-001"` | エラー | レイヤ範囲外（L5は不許可） |
| UT-AF-095 | `"L1-01"` | エラー | 2桁（3桁固定違反） |
| — (Q-UT-3反映) | `"L1-1234"` | エラー | 4桁（3桁固定違反） |
| UT-AF-096 | `"X1-001"` | エラー | prefix不正 |

> Q-UT-3回答に基づき正規表現は `^L[0-4]-\d{3}$`（3桁固定）。4桁の異常系をUT-AF-094〜096の付近で検証。

### 7.5 AdrFrontmatter.date 境界値

| ケースID | 入力 | 期待 | 観点 |
|----------|------|------|------|
| UT-AF-064 | `"2026-01-01"` | 正常 | YYYY-MM-DD正常形式 |
| UT-AF-066 | `"2026-1-1"` | エラー | ゼロ埋めなし（不正形式） |

### 7.6 AdrBody 必須セクション境界値

| ケースID | 入力 | 期待 | 観点 |
|----------|------|------|------|
| UT-AF-081 | 空文字 `""` | エラー | 空文字不可 |
| — (UT-AF-081付近) | 空白のみ `"  "` | エラー | トリム後0文字 |
| UT-AF-080 | 1文字 `"x"` | 正常 | 下限（トリム後1文字以上） |

### 7.7 AdrFrontmatter `transitionStatus()` イミュータブル性

| ケースID | 検証対象 | 期待 | 観点 |
|----------|---------|------|------|
| UT-AF-071 | 戻り値のインスタンス | 新しいステータスが設定されている | 状態更新の正確性 |
| UT-AF-072 | 元のインスタンス | 元のステータスが変更されていない | イミュータブル保証 |

> Q-UT-2回答に基づき、`transitionStatus()` は新インスタンスを返し元インスタンスは不変。両方をアサートする。

---

## 8. テスト環境設定

### 8.1 テストフレームワーク

| 項目 | 設定 |
|------|------|
| フレームワーク | Vitest 3.0.0 |
| 設定ファイル | `scripts/harness/__tests__/vitest.config.ts`（共有） |
| ヘルパー | `target`, `context` は `scripts/harness/__tests__/` 配下のdescribeエイリアス |

### 8.2 テスト対象コードの配置

| 区分 | パス |
|------|------|
| 集約 | `scripts/harness/adr-foundation/domain/aggregates/adr.ts` |
| 値オブジェクト | `scripts/harness/adr-foundation/domain/value-objects/*.ts` |
| ドメインサービス | `scripts/harness/adr-foundation/domain/services/adr-validation-service.ts` |

### 8.3 テストコードの配置

| 区分 | パス |
|------|------|
| 全テスト | `scripts/harness/__tests__/unit/adr-foundation/*.test.ts` |

### 8.4 モック方針

| 層 | モック使用 | 理由 |
|----|----------|------|
| domain（集約、VO、ドメインサービス） | 禁止 | テスト規約「モックオブジェクトは外部依存に対してのみ利用する」に従う |
| `AdrValidationService` | 実体を使用 | ドメインサービスはドメイン層の構成要素であり、管理下にある依存 |

### 8.5 テストデータ生成

- テスト内で直接値オブジェクトを生成する（ファクトリメソッド `create()` を使用）
- テストケース間のデータ共有はせず、各テストケースのArrangeで独立して準備する
- 複雑なArrangeが頻出する場合はオブジェクトマザーパターンの導入を検討するが、Phase 2時点では各テスト内での直接生成を基本とする

### 8.6 前提条件

- `target`, `context` ヘルパーが `scripts/harness/__tests__/` 配下で利用可能であること
- domain層の実装コードが `scripts/harness/adr-foundation/domain/` 配下に配置されること
- Vitest 3.0.0の `describe`, `it`, `expect` が利用可能であること
