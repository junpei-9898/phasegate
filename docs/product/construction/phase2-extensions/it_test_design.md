# ITテスト設計: phase2-extensions

> **Unit ID**: phase2-extensions
> **作成日**: 2026-03-20
> **対応ストーリー**: HF2-01, HF2-02, HF2-03
> **Wave**: 2
> **参照**: domain_model.md, logical_design.md, docs/principles/testing-rules.md

---

## 1. 対象コンポーネント

- **UseCase**: CheckDocFreshnessUseCase, ValidateDocPointersUseCase, GenerateE2ETemplateUseCase
- **Infrastructure Adapter**: GitLogDocumentAgeAdapter, FileSystemDocumentScannerAdapter, RegexPointerExtractorAdapter, FileSystemPointerResolverAdapter, HarnessConfigFreshnessAdapter
- **Presentation Handler**: CheckFreshnessHandler, ValidatePointersHandler, GenerateE2ETemplateHandler
- **Cross-Layer Integration**: 鮮度チェック統合フロー, ポインタ検証統合フロー

---

## 2. シードデータ要件

### 2.1 鮮度チェックテスト用ファイル構成

```
tmp/
└── phase2-ext-test-{timestamp}/
    ├── docs/
    │   ├── adr/
    │   │   ├── 0001-fresh.md        # 最近コミット（ageInDays=3想定）
    │   │   └── 0002-stale.md        # 古いmtime（ageInDays=60想定）
    │   └── design/
    │       └── old-design.md        # 非常に古い（ageInDays=120想定）
    └── phasegate.config.json          # freshnessRulesを含む設定ファイル
```

### 2.2 ポインタ検証テスト用ファイル構成

```
tmp/
└── phase2-ptr-test-{timestamp}/
    ├── docs/
    │   ├── valid-pointers.md        # 実在するファイルへのリンクのみ
    │   ├── broken-pointers.md       # 存在しないファイルへのリンクを含む
    │   └── mixed-pointers.md        # 有効リンク・無効リンク・URLリンク混在
    └── scripts/
        └── existing-script.ts       # 実在するスクリプト（ポインタ先として）
```

### 2.3 HarnessConfigV2テスト用設定

```json
{
  "freshnessRules": [
    {
      "ruleId": "adr-docs",
      "documentPattern": "docs/adr/**/*.md",
      "warnThresholdDays": 14,
      "errorThresholdDays": 30,
      "enabled": true
    },
    {
      "ruleId": "design-docs",
      "documentPattern": "docs/design/**/*.md",
      "warnThresholdDays": 30,
      "errorThresholdDays": 90,
      "enabled": true
    }
  ],
  "pointerRules": [
    {
      "ruleId": "docs-pointers",
      "documentPattern": "docs/**/*.md",
      "failOnBroken": true
    }
  ]
}
```

---

## 3. テスト環境設定

| 設定項目 | 内容 |
|---------|------|
| テストフレームワーク | Vitest 3.0.0 |
| テストヘルパー | `scripts/harness/__tests__/helpers/test-helpers.ts`（target/contextエイリアス） |
| モックライブラリ | Vitestビルトイン `vi.fn()` / `vi.spyOn()` |
| テスト用tmpディレクトリ | `os.tmpdir()` + テスト固有サブディレクトリ |
| ファイルI/Oテスト | 実際のファイルシステム操作（tmpdir内に実ファイルを作成して検証） |
| Git logテスト | `vi.spyOn(child_process, 'execSync')` でモック化（実際のGitに依存しない） |
| 外部Unitアダプタ | HarnessConfigV2は実ファイルをtmpdirに配置して検証 |

---

## 4. UseCaseテストケース

### 4.1 CheckDocFreshnessUseCase（HF2-01）

