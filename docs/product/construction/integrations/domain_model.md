# ドメインモデル: integrations

@work-item-id WI-092
@work-item-id WI-163
@work-item-id WI-249
> **Unit ID**: integrations
> **作成日**: 2026-07-10
> **最終更新**: 2026-07-10（WI-249 既存コードからの起こし・初版）
> **性格**: Integration boundary（統合エントリポイント）。ドメイン集約を新たに所有するのではなく、
> 他 Unit（validator-system / traceability-model / config-foundation）が公開する UseCase / Handler を
> 解決済み config で結線し、CI・pre-commit・commit-msg・bypass audit の実行境界を提供する。
> **横断契約参照**: `docs/product/construction/integrations/logical_design.md`（WI-092 / WI-163）

---

## 0. 本ドキュメントの位置付けと honesty note

この Unit は「集約を所有するドメイン Unit」ではなく **統合境界（integration boundary）** である。
`scripts/harness/integrations/` 配下に物理的に存在するソースは `pre-commit.ts` の 1 ファイルのみで、
そのファイル冒頭アノテーションは `@unit harness-api` / `@layer presentation`、対応テストも
`__tests__/unit/harness-api/pre-commit.test.ts` に置かれている。つまり `pre-commit.ts` の
コード所有権は harness-api Unit に属する。

一方で `integrations` は logical_design.md（WI-092 / WI-163）が定義する **論理 Unit** として、
「validator-system の construct module を解決済み project config で呼び出す統合エントリポイント群」を表す。
本ドメインモデルは、その論理 Unit が実コード上でどの型・関数・ポート・ドメインルールとして
実現されているかを、`pre-commit.ts` に **実在する要素のみ** を対象に記述する（捏造なし）。

したがって以下の記述は「新たに設計する集約」ではなく「既存コードに現れる概念の抽出・分類」である。
各要素には実装ファイル・シンボルへの対応を明記する。

---

## 1. Ownership / Import-Export

### この Unit が所有する概念（実コードに存在するもの）

いずれも `scripts/harness/integrations/pre-commit.ts` に定義された型・関数。

| 概念 | 分類 | 実装シンボル | 説明 |
|------|------|-------------|------|
| PreCommitRunner | 統合サービス（関数） | `runPreCommit()` | staged files を実装ファイル / メタデータ .md / test に振り分け、L2 validator と metadata 注釈チェック、Work-Item trailer / bypass trailer 検証を統合実行する中核関数 |
| BypassAuditRunner | 統合サービス（関数） | `runBypassAudit()` | base..head の range に対し `runPreCommit` を allowConditionalBypass=true で実行し、range 内 commit の bypass trailer 完全性を突き合わせる |
| PreCommitResult | 出力 VO（interface） | `PreCommitResult` | `{ exitCode: 0\|1\|2, stdout, blockerClasses }`。実行結果の値表現 |
| PreCommitOptions | 入力 VO（interface） | `PreCommitOptions` | `{ commitMessage?, implementationExtensions?, allowConditionalBypass?, evidenceRoot? }` |
| BypassBlockerClass | VO（interface） | `BypassBlockerClass` | `{ code, label, bypassable }`。個々の validator/metadata failure の bypass 可否分類 |
| BypassTrailerValidationResult | VO（interface） | `BypassTrailerValidationResult` | `{ hasAnyBypassTrailer, complete, errors[] }`。commit message の bypass trailer 検証結果 |
| BypassAuditOptions | 入力 VO（interface） | `BypassAuditOptions` | `{ baseRef?, headRef?, commitMessages?, changedFiles?, evidenceRoot? }` |
| PreCommitDeps | 依存注入ポート束（interface） | `PreCommitDeps` | 統合対象 UseCase/Handler を保持する DI コンテナ相当 |

### 他 Unit の契約を受け取り、解決済み config で結線する対象（Import）

`pre-commit.ts` の CLI エントリ（`runPreCommitCli` / `runCommitMsgCli` / `runBypassAuditCli`）が
composition-root を呼び出して結線する。

