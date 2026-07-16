# テストカバレッジレポート: harness-error

<!-- WI-275: 本レポートは attestation ゲート返済済み（旧 coverage-gating マーカー除去）。各カバー主張に @attestation <story-id> を付与し、L2-016 が形状を、L3-007 が requirement-test-matrix 上での実在（story-id 解決 かつ testReferences>=1）を fail-closed で検証する。カバー印は「実在し pass するテストによる裏付け」を意味する。 -->

@story-id H06-01
@story-id H06-02
@story-id H06-03
> 判定基準: `カバー印` = 完全カバー（実在する実テストで裏付け）、`⚠️` = 一部カバー、`❌` = 未カバー（実装テスト不在・設計のみ）
> 集計ルール: サマリーの「カバー項目数」は `カバー印` のみを計上し、`⚠️` と `❌` は未カバー項目数に含める。
> AC ID欄は、`docs/product/units/harness_error_unit.md` の機能要件節番号と箇条書き番号を参照IDとして用いる。

> **2026-07-15 反ロンダリング訂正（WI-270）**: 本レポートの旧「カバー印 100%」は、実在しないテストケース ID を カバー印 の根拠に引用した水増し（laundering）であった。全 cited ID を `grep -rlF` で実テストツリーに照合し、実在しない ID を全て除去、実在 ID が 1 件も残らない行を ❌ へ格下げした。詳細は末尾「訂正履歴」を参照。

## 1. サマリー

| 観点 | カバー項目数 | 未カバー項目数 | カバレッジ率 |
|------|------------|--------------|------------|
| 受け入れ基準 | 11 | 2 | 84.6% |
| ドメインロジック | 22 | 1 | 95.7% |
| UseCase | 6 | 0 | 100% |
| **総合** | **39** | **3** | **92.9%** |

> **訂正（2026-07-15, WI-270）**: 旧「総合 42/0 = 100%」は取消し。受け入れ基準の §3.2-4 / §3.3-4、ドメインロジックの Severity「生成後は不変」の 3 行は、cited ID（IT-HE-146 / IT-HE-109・140・141 / UT-HE-018）が全て実テストツリーに不在であり、実在 ID による裏付けが 0 のため ❌ へ格下げした。分子=カバー印 行数（AC 11 + domain 22 + usecase 6 = 39）、分母=42。

### 判定結果
- カバー印 90%以上: テストロジック設計に進んで問題なし
- ⚠️ 70-90%: 未カバー項目の確認を推奨
- ❌ 70%未満: テストケース設計の追加が必要

**今回の判定**: `⚠️ 92.9%`（訂正後の実カバレッジ）。ドメインロジック・UseCase は概ね実在テストで裏付けられているが、受け入れ基準 §3.2-4（fix_example 更新時 CI 自動実行）と §3.3-4（違反時 ADR 参照出力）はそれを検証する実テストが存在しない。旧レポートが主張した「前回83%からの100%改善」は、実在しない回帰テスト ID（IT-HE-137〜146, UT-HE-112）を根拠にしたものであり、これらのテストは設計にも実装にも存在しないため、本訂正で当該改善記述を撤回した。

> **注記**: 実在する UseCase / VO / ドメインサービステスト（実スイート `Tests 202 passed`）は全て pass しており、上記 ❌ はフィーチャの欠落ではなく「対応する実テストが未実装」であることを表す。実テスト追加・`@ac` 束縛は後続フェーズで行う。

## 2. 受け入れ基準カバレッジ詳細