**テスト配置**: `scripts/harness/__tests__/integration/phase2-extensions/check-doc-freshness-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-P2-001 | 全ドキュメントが鮮度OK（閾値以内）の場合、全result.level='ok'が返ること | `targetPattern=undefined` | FreshnessConfigPort: 1ルール返却; DocumentScannerPort: 1ファイル返却; DocumentAgePort: `ageInDays=5`返却 | `results.length=1`, `results[0].level='ok'`, `summary.ok=1`, `errors=[]` |
| IT-P2-002 | ageInDays=20（warnThreshold=14超）のドキュメントがlevel='warn'で返ること | `targetPattern=undefined` | DocumentAgePort: `ageInDays=20`返却（warn閾値: 14） | `results[0].level='warn'`, `summary.warn=1` |
| IT-P2-003 | ageInDays=60（errorThreshold=30超）のドキュメントがlevel='error'で返ること | `targetPattern=undefined` | DocumentAgePort: `ageInDays=60`返却（error閾値: 30） | `results[0].level='error'`, `summary.error=1` |
| IT-P2-004 | 複数ルール・複数ドキュメントで正しく集計されること | `targetPattern=undefined` | FreshnessConfigPort: 2ルール; DocumentScannerPort: ルール1→2件, ルール2→1件; DocumentAgePort: 3件分のageInDays | `results.length=3`, summaryが3件の内訳を正確に返す |
| IT-P2-005 | source='git-log'の場合、result.ageSource='git-log'が含まれること | `targetPattern=undefined` | DocumentAgePort: `DocumentAge(ageInDays=5, source='git-log')`返却 | `results[0].ageSource='git-log'` |
| IT-P2-006 | source='file-mtime'の場合、result.ageSource='file-mtime'が含まれること | `targetPattern=undefined` | DocumentAgePort: `DocumentAge(ageInDays=5, source='file-mtime')`返却 | `results[0].ageSource='file-mtime'` |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-P2-007 | FreshnessConfigPortが失敗した場合にerrorsにHarnessErrorが含まれること | `targetPattern=undefined` | FreshnessConfigPort: エラーをスロー | `errors.length>=1`, `results=[]` |
| IT-P2-008 | DocumentScannerPortが空配列を返す場合に空のresultsが返ること | `targetPattern=undefined` | FreshnessConfigPort: 1ルール; DocumentScannerPort: `[]`返却 | `results=[]`, `summary.total=0`, `errors=[]` |

#### enabledフラグテスト

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-P2-009 | enabled=falseのルールに対してDocumentScannerPortが呼び出されないこと | `targetPattern=undefined` | FreshnessConfigPort: `enabled=false`のルール1件; DocumentScannerPort: モック | DocumentScannerPort.scan()が呼び出されない。`results=[]` |

---

### 4.2 ValidateDocPointersUseCase（HF2-02）

**テスト配置**: `scripts/harness/__tests__/integration/phase2-extensions/validate-doc-pointers-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-P2-010 | 全ポインタが実在する場合にpassed=trueが返ること | `includeUrlPointers=false` | PointerConfigPort: 1ルール; DocumentScannerPort: 1ファイル; PointerExtractorPort: 2件のfile-pathポインタ; PointerResolverPort: 全true | `passed=true`, `summary.brokenPointers=0`, `errors=[]` |
| IT-P2-011 | broken Pointerが1件ある場合にpassed=falseが返ること | `includeUrlPointers=false` | PointerResolverPort: 1件→false | `passed=false`, `summary.brokenPointers=1`, `results`に`isResolvable=false`のエントリが含まれる |
| IT-P2-012 | URLポインタはスキップされsummary.skippedUrlPointersにカウントされること | `includeUrlPointers=true` | PointerExtractorPort: 1件のurlポインタ; PointerResolverPortは呼び出されない | `summary.skippedUrlPointers=1`, `passed=true` |
| IT-P2-013 | 対象ドキュメントが0件の場合にpassed=true・空のresultsが返ること | `targetPattern=undefined` | DocumentScannerPort: `[]`返却 | `passed=true`, `results=[]`, `summary.totalDocuments=0` |

#### failOnBrokenルールのテスト

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-P2-014 | failOnBroken=trueのルールでbroken Pointer検出時にpassed=falseになること | `targetPattern=undefined` | PointerConfigPort: `failOnBroken=true`のルール; PointerResolverPort: 1件→false | `passed=false` |
| IT-P2-015 | failOnBroken=falseのルールではbroken Pointer検出時もpassed=trueになること | `targetPattern=undefined` | PointerConfigPort: `failOnBroken=false`のルール; PointerResolverPort: 1件→false | `passed=true`, `summary.brokenPointers=1`（警告扱い） |

---

### 4.3 GenerateE2ETemplateUseCase（HF2-03）

