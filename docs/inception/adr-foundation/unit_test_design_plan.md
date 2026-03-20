# ユニットテスト設計計画: adr-foundation

> **作成日**: 2026-03-13
> **対象Unit**: adr-foundation
> **正規ソース**: `docs/product/construction/adr-foundation/domain_model.md`（INV-1〜INV-6）、`docs/product/construction/adr-foundation/logical_design.md`（INV-7, INV-8 は §2.1 で追加）
> **テスト規約**: `docs/principles/testing-rules.md`

---

## 1. スコープ

- 対象: adr-foundation Unitのドメインモデル（domain層）
- テスト配置先: `scripts/harness/__tests__/adr-foundation/domain/`

### テスト対象コンポーネント一覧

| 分類 | コンポーネント | テストファイル |
|------|--------------|--------------|
| 集約 | ADR | `adr.test.ts` |
| 値オブジェクト | AdrId | `adr-id.test.ts` |
| 値オブジェクト | AdrStatus | `adr-status.test.ts` |
| 値オブジェクト | AdrFrontmatter | `adr-frontmatter.test.ts` |
| 値オブジェクト | AdrBody | `adr-body.test.ts` |
| 値オブジェクト | ArchgateEntry | `archgate-entry.test.ts` |
| 値オブジェクト | ArchgateMapping | `archgate-mapping.test.ts` |
| 値オブジェクト | SupersededByRef | `superseded-by-ref.test.ts` |
| 値オブジェクト | AdrFilePath | `adr-file-path.test.ts` |
| ドメインサービス | AdrValidationService | `adr-validation-service.test.ts` |

---

## 2. テスト対象分析

### 集約

| 集約名 | 不変条件数 | 状態遷移数 | テストケース概算 |
|--------|----------|----------|---------------|
| ADR | 8（INV-1〜INV-8） | 5（approve, deprecate, supersede, repropose, updateBody） + create/reconstitute + replaceArchgate + getters/toAdrRef | 約35件 |

**ADR集約の主要テスト観点**:

- `create()`: 正常生成、バリデーション失敗（各INV違反）
- `reconstitute()`: 永続化済みADRの再構築、不正データでの再構築失敗（`MalformedAdrDocumentError` がスローされること）
- `approve()`: Proposed→Accepted成功、Accepted/Deprecated/Supersededからの遷移失敗
- `deprecate()`: Proposed→Deprecated成功、Accepted→Deprecated成功、Supersededからの遷移失敗
- `supersede(newAdrId)`: Accepted→Superseded成功・superseded_by設定確認、自己参照時のエラー、Proposedからの遷移失敗
- `repropose()`: Deprecated→Proposed成功、Accepted/Superseded/Proposedからの遷移失敗
- `updateBody(newBody)`: 正常更新、必須セクション欠落時のエラー
- `replaceArchgate(mapping)`: 正常設定、archgate削除（undefined）、不正errorCode時のエラー、重複エントリ時のエラー
- `getStatus()`, `getArchgate()`, `getFrontmatter()`, `getBody()`, `toAdrRef()`: 正常返却

### 値オブジェクト

| 値オブジェクト名 | 制約数 | テストケース概算 |
|----------------|-------|---------------|
| AdrId | 4（NNN形式、ADR-NNN入力許可、000不許可、001以上） | 約12件 |
| AdrStatus | 3（4値限定、遷移表、等価性） | 約14件 |
| AdrFrontmatter | 6（必須項目、title非空、date形式、Superseded時supersededBy必須、非Superseded時supersededBy正規化、archgate.adrId一致） | 約16件 |
| AdrBody | 3（必須3セクション非空、alternatives任意、equals） | 約10件 |
| ArchgateEntry | 3（validatorId kebab-case、errorCode L{n}-{nnn}形式、equals） | 約10件 |
| ArchgateMapping | 3（enforcedBy 1件以上、重複禁止、検索メソッド） | 約12件 |
| SupersededByRef | 2（AdrIdから生成、toAdrRef/equals） | 約5件 |
| AdrFilePath | 4（正規表現パス形式、template.md除外、fromAdr生成、getAdrId抽出） | 約10件 |