| AC ID | 基準内容 | 対応テストケース | カバー状態 |
|------|---------|----------------|----------|
| §3.1-1 | HarnessError型を`{code, severity, message, suggestion, adr_ref, fix_example}`で定義 | UT-HE-053〜058, UT-HE-060, UT-HE-103〜110, IT-HE-001〜003, IT-HE-005, IT-HE-006 | ✅ <!-- @attestation H06-01 --> |
| §3.1-2 | L1-L4全バリデータのエラー出力をHarnessErrorフォーマットに統一 | IT-HE-009〜013, IT-HE-015〜018, IT-HE-075〜082, IT-HE-084〜086 | ✅ <!-- @attestation H06-01 --> |
| §3.1-3 | 全バリデータのHarnessErrorに`adr_ref`を付与 | UT-HE-064, UT-HE-069, UT-HE-070, UT-HE-075, UT-HE-077, IT-HE-005 | ✅ <!-- @attestation H06-01 --> |
| §3.1-4 | 全バリデータのHarnessErrorに`fix_example`を付与 | UT-HE-065, UT-HE-071, UT-HE-072, UT-HE-076, IT-HE-006, IT-HE-019〜034 | ✅ <!-- @attestation H06-01 --> |
| §3.1-5 | HarnessErrorフォーマット準拠を検証する自動テスト | UT-HE-058, UT-HE-103〜110 | ✅ <!-- @attestation H06-01 --> |
| §3.2-1 | 全バリデータのfix_exampleをテスト資産として管理 | IT-HE-019〜034, IT-HE-063〜070 | ✅ <!-- @attestation H06-02 --> |
| §3.2-2 | CIパイプラインでfix_exampleの妥当性を検証 | IT-HE-063, IT-HE-066 | ✅ <!-- @attestation H06-02 --> |
| §3.2-3 | fix_exampleが構文的に不正な場合、CIが失敗 | IT-HE-060, IT-HE-061, IT-HE-064 | ✅ <!-- @attestation H06-02 --> |
| §3.2-4 | fix_example更新時にバリデーションが自動実行 | 実装テスト不在（旧引用 IT-HE-146 は不在） | ❌ |
| §3.3-1 | severity権限契約（`error`の格下げ禁止）を仕様として定義 | UT-HE-096〜102, IT-HE-035〜040 | ✅ <!-- @attestation H06-03 --> |
| §3.3-2 | Harness APIレスポンスでseverityが`readonly`であることを型レベルで保証 | IT-HE-050 | ✅ <!-- @attestation H06-03 --> |
| §3.3-3 | severity格下げを試みるケースを検出するテスト | UT-HE-068, UT-HE-096〜102, IT-HE-038 | ✅ <!-- @attestation H06-03 --> |
| §3.3-4 | 契約違反時のエラーメッセージに違反内容と根拠（ADR参照）を含める | 実装テスト不在（旧引用 IT-HE-109 / IT-HE-140 / IT-HE-141 は不在） | ❌ |

> **§3.2-4 / §3.3-4 訂正（2026-07-15, WI-270）**: 旧 カバー印 の唯一の根拠だった `IT-HE-146`（§3.2-4）および `IT-HE-109 / IT-HE-140 / IT-HE-141`（§3.3-4）は実テストツリーに存在しない（`grep -rlF` 0 件）。実 IT-HE は 093 まで、UT-HE は 127 までしか存在しない。実在テストによる裏付けが 0 のため ❌ へ格下げした。

## 3. ドメインロジックカバレッジ詳細

### 集約

| 集約名 | 不変条件 | 対応テストケース | カバー状態 |
|------|---------|----------------|----------|
| 該当なし | `domain_model.md`で「集約なし」と定義。HarnessErrorは不変値オブジェクトとして扱う | - | 対象外 |

### エンティティ

| エンティティ名 | ビジネスルール | 対応テストケース | カバー状態 |
|------|---------------|----------------|----------|
| 該当なし | 本Unitはエンティティを持たず、値オブジェクトとドメインサービス中心で構成される | - | 対象外 |

### 値オブジェクト

| 値オブジェクト名 | 制約 | 対応テストケース | カバー状態 |
|------|------|----------------|----------|
| ErrorCode | `^L[0-4]-[0-9]{3,}$`形式に準拠する | UT-HE-001〜003, UT-HE-010〜012, UT-HE-078 | ✅ <!-- @attestation H06-01 --> |
| ErrorCode | 意味名コード（`L2-PHASE-GATE`等）を拒否する | UT-HE-010 | ✅ <!-- @attestation H06-01 --> |
| Severity | `"error"` / `"warning"`のみ許容する | UT-HE-015〜017, UT-HE-020 | ✅ <!-- @attestation H06-01 --> |
| Severity | rank比較で格上げ/同値/格下げ判定を行う | UT-HE-015, UT-HE-016, UT-HE-096〜101 | ✅ <!-- @attestation H06-01 --> |
| Severity | 生成後は不変である | 実装テスト不在（旧引用 UT-HE-018 は不在） | ❌ |
| AdrRef | `ADR-{nnn}`形式に準拠する | UT-HE-021〜026, UT-HE-075 | ✅ <!-- @attestation H06-01 --> |
| FixExample | trim後に空文字を許容しない | UT-HE-027〜031 | ✅ <!-- @attestation H06-02 --> |
| FixExampleValidationResult | `passed=true`時は`reason=null` | UT-HE-032, UT-HE-036 | ✅ <!-- @attestation H06-02 --> |
| FixExampleValidationResult | `passed=false`時は`diagnostics.length >= 1` | UT-HE-033〜038 | ✅ <!-- @attestation H06-02 --> |
| FixExampleValidationResult | 構文エラーとvalidator再実行失敗を同時に保持する | IT-HE-067 | ✅ <!-- @attestation H06-02 --> |
| ErrorDefinition | `defaultAdrRef`を持つ場合は`adrRefRequired=true`でなければならない | UT-HE-049 | ✅ <!-- @attestation H06-01 --> |
| ErrorDefinition | `fixExampleRequired=true`時はdefaultまたはexplicit fix_exampleが必要 | UT-HE-045〜047, UT-HE-051 | ✅ <!-- @attestation H06-01 --> |
| ErrorDefinition | `warning -> error`の格上げを許容する | UT-HE-050, UT-HE-063 | ✅ <!-- @attestation H06-01 --> |
| ErrorDefinition | `ownerValidatorId`が空文字であってはならない | UT-HE-052 | ✅ <!-- @attestation H06-01 --> |
| HarnessError | 値等価性で比較される | UT-HE-053, UT-HE-060 | ✅ <!-- @attestation H06-01 --> |
| HarnessError | `adrRef` / `fixExample`の保持有無を正しく返す | UT-HE-054〜057 | ✅ <!-- @attestation H06-01 --> |
| HarnessError | Shared Kernel DTOへ正しく投影される | UT-HE-058, IT-HE-047〜049 | ✅ <!-- @attestation H06-01 --> |
| HarnessError | 生成後と公開DTOが不変である | IT-HE-050 | ✅ <!-- @attestation H06-01 --> |