| 型 / モジュール | 所有 Unit | integrations での扱い | 実装参照 |
|----------------|-----------|----------------------|----------|
| `RunL2ValidatorsUseCase`（`RunL2UseCaseLike` として抽象化） | validator-system | staged 実装ファイルを Unit 単位でグルーピングして L2 検査 | `createValidatorSystemModule().runL2ValidatorsUseCase` |
| `ValidateMetadataCommandHandler`（`ValidateMetadataHandlerLike`） | traceability-model | staged .md / test file のメタデータ注釈検査 | `createTraceabilityModelModule().validateMetadataCommandHandler` |
| `loadResolvedConfigUseCase` / `toValidatorSystemConfig` | config-foundation | preset・layer enablement・paths を解決し validator-system へ渡す | `createConfigFoundationModule().usecases.loadResolvedConfigUseCase` |
| `ValidationResultContract` / `AggregatedValidationReport` | validator-system | 検査結果の集約・レポート整形の入力型（読取専用） | validator-system application DTO |
| `HumanValidationResultFormatter` | validator-system | 実装ファイル検査結果の人間可読整形 | validator-system presentation |
| `ValidateMetadataCommandOutput` | traceability-model | metadata 検査の text / exitCode（読取専用） | traceability-model presentation |

### 他 Unit へ公開する契約（Export）

| 契約 | 消費側 | 内容 | 実装参照 |
|------|--------|------|----------|
| pre-commit / commit-msg / bypass:audit の CLI 実行境界 | L0（`.husky/pre-commit` / `.husky/commit-msg`）, CI | exit code 0/1/2 とレポート stdout | `runPreCommitCli` / `runCommitMsgCli` / `runBypassAuditCli` |
| `runPreCommit` / `runBypassAudit` / `validateBypassTrailers` | ハーネス内テスト・他 CLI ルート | DI 可能な純粋オーケストレーション関数 | 同名 export |

---

## 2. Aggregate Boundary

### 結論: 集約ルートを新設しない（統合境界のため）

この Unit は永続化される集約状態を持たない。`runPreCommit` / `runBypassAudit` は
入力（staged files, commit message）から結果 VO を導出する **純粋なオーケストレーション** であり、
実際のドメイン判断（L2 validator 実行、metadata 検査）は import 先 Unit の UseCase/Handler に委譲する。

集約を新設しない根拠:

- **状態の不在**: この Unit 内に永続化される集約インスタンスは存在しない（`.harness/` 等への書込は他 Unit が担う）
- **委譲構造**: ドメインロジックの実体は validator-system / traceability-model に閉じており、integrations はその結線と結果集約のみを担う
- **logical_design.md との整合**: WI-163 が明記する通り「live validator registry を hard-code しない / 生成 workflow template を mutate しない」＝ 副作用を持たない境界層

代わりに、この Unit が持つのは以下の **値オブジェクト群と統合サービス関数** である（§1・§3）。

---

## 3. Model Classification

### 統合サービス（関数）

| サービス | 責務 | 委譲先ポート | 実装参照 |
|---------|------|-------------|----------|
| `runPreCommit(stagedFiles, deps, options)` | staged file 振り分け → L2 検査（Unit 単位）→ metadata 検査 → Work-Item trailer 検証 → bypass 監査を統合し `PreCommitResult` を返す | `PreCommitDeps.runL2ValidatorsUseCase`, `PreCommitDeps.validateMetadataCommandHandler` | `pre-commit.ts` L379 |
| `runBypassAudit(deps, options)` | base..head range の changed files / commit messages を取得し `runPreCommit` を conditional-bypass モードで再利用、range の trailer 完全性を判定 | 同上 + git range 取得ヘルパ | `pre-commit.ts` L542 |
| `validateBypassTrailers(commitMessage, evidenceRoot)` | commit message の bypass trailer（必須3種 + 任意 Bypass-Report）と evidence（command:/report:）の完全性検証 | ファイル存在確認（`pathExists`） | `pre-commit.ts` L306 |
| `mergePerUnitResults(runs)` | 複数 Unit の L2 結果を ValidatorId 単位で集約（fail/skip を優先＝厳しい側採用） | — | `pre-commit.ts` L144 |

### 値オブジェクト（interface / 純粋な値表現）

| VO | 不変 | 主フィールド | 実装参照 |
|----|------|-------------|----------|
| PreCommitResult | ✓ | `exitCode: 0\|1\|2`, `stdout: string`, `blockerClasses: BypassBlockerClass[]` | `pre-commit.ts` L189 |
| PreCommitOptions | ✓ | `commitMessage?`, `implementationExtensions?`, `allowConditionalBypass?`, `evidenceRoot?` | L195 |
| BypassBlockerClass | ✓ | `code: string`, `label: string`, `bypassable: boolean` | L207 |
| BypassTrailerValidationResult | ✓ | `hasAnyBypassTrailer`, `complete`, `errors: string[]` | L213 |
| BypassAuditOptions | ✓ | `baseRef?`, `headRef?`, `commitMessages?`, `changedFiles?`, `evidenceRoot?` | L219 |
| RunL2Input | ✓ | `targetPaths[]`, `unitName`, `currentPhase` | L165 |
| ValidateMetadataInput | ✓ | `filePaths[]`, `json?` | L175 |