**テスト配置**: `scripts/harness/__tests__/integration/phase2-extensions/generate-e2e-template-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-P2-016 | targetPhase='wave1'でE2Eテンプレートが生成されること | `targetPhase='wave1'` | なし | `templateContent`に'wave1'が含まれる。`generatedAt`がISO 8601形式。`errors=[]` |
| IT-P2-017 | outputPath指定時にファイル書き出し処理がハンドラーに委譲されること | `targetPhase='phase2'`, `outputPath='docs/e2e-strategy.md'` | なし | `outputPath='docs/e2e-strategy.md'`がOutputDTOに含まれる（実際の書き出しはHandler責務） |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-P2-018 | targetPhaseが空文字の場合にerrorsにHarnessErrorが含まれること | `targetPhase=''` | なし | `errors.length>=1`（INV-11違反） |

---

## 5. Infrastructure Adapterテストケース

### 5.1 GitLogDocumentAgeAdapter

**テスト配置**: `scripts/harness/__tests__/integration/phase2-extensions/git-log-document-age-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-P2-019 | git logが有効な日時を返す場合にsource='git-log'のDocumentAgeが返ること | `documentPath='docs/product/construction/phase2-extensions/logical_design.md'` | `execSync`モック: `'2026-03-10 12:00:00 +0900'` (10日前) | `DocumentAge.source='git-log'`, `ageInDays >= 9` |
| IT-P2-020 | git logが空文字を返す場合（未コミットファイル）にsource='file-mtime'にフォールバックすること | `documentPath='docs/new.md'` | `execSync`モック: `''`; tmpdir内にファイルを作成（mtime制御） | `DocumentAge.source='file-mtime'` |
| IT-P2-021 | execSyncがエラーをスローする場合（Git外環境）にsource='file-mtime'にフォールバックすること | `documentPath='docs/product/construction/phase2-extensions/logical_design.md'` | `execSync`モック: エラーをスロー; 実ファイルをtmpdir内に作成 | `DocumentAge.source='file-mtime'`, エラーはスローされない |

---

### 5.2 FileSystemDocumentScannerAdapter