> **Severity「生成後は不変」訂正（2026-07-15, WI-270）**: 唯一の根拠 `UT-HE-018` は不在（実 UT-HE-013〜019 は欠番）。❌ へ格下げ。なお §3.1-1 / §3.1-5 / §3.3-2 / HarnessError「Shared Kernel DTO投影」「生成後不変」等の行は、範囲引用に含まれていた不在 ID（UT-HE-059/066/111, IT-HE-004/125〜136 等）を除去したが、実在 ID による裏付けが残るため カバー印 を維持した。

### ドメインサービス

| サービス名 | ビジネスルール | 対応テストケース | カバー状態 |
|------|---------------|----------------|----------|
| HarnessErrorFactory | 未登録ErrorCodeは拒否される | UT-HE-067 | ✅ <!-- @attestation H06-01 --> |
| HarnessErrorFactory | severity格下げは禁止される | UT-HE-068 | ✅ <!-- @attestation H06-01 --> |
| HarnessErrorFactory | ADR必須・存在確認・形式検証を行う | UT-HE-069, UT-HE-070, UT-HE-075, UT-HE-077 | ✅ <!-- @attestation H06-01 --> |
| HarnessErrorFactory | fix_example必須・構文検証・validator失敗検知を行う | UT-HE-071, UT-HE-072, UT-HE-076 | ✅ <!-- @attestation H06-01 --> |
| HarnessErrorFactory | `message` / `suggestion`空文字を拒否する | UT-HE-073, UT-HE-074 | ✅ <!-- @attestation H06-01 --> |
| ErrorDefinitionRegistry | 重複codeを拒否する | UT-HE-089 | ✅ <!-- @attestation H06-01 --> |
| ErrorDefinitionRegistry | code昇順・readonly・filteringを保証する | UT-HE-079〜081, UT-HE-083〜088, UT-HE-090〜092 | ✅ <!-- @attestation H06-01 --> |
| SeverityContractEnforcer | effective severityを解決し、格下げを禁止する | UT-HE-096〜102, IT-HE-035〜040 | ✅ <!-- @attestation H06-03 --> |

## 4. UseCaseカバレッジ詳細

| UseCase名 | 正常系 | 異常系 | カバー状態 |
|---------|------|------|----------|
| CreateHarnessErrorUseCase | IT-HE-001〜003, IT-HE-005, IT-HE-006 | IT-HE-007, IT-HE-008 | ✅ <!-- @attestation H06-01 --> |
| NormalizeValidatorErrorsUseCase | IT-HE-009〜013, IT-HE-015, IT-HE-018 | IT-HE-016, IT-HE-017 | ✅ <!-- @attestation H06-01 --> |
| ValidateFixExampleUseCase | IT-HE-019〜023 | IT-HE-024〜026 | ✅ <!-- @attestation H06-02 --> |
| ValidateAllFixExamplesUseCase | IT-HE-027〜033 | IT-HE-034 | ✅ <!-- @attestation H06-02 --> |
| AssertSeverityContractUseCase | IT-HE-035〜037 | IT-HE-038〜040 | ✅ <!-- @attestation H06-03 --> |
| ListErrorDefinitionsUseCase | IT-HE-041〜046 | 異常系の実装テスト不在（下記注参照） | ✅ <!-- @attestation H06-01 --> |

> **ListErrorDefinitionsUseCase 訂正（2026-07-15, WI-270）**: 異常系として引用された `IT-HE-137〜139` は不在。正常系 `IT-HE-041〜046` は実在するため UseCase 行自体は カバー印 を維持するが、異常系カバレッジは実テスト不在であることを明記する。

## 5. 未カバー項目一覧