**AdrId の主要テスト観点**:
- `create("001")`: 正常生成
- `create("ADR-001")`: ADR-prefix入力からの正規化
- `create("000")`: 不許可（1未満）
- `create("abc")`, `create("")`: 不正形式
- `fromAdrRef("ADR-001")`: 正常変換
- `toNumber()`: 数値変換
- `toAdrRef()`: `ADR-{NNN}` 形式返却
- `equals()`: 同値/異値比較
- `compare()`: ソート用比較

**AdrStatus の主要テスト観点**:
- `create()` 各有効値（Proposed/Accepted/Deprecated/Superseded）
- `create()` 無効値（小文字、不正文字列）
- ファクトリメソッド（`proposed()`, `accepted()`, `deprecated()`, `superseded()`）
- `canTransitionTo()`: 遷移表に基づく全組み合わせ（許可5パターン + 禁止パターン）
- `equals()`: 同値/異値比較
- `isSuperseded()`: true/false

**AdrFrontmatter の主要テスト観点**:
- `create()`: 全必須項目指定で正常生成
- `create()`: title空文字でエラー
- `create()`: date不正形式でエラー
- `create()`: status=Supersedでsuperseded_by未指定でエラー
- `create()`: status=Acceptedでsuperseded_by指定時に正規化（未設定化）
- `create()`: archgate.adrIdと自身のadrIdが不一致でエラー
- `transitionStatus()`: 正常遷移、不正遷移
- `withSupersededBy()`: 参照設定
- `withArchgate()`: archgate設定/削除
- `toPrimitives()`: プリミティブ変換

**AdrBody の主要テスト観点**:
- `create()`: 必須3セクション指定で正常生成
- `create()`: context空でエラー、decision空でエラー、consequences空でエラー
- `create()`: alternatives未指定で正常生成
- `create()`: alternatives空白のみでエラー
- `withAlternatives()`: 代替案追加/削除
- `toSectionMap()`: セクションマップ変換
- `equals()`: 同値/異値比較

**ArchgateEntry の主要テスト観点**:
- `create()`: 正常生成（validatorId kebab-case、errorCode L{n}-{nnn}）
- `create()`: validatorId空でエラー、camelCaseでエラー
- `create()`: errorCode不正形式でエラー（L5-001, L1-01, X1-001）
- `matchesValidatorId()`, `matchesErrorCode()`: 一致/不一致
- `equals()`: 同値/異値比較

**ArchgateMapping の主要テスト観点**:
- `create()`: enforcedBy 1件以上で正常生成
- `create()`: enforcedBy空配列でエラー
- `create()`: 重複エントリでエラー
- `findByValidatorId()`: 一致あり/なし
- `findByErrorCode()`: 一致あり/なし
- `hasEntry()`: 存在/非存在
- `toPrimitives()`: プリミティブ変換

**AdrFilePath の主要テスト観点**:
- `create("docs/ADR/001-some-title.md")`: 正常生成
- `create("docs/ADR/template.md")`: エラー（template.md除外）
- `create("invalid/path.md")`: パス形式不正
- `fromAdr(adrId, title)`: ID+タイトルからの生成
- `getAdrId()`: AdrId抽出
- `equals()`: 同値/異値比較

### ドメインサービス

| サービス名 | メソッド数 | テストケース概算 |
|-----------|----------|---------------|
| AdrValidationService | 3（validateFrontmatter, validateBody, validateArchgate） | 約15件 |

**AdrValidationService の主要テスト観点**:
- `validateFrontmatter()`: 正常frontmatterで例外なし、必須項目欠落でエラー、Superseded時superseded_by未設定でエラー、archgate.adrId不一致でエラー、archgate.errorCode不正形式でエラー
- `validateBody()`: 正常bodyで例外なし、context/decision/consequences空でエラー、alternatives空白のみでエラー
- `validateArchgate()`: 正常mappingで例外なし、enforcedBy空でエラー、errorCode不正形式でエラー、重複エントリでエラー

---

## 3. テスト方針

### 正常系/異常系のバランス