**テスト配置**: `scripts/harness/__tests__/integration/phase2-extensions/file-system-document-scanner-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| IT-P2-022 | Globパターンに一致するファイルが2件ある場合、2件のパスが返ること | `pattern='docs/**/*.md'` + tmpdir内に2件の.mdファイル | 2件のファイルパス[]が返る |
| IT-P2-023 | Globパターンに一致するファイルが0件の場合、空配列が返ること | `pattern='docs/nonexistent/**/*.md'` | `[]`が返る |
| IT-P2-024 | node_modules内のファイルはGlobパターンが一致しても除外されること | `pattern='**/*.md'` + tmpdir内にnode_modules/test.mdを作成 | node_modules内ファイルは結果に含まれない |
| IT-P2-025 | excludePatternsに一致する計画文書はGlobパターンが一致しても除外されること | `excludePatterns=[/^docs\/inception\//]` + `docs/inception/WI-001/plan.md` | 保守対象の文書のみ返る |

---

### 5.3 RegexPointerExtractorAdapter

**テスト配置**: `scripts/harness/__tests__/integration/phase2-extensions/regex-pointer-extractor-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| IT-P2-025 | Markdownリンク形式`[text](path)`が正しく抽出されること | `[設計書](docs/product/construction/phase2-extensions/logical_design.md)`を含むファイル | `Pointer(type='file-path', target='docs/product/construction/phase2-extensions/logical_design.md')`が返る |
| IT-P2-026 | URLリンク`[text](https://...)`が`url`タイプで抽出されること | `[GitHub](https://github.com/)`を含むファイル | `Pointer(type='url', target='https://github.com/')`が返る |
| IT-P2-027 | `docs/`で始まる相対パス参照が抽出されること | ` docs/product/construction/phase2-extensions/logical_design.md を参照`を含むファイル | `Pointer(type='file-path', target='docs/product/construction/phase2-extensions/logical_design.md')`が返る |
| IT-P2-028 | ポインタが0件のファイルに対して空配列が返ること | ポインタ記述のないMarkdownファイル | `[]`が返る |

---

### 5.4 FileSystemPointerResolverAdapter

**テスト配置**: `scripts/harness/__tests__/integration/phase2-extensions/file-system-pointer-resolver-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| IT-P2-029 | 実在するファイルパスのPointerに対してtrueが返ること | `Pointer(type='file-path', target='docs/product/construction/phase2-extensions/logical_design.md')` + 実ファイルをtmpdir内に作成 | trueが返る |
| IT-P2-030 | 存在しないファイルパスのPointerに対してfalseが返ること | `Pointer(type='file-path', target='docs/nonexistent.md')` | falseが返る |
| IT-P2-031 | URLタイプのPointerに対して常にtrueが返ること（スキップ） | `Pointer(type='url', target='https://example.com')` | trueが返る（ネットワークアクセスなし） |

---

## 6. Presentation Handlerテストケース

### 6.1 CheckFreshnessHandler

**テスト配置**: `scripts/harness/__tests__/integration/phase2-extensions/check-freshness-handler.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-P2-032 | 全結果がokの場合にexitCode=0が返ること | `args=[]` | CheckDocFreshnessUseCaseモック: `summary.error=0` | exitCode=0 |
| IT-P2-033 | --format=jsonで出力がJSON形式になること | `args=['--format','json']` | CheckDocFreshnessUseCaseモック: 有効な出力 | stdout出力がJSONパース可能 |
| IT-P2-034 | --pattern指定がUseCaseのtargetPatternに渡されること | `args=['--pattern','docs/adr/**/*.md']` | CheckDocFreshnessUseCaseモック | UseCaseが`targetPattern='docs/adr/**/*.md'`で呼ばれる |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-P2-035 | errorレベルの結果がある場合にexitCode=1が返ること | `args=[]` | CheckDocFreshnessUseCaseモック: `summary.error=1` | exitCode=1 |

---

### 6.2 ValidatePointersHandler

**テスト配置**: `scripts/harness/__tests__/integration/phase2-extensions/validate-pointers-handler.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-P2-036 | broken Pointerが0件の場合にexitCode=0が返ること | `args=[]` | ValidateDocPointersUseCaseモック: `passed=true` | exitCode=0 |
| IT-P2-037 | --include-urlsフラグがUseCaseのincludeUrlPointersに渡されること | `args=['--include-urls']` | ValidateDocPointersUseCaseモック | UseCaseが`includeUrlPointers=true`で呼ばれる |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-P2-038 | passed=falseの場合にexitCode=1が返ること | `args=[]` | ValidateDocPointersUseCaseモック: `passed=false` | exitCode=1 |

---

### 6.3 GenerateE2ETemplateHandler

**テスト配置**: `scripts/harness/__tests__/integration/phase2-extensions/generate-e2e-template-handler.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-P2-039 | --phase指定でE2Eテンプレートが生成されexitCode=0が返ること | `args=['--phase','wave1']` | GenerateE2ETemplateUseCaseモック: 有効なOutput | exitCode=0、stdoutにtemplateContentが出力される |
| IT-P2-040 | --output指定時にファイル書き出しが行われること | `args=['--phase','wave1','--output','docs/e2e.md']` + tmpdir使用 | GenerateE2ETemplateUseCaseモック | `docs/e2e.md`にtemplateContentが書き出される |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-P2-041 | --phaseを省略した場合にexitCode=2が返ること | `args=[]`（必須引数なし） | なし | exitCode=2 |

---

@story-id HF2-04
## 6.4 HF2-04: initial-creation-expiration-checker

### CheckInitialCreationExpirationUseCase

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-P2-042 | 全文書が閾値未満で warn なし | rule(days=90,commit=5,or), scanner→[a.md, b.md], frontmatter→両方 initial_creation=true, age→両方 30日/2commit | — | results.length=2, 全て level='ok', warn=0 |
| IT-P2-043 | 1 文書が日数閾値超過 | 同上 scanner, age→a.md=100日/2commit, b.md=30日/2commit | — | warn=1, a.md が level='warn' |
| IT-P2-044 | initial_creation: false の文書は対象外 | scanner→[a.md, b.md], frontmatter→a.md=true/b.md=false, age→両方 100日/10commit | — | results.length=1 (a.md のみ) |
| IT-P2-045 | frontmatter 無し文書はスキップ | scanner→[a.md], frontmatter→initialCreation=false | — | results.length=0 |
| IT-P2-046 | frontmatter parse エラー時は L4-232 warn を個別追加し他は継続 | scanner→[a.md, b.md], a.md frontmatter→throw, b.md=true/閾値超過 | — | warnings.length=2（L4-232 + L4-231）、usecase 全体は exitCode=0 相当（warn のみ） |
| IT-P2-047 | config 未指定時はデフォルト rule (90/5/or) で動作 | configAdapter→空、frontmatter=true, age=100日/2commit | — | warn=1 |
| IT-P2-048 | rule.enabled=false ならスキップ | rule enabled=false, age 任意 | — | results.length=0 |

### GitLogInitialCreationAgeAdapter

| ケースID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| IT-P2-049 | git log で初回コミット取得成功 | 2回コミット済み tmp git repo の a.md | ageInDays=経過日数, commitCount=2, source='git-log' |
| IT-P2-050 | git 未管理ディレクトリは file-mtime fallback | 非 git ディレクトリの a.md | source='file-mtime', commitCount=1 |
| IT-P2-051 | 対象ファイル未存在 → HarnessError | 存在しないパス | 例外 or source=fallback |

### MarkdownFrontmatterReaderAdapter

| ケースID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| IT-P2-052 | `traceability.initial_creation: true` 読み取り | `---\\ntraceability:\\n  initial_creation: true\\n---\\n...` | `{ initialCreation: true }` |
| IT-P2-053 | frontmatter 無しは false を返す | 本文のみ | `{ initialCreation: false }` |
| IT-P2-054 | YAML 不正は例外 | `---\\ntraceability:\\n  initial_creation: maybe\\n---` | throw |

### HarnessConfigInitialCreationExpirationAdapter

| ケースID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| IT-P2-055 | config にルール複数あれば全て読み込む | HarnessConfigV2.phase2Extensions.initialCreationExpirationRules=[r1,r2] | InitialCreationExpirationRule[2] |
| IT-P2-056 | 未指定時は default rule を返す | config=undefined or 該当キーなし | InitialCreationExpirationRule[1] with days=90/commit=5/or |
| IT-P2-057 | enabled=false も尊重される | config rule enabled=false | 読み込まれるが rule.isEnabled()=false |

### CheckInitialCreationExpirationHandler

| ケースID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| IT-P2-058 | warn=0 なら exitCode=0 | usecase→warn=0/error=0 | exitCode=0 |
| IT-P2-059 | warn>=1 でも exitCode=0 (warn 固定、error 昇格なし) | usecase→warn=3/error=0 | exitCode=0（段階導入、error 時のみ 1） |
| IT-P2-060 | usecase が L4-299 error を返す | usecase→errors.length>0 | exitCode=1 |
| IT-P2-061 | --format=json で JSON 出力 | args=['--format','json'] | stdout is valid JSON with results array |

---

## 7. テストケース総数サマリー

| テストファイル | 対象 | ケース数 |
|-------------|------|---------|
| `check-doc-freshness-usecase.test.ts` | CheckDocFreshnessUseCase | 9 |
| `validate-doc-pointers-usecase.test.ts` | ValidateDocPointersUseCase | 6 |
| `generate-e2e-template-usecase.test.ts` | GenerateE2ETemplateUseCase | 3 |
| `git-log-document-age-adapter.test.ts` | GitLogDocumentAgeAdapter | 3 |
| `file-system-document-scanner-adapter.test.ts` | FileSystemDocumentScannerAdapter | 3 |
| `regex-pointer-extractor-adapter.test.ts` | RegexPointerExtractorAdapter | 4 |
| `file-system-pointer-resolver-adapter.test.ts` | FileSystemPointerResolverAdapter | 3 |
| `check-freshness-handler.test.ts` | CheckFreshnessHandler | 4 |
| `validate-pointers-handler.test.ts` | ValidatePointersHandler | 3 |
| `generate-e2e-template-handler.test.ts` | GenerateE2ETemplateHandler | 3 |
| `check-initial-creation-expiration-usecase.test.ts` | CheckInitialCreationExpirationUseCase (HF2-04) | 7 |
| `git-log-initial-creation-age-adapter.test.ts` | GitLogInitialCreationAgeAdapter (HF2-04) | 3 |
| `markdown-frontmatter-reader-adapter.test.ts` | MarkdownFrontmatterReaderAdapter (HF2-04) | 3 |
| `harness-config-initial-creation-expiration-adapter.test.ts` | HarnessConfigInitialCreationExpirationAdapter (HF2-04) | 3 |
| `check-initial-creation-expiration-handler.test.ts` | CheckInitialCreationExpirationHandler (HF2-04) | 4 |
| **合計** | | **61** |

<!-- @work-item-id WI-164 -->
## WI-164 Pointer Freshness Integration Cases

| ケースID | シナリオ | 入力 | 期待結果 |
|---|---|---|---|
| IT-P2-WI164-001 | broken product-doc pointer carries owner/type/source/severity/next action | product-doc pointer to missing file | JSON result includes semantic pointer type, source document, warning/error severity, and repair action |
| IT-P2-WI164-002 | external-url pointer is skipped by default | `https://example.com` pointer with default policy | result is skipped/resolvable without network access |
| IT-P2-WI164-003 | L4 bridge can consume freshness output | stale document fixture | validator-system can map result to `L4-004` warning |
| IT-P2-WI164-004 | L4 bridge can consume pointer output | broken pointer fixture | validator-system can map result to `L4-005` warning |