### ポート（依存注入インターフェース）

| ポート | 方向 | 責務 | 実装参照 |
|--------|------|------|----------|
| `RunL2UseCaseLike` | integrations → validator-system | `execute(RunL2Input): Promise<ValidationResultContract[]>` | L171 |
| `ValidateMetadataHandlerLike` | integrations → traceability-model | `execute(ValidateMetadataInput): Promise<ValidateMetadataCommandOutput>` | L180 |
| `PreCommitDeps` | DI 束 | 上記 2 ポートを保持 | L184 |

これらは `interface ...Like` として抽象化されており、CLI エントリで具象 UseCase/Handler を注入する。
テスト時はモックを注入可能（テスト対象は `runPreCommit` の統合ロジック）。

### 補助定数（ドメインルールの実体）

| 定数 | 値 | 意味 | 実装参照 |
|------|-----|------|----------|
| `NON_BYPASSABLE_VALIDATOR_IDS` | `["L2-002","L2-003","L2-014"]` | bypass 不可の validator。これらの failure は trailer が揃っても迂回不可 | L43 |
| `BYPASS_TRAILER_NAMES` | `["Bypass-Reason","Bypass-Evidence","Bypass-Owner"]` | bypass に必須の commit trailer 3 種 | L41 |
| `OPTIONAL_BYPASS_TRAILER_NAMES` | `["Bypass-Report"]` | 任意 trailer（存在時はパス実在を検証） | L42 |
| `DEFAULT_IMPLEMENTATION_EXTENSIONS` | `[".ts"]` | 実装ファイル判定のデフォルト拡張子 | L36 |
| `TEST_FILE_SUFFIXES` | `.test.ts` 等 4 種 | test file 判定（metadata 検査対象へ回す） | L40 |
| `WORK_ITEM_PATH_PATTERN` / `WORK_ITEM_TRAILER_PATTERN` | 正規表現 | inception WI ドキュメント staged 時に `Work-Item:` trailer を必須化 | L38-39 |

---

## 4. Domain Rules and Invariants

いずれも `pre-commit.ts` の実装に現れる規則のみを記載（コードにない不変条件は書かない）。

| INV | 対象 | 内容 | 実装参照 |
|-----|------|------|----------|
| INV-1 | PreCommitResult.exitCode | `0`（pass / 対象なし）, `1`（検査失敗）, `2`（ランタイムエラー）の 3 値のみ。`maxExitCode` で常に厳しい側へ単調上昇 | `maxExitCode` L265 |
| INV-2 | staged file 振り分け | 実装ファイル（config の implementationExtensions、既定 `.ts`）と `docs/inception/` `docs/product/` 配下の .md、および test file に分類し、test file と .md は metadata 検査対象へ回す | `runPreCommit` L384-388, `isMetadataMarkdownFile` L88 |
| INV-3 | 多 Unit L2 集約 | 同一 ValidatorId に複数 Unit で fail/skip が混在する場合、fail/skip（厳しい側）を採用する | `mergePerUnitResults` L144 |
| INV-4 | Unit 名解決 | `@unit` アノテーションが存在すればそれを正とし、無い場合のみ path ベース（`scripts/harness/{unit}/...`）へフォールバックする | `resolveUnitName` L133 |
| INV-5 | 非 bypass 可能 validator | `L2-002 / L2-003 / L2-014` の failure、および metadata blocker は `bypassable=false`。trailer が完全でも迂回不可 | `classifyValidatorFailure` L350, `metadataBlocker` L360 |
| INV-6 | bypass trailer 完全性 | bypass trailer が 1 つでも存在する場合、必須 3 種（Reason/Evidence/Owner）が全て揃い、かつ Bypass-Evidence が `command:<非空>` または `report:<実在パス>` 形式でなければ `complete=false` | `validateBypassTrailers` L306 |
| INV-7 | 条件付き bypass の適用条件 | `exitCode!==0` かつ `allowConditionalBypass===true` かつ bypass trailer 完全かつ非 bypass 可能 blocker 不在のときのみ exitCode を 0 に緩和する | `runPreCommit` L482-491 |
| INV-8 | Work-Item trailer 必須化 | `docs/inception/.../WI-XXX/...` が staged かつ commitMessage 提供時、`Work-Item: WI-XXX` trailer が無ければ fail（exitCode≥1） | `requiresWorkItemTrailer` L269 / L459 |
| INV-9 | bypass audit の fail-closed | range の gate 失敗時、range 内に完全な bypass trailer set が 1 つも無ければ fail（exitCode=1） | `runBypassAudit` L566 |
| INV-10 | 対象なし早期 return | 実装ファイル・.md いずれも staged に無ければ exitCode=0 で skip メッセージを返す | `runPreCommit` L390 |