- 値オブジェクト: 正常系1〜2件 + 異常系（制約違反ごとに1件）を基本とする
- 集約: 正常系（各メソッド1件）+ 異常系（不変条件違反・状態遷移違反ごとに1件）
- ドメインサービス: 正常系（メソッドごとに1件）+ 異常系（検証項目ごとに1件）

### 境界値テストの対象

- AdrId: `000`（下限外）、`001`（下限）、`999`（上限）
- AdrStatus遷移表: 許可遷移の全5パターン + 主要な禁止パターン
- ArchgateEntry.errorCode: `L0-001`（下限）、`L4-999`（上限）、`L5-001`（範囲外）
- AdrFrontmatter.date: `2026-01-01`（正常）、`2026-1-1`（不正形式）
- AdrBody必須セクション: 空文字、空白のみ、1文字（下限）

### ドメイン実体のモック禁止

- テスト規約に従い、ドメインオブジェクト（集約、値オブジェクト、ドメインサービス）に対するモックは作成しない
- 全テストで実体を使用する
- AdrValidationServiceもドメインサービスであるため、ADR集約テストでは実体を注入する

### AAAパターン

- 全テストケースを Arrange / Act / Assert の3セクションで構成する
- 実行結果の変数名は `actual` に統一する

### テストケース名・構造

- テストケース名は日本語で記述する
- describe/it構造は `target / describe / context / it` パターンを使用する
- target: テスト対象のメソッドまたはファクトリ
- describe: ふるまいの説明
- context: 前提条件がある場合に記載
- it: 期待値

### テストケース名の例

```
target('create', () => {
  describe('AdrIdを生成する', () => {
    context('3桁数字文字列が渡された場合', () => {
      it('正規化されたAdrIdが生成される', () => {});
    });
    context('000が渡された場合', () => {
      it('エラーがスローされる', () => {});
    });
  });
});
```

---

## 4. QA（不明点・確認事項）

| # | 質問 | 影響 |
|---|------|------|
| Q-UT-1 | AdrId の `compare()` メソッドは昇順ソート前提か（戻り値の正負の意味） | テストケースの期待値 |

[Answer] 昇順ソート前提を採用する。`compare(a, b)` は `a < b` で負、`a === b` で 0、`a > b` で正を返す。`Array.sort()` の標準比較関数と同じ契約。

| Q-UT-2 | AdrFrontmatter の `transitionStatus()` は新しいインスタンスを返すイミュータブル設計か、それとも内部状態を変更するか | テストのアサーション方法 |

[Answer] イミュータブル設計を採用する。`transitionStatus()` は新しい `AdrFrontmatter` インスタンスを返す。元のインスタンスは変更されない。テストでは元インスタンスの不変性と新インスタンスの状態更新の両方を検証する。

| Q-UT-3 | ArchgateEntry の `errorCode` 正規表現 `^L[0-4]-\d{3,}$` において、4桁以上の数字（例: `L1-1234`）も許可する意図か | 境界値テストの範囲 |

[Answer] 3桁固定（`^L[0-4]-\d{3}$`）に修正する。`L{n}-{nnn}` の正規形式はintegration_contract.mdで定義済みであり、4桁以上は許可しない。テストでは3桁の正常系と4桁の異常系を含める。

---

## 5. 前提条件・リスク

### 前提条件

- テストフレームワークは Vitest 3.0.0 を使用する
- `target`, `context` ヘルパーが `scripts/harness/__tests__/` 配下で利用可能であること
- domain層の実装コードが `scripts/harness/adr-foundation/domain/` に配置されること

### リスク

| # | リスク | 影響 | 軽減策 |
|---|-------|------|--------|
| R-UT-1 | AdrFrontmatter の immutable操作チェーンが複雑になり、テストケースの組み合わせが増大する | テスト量増加 | 主要パスのみをテストし、VO単体の制約テストに委譲する |
| R-UT-2 | INV-7（archgate重複禁止）の検証がArchgateMappingとAdrValidationServiceの両方に分散する可能性 | テスト重複 | 責務の所在を実装時に確定し、一方に集約する |
| R-UT-3 | 状態遷移の全組み合わせ（4状態 x 4遷移メソッド = 16パターン）のうち禁止パターンのテスト漏れ | 回帰バグ | 遷移表を網羅するマトリクステストを設計する |