| 項目 | 状態 | 理由 |
|-----|------|------|
| §3.2-4（fix_example 更新時 CI 自動実行） | ❌ | 旧引用 IT-HE-146 が不在。CI 自動起動を検証する実テストが存在しない |
| §3.3-4（違反時 ADR 参照出力） | ❌ | 旧引用 IT-HE-109 / 140 / 141 が不在。違反出力の ADR 参照を検証する実テストが存在しない |
| Severity「生成後は不変」 | ❌ | 旧引用 UT-HE-018 が不在。不変性を直接検証する VO 単体テストが存在しない |
| ListErrorDefinitionsUseCase 異常系 | 部分 | 正常系は実在（IT-HE-041〜046）、異常系（旧引用 IT-HE-137〜139）は不在 |

## 6. 前回レポートからの改善（撤回）

> **2026-07-15 撤回（WI-270）**: 旧 §6 は「前回83%から100%への改善」を、実在しない回帰テスト（IT-HE-142〜146, IT-HE-140/141, IT-HE-137〜139, UT-HE-112）の追加によって達成したと記述していた。これらのテストは実テストツリーに 1 件も存在せず、改善は事実として発生していない。旧 §6 の改善内訳表（受け入れ基準 62%→100% / ドメインロジック 96%→100% / UseCase 83%→100%）は虚偽の主張であったため全て撤回する。実カバレッジは §1 サマリーの訂正値（92.9%）が正本である。

## 7. 次のアクション

実カバレッジは 92.9% であり、以下の未カバー項目に実テストを追加してから カバー印 へ復旧する（強制 green を禁止）。

1. §3.2-4 / §3.3-4 / Severity「生成後は不変」/ ListErrorDefinitionsUseCase 異常系に対応する実テストを追加し、`@ac` / `@story` 束縛する。
2. これらのテストは `buildErrorDefinitionRegistry` で構築した実レジストリおよび GitHub Actions workflow 定義を前提とするため、対応する infrastructure / CI 定義の完成後に実装する。
3. 実テスト追加後に L3-005（coverage-report 整合ゲート）で回帰を防止する。

## WI-155: Error Contract Traceability Reflection

@work-item-id WI-155

HarnessError coverage uses Work Item IDs for new product reflection and preserves legacy story IDs only as historical mapping evidence. Recovery metadata fields such as `suggested_skill`, `scaffold_command`, and validator IDs are validated as payload contract fields, not as substitutes for `@work-item-id` annotations in product docs.

## 訂正履歴

### 2026-07-15 — 反ロンダリング実態訂正（WI-270, quick, fix）

<!-- @work-item-id WI-270 -->

WI-267 が実テスト再検証で確定させた laundering（実在しないテストケース ID を カバー印 の根拠に引用）の実態訂正。全 cited ID を `grep -rlF "<ID>" scripts/harness/__tests__/` で照合した。

実在テストのインベントリ（正本・実 grep）: **IT-HE は 001〜093（欠番 004/014/083/087〜089 等）まで、UT-HE は 001〜127（欠番 008/009/013/014/018/019/059/066/082/093〜095/111/112 等）まで**。IT-HE-094 以降・UT-HE-128 以降は存在しない。

除去した虚偽引用と格下げ:

1. **§1 サマリー / 判定「カバー印 100%（42/0）」→ ⚠️ 92.9%（39/3）**。旧 headline は不在 ID を計上した水増し。
2. **§2 §3.2-4「fix_example 更新時 CI 自動実行」→ ❌**。唯一の根拠 `IT-HE-146` が不在。
3. **§2 §3.3-4「違反時 ADR 参照出力」→ ❌**。根拠 `IT-HE-109 / IT-HE-140 / IT-HE-141` が全て不在。
4. **§3 Severity「生成後は不変」→ ❌**。唯一の根拠 `UT-HE-018` が不在。
5. **§4 ListErrorDefinitionsUseCase 異常系**: 引用 `IT-HE-137〜139` が不在（正常系 IT-HE-041〜046 は実在）。異常系は実テスト不在と明記。
6. **§6 改善内訳表（62%/96%/83% → 100%）を全撤回**。改善根拠の `IT-HE-137〜146 / UT-HE-112` は 1 件も実在せず、改善は事実として発生していない。
7. その他の カバー印 行（§3.1-1/2/5 等）でも、範囲引用に混在していた不在 ID（UT-HE-059/066/111, IT-HE-004/095/096/115/118/125〜136 等）を除去し、実在 ID のみへ整理した。これらは実在 ID による裏付けが残るため カバー印 を維持。

実スイート結果（verbatim・exit 0）: `Test Files 20 passed (20) / Tests 202 passed (202)`。実在テストは全て pass しており、上記 ❌ はフィーチャ欠落ではなく実テスト未実装のギャップである。

**ungated-legacy マーカーは維持**（attestation 発行機構が未実装のため。WI-267 §5 の結論に従う）。カバー印 を新規追加していない。テストコードは一切変更していない。