---

## 5. Data Flow

### 5.1 pre-commit 実行フロー（`runPreCommitCli` → `runPreCommit`）

```
getStagedFiles()  (git diff --cached --name-only --diff-filter=ACM)
  │
  ├─ config 解決: loadValidatorSystemConfig / loadTraceabilityModelOptions
  │              / loadPreCommitImplementationExtensions  (config-foundation)
  ▼
runPreCommit(stagedFiles, deps, options)
  ├─ 実装ファイル抽出（implementationExtensions）
  │    └─ Unit 単位グルーピング（resolveUnitName）
  │         └─ deps.runL2ValidatorsUseCase.execute({targetPaths, unitName, ...})  … Unit ごと
  │              └─ mergePerUnitResults(runs)  （厳しい側集約, INV-3）
  │                   └─ classifyValidatorFailure → blockerClasses
  │                   └─ buildReport → HumanValidationResultFormatter.format
  ├─ metadata 対象（.md + test file）
  │    └─ deps.validateMetadataCommandHandler.execute({filePaths})
  │         └─ exitCode!==0 → metadataBlocker()（bypassable=false）
  ├─ Work-Item trailer 検証（INV-8, commitMessage 提供時）
  ├─ bypass 監査（validateBypassTrailers, INV-6/7）
  ▼
PreCommitResult { exitCode, stdout, blockerClasses }
  → process.exit(exitCode)
```

### 5.2 bypass audit フロー（`runBypassAuditCli` → `runBypassAudit`）

```
runBypassAudit(deps, {baseRef=origin/main, headRef=HEAD, evidenceRoot})
  ├─ getChangedFilesInRange(base..head)      (git diff --name-only)
  ├─ getCommitMessagesInRange(base..head)    (git log --format=%B)
  ├─ runPreCommit(changedFiles, deps, {commitMessage: 結合, allowConditionalBypass: true})
  ├─ 各 commit message で validateBypassTrailers
  └─ gate 失敗 かつ 完全 trailer set 不在 → exitCode=1（INV-9, fail-closed）
```

---

## 6. 設計判断記録（実コードから読み取れるもの）

### D1: 集約を持たず、統合サービス関数と VO のみで構成

integrations はドメイン状態を持たず、他 Unit の UseCase/Handler を DI（`PreCommitDeps`）で受け取り
結果を集約するだけの境界層である。ゆえに集約ルート・リポジトリポートを新設せず、
`runPreCommit` / `runBypassAudit` を純粋関数として export し、CLI エントリでのみ具象を結線する。
（logical_design.md WI-163「live validator registry を hard-code しない」方針と一致）

### D2: `...Like` 抽象インターフェースによる委譲先の疎結合化

`RunL2UseCaseLike` / `ValidateMetadataHandlerLike` は具象 UseCase 型を直接参照せず
必要メソッドのみを宣言する構造的インターフェース。これにより integrations は validator-system /
traceability-model の内部型に強結合せず、テストでモック注入が可能。

### D3: fail-closed / 単調 exitCode

`maxExitCode` により exitCode は一度上がると下がらない（唯一の例外が INV-7 の条件付き bypass 緩和）。
bypass audit も range 全体で trailer 不完全なら fail（INV-9）。品質ゲートが「確認できないものは通さない」
fail-closed 原則を実装レベルで担保している。

### D4: bypass 不可 validator の明示

`L2-002 / L2-003(test-quality) / L2-014` は trailer を揃えても迂回できない（INV-5）。
これは「緩和を許すが、根幹の品質検査は緩和対象外」という phasegate の防御思想の局所実装。

---

## 7. 未解決事項 / 今後の整理候補

| # | 事項 | 備考 |
|---|------|------|
| OQ-1 | コード所有権と論理 Unit の乖離 | `pre-commit.ts` は `@unit harness-api` だが物理配置は `scripts/harness/integrations/`。今後この 1 ファイルを harness-api 側へ移設するか、integrations に固有ソースを持たせるかは別途 WI で検討（本 WI-249 の範囲外） |
| OQ-2 | integrations 固有のドメイン概念の追加余地 | 現状は harness-api コードの薄い境界。将来 CI 統合ロジックが独自に増える場合、本ドメインモデルへ集約を追記する |
