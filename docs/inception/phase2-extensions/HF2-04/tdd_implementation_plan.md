---
traceability:
  initial_creation: true
---

# TDD実装計画: HF2-04 initial-creation-expiration-checker

## 1. スコープ

@story-id HF2-04
**対象ストーリー**: HF2-04 (initial-creation-expiration-checker / L4拡張 / frontmatter semantic drift 検出)

**受け入れ基準**:
- AC-1: `initial_creation: true` を持つ設計文書の初回コミット日からの経過日数を検出する L4 validator
- AC-2: 閾値（日数 / コミット回数）が `phasegate.config.json` で設定可能
- AC-3: 閾値超過時に `warning` severity で HarnessError 出力
- AC-4: `initial_creation: false` / frontmatter 無しは対象外
- AC-5: config 未指定時はデフォルト閾値（90 日 OR 5 コミット）
- AC-6: HF2-01 とは独立した validator として責務分離

**影響レイヤー**:
| 層 | 追加ファイル数 |
|----|---------------|
| Domain | aggregate 1 / VO 1 / service 1 / port 3 = 6 ファイル |
| Application | UseCase 1 / DTO 2 = 3 ファイル |
| Infrastructure | adapter 3 = 3 ファイル |
| Presentation | handler 1 / formatter 1 = 2 ファイル |
| composition-root | 1 ファイル（更新） |
| config schema | 1 ファイル（更新） |
| Unit tests | 約 20 ケース追加 |
| IT tests | 約 20 ケース追加 |

## 2. 前提条件検証

- `implementation-readiness-checker`: 本セッション内で**略式実行**（story-implementor 正規フローの緩和）
- ストーリー固有論理設計: ✅ `docs/inception/phase2-extensions/HF2-04/logical_design.md` 作成済み
- 横断論理設計更新: ✅ `docs/product/construction/phase2-extensions/logical_design.md` § 3.4 / D4 / D5 追加済み
- ドメインモデル更新: ✅ `domain_model.md` に InitialCreationExpirationRule / InitialCreationAge / 新ポート 3 本を追加
- Unit テスト設計: ✅ `unit_test_design.md` に UT-P2-066〜082 追加
- IT テスト設計: ✅ `it_test_design.md` に IT-P2-042〜061 追加
- 環境設計: 既存 `docs/product/environment_contract.md` に追加要素なし（git 依存のみ、既に記載済み）

## 3. TDD 実装順序（テストピラミッド準拠）

### Phase 2-A: Domain 層 (Unit テスト RED→GREEN→REFACTOR)

| ステップ | 対象 | テスト | 実装 |
|---------|------|--------|------|
| 2-A-1 | InitialCreationAge VO | UT-P2-079〜082 | `domain/value-objects/initial-creation-age.ts` |
| 2-A-2 | InitialCreationExpirationRule 集約 | UT-P2-074〜078 | `domain/aggregates/initial-creation-expiration-rule.ts` |
| 2-A-3 | InitialCreationExpirationCheckService | UT-P2-066〜073 | `domain/services/initial-creation-expiration-check-service.ts` |
| 2-A-4 | 新ポート 3 本 | 型のみ（実行テスト不要） | `domain/ports/initial-creation-expiration-config-port.ts` / `frontmatter-reader-port.ts` / `initial-creation-age-port.ts` |

**実行方式**: メインセッションで直接

### Phase 2-B: Application 層 (IT テスト)

| ステップ | 対象 | テスト | 実装 |
|---------|------|--------|------|
| 2-B-1 | DTO | 型のみ | `check-initial-creation-expiration-input.ts` / `-output.ts` |
| 2-B-2 | CheckInitialCreationExpirationUseCase | IT-P2-042〜048 | `application/usecases/check-initial-creation-expiration-usecase.ts` |

### Phase 2-C: Infrastructure 層 (IT テスト)

| ステップ | 対象 | テスト | 実装 |
|---------|------|--------|------|
| 2-C-1 | MarkdownFrontmatterReaderAdapter | IT-P2-052〜054 | `infrastructure/adapters/markdown-frontmatter-reader-adapter.ts` |
| 2-C-2 | GitLogInitialCreationAgeAdapter | IT-P2-049〜051 | `infrastructure/adapters/git-log-initial-creation-age-adapter.ts` |
| 2-C-3 | HarnessConfigInitialCreationExpirationAdapter | IT-P2-055〜057 | `infrastructure/adapters/harness-config-initial-creation-expiration-adapter.ts` |

### Phase 2-D: Presentation 層 (IT テスト)

| ステップ | 対象 | テスト | 実装 |
|---------|------|--------|------|
| 2-D-1 | InitialCreationExpirationResultFormatter | handler テスト内で合わせて検証 | `presentation/formatters/initial-creation-expiration-result-formatter.ts` |
| 2-D-2 | CheckInitialCreationExpirationHandler | IT-P2-058〜061 | `presentation/handlers/check-initial-creation-expiration-handler.ts` |

### Phase 2-E: 配線 / Config

| ステップ | 対象 | 実装 |
|---------|------|------|
| 2-E-1 | composition-root に新 UseCase / Handler を追加 | `composition-root.ts` |
| 2-E-2 | phasegate.config.json に default section を追加（任意 / example としてコメント） | 設定ファイル |
| 2-E-3 | config-foundation schema に `initialCreationExpirationRules` フィールドを追加 | `harness-config.ts` 該当部位 |

### Phase 2-F: CLI 配線

| ステップ | 対象 | 実装 |
|---------|------|------|
| 2-F-1 | main.ts にサブコマンド `p2:check-initial-creation` を追加し Handler にディスパッチ | `main.ts` |

## 4. 環境検証チェックリスト

- [ ] node v18+ で型チェック通る
- [ ] `pnpm test` 全 3077+α tests GREEN
- [ ] `npx phasegate lint` で L1 新規違反なし（`@unit` / `@layer` コメント必須）
- [ ] ローカル git repo で `npx phasegate p2:check-initial-creation` が動作（smoke test）

## 5. QA（不明点・確認事項）

### [Question] Q1: CLI サブコマンド名

HF2-01 は `p2:check-freshness`、HF2-02 は `p2:validate-pointers`。本 validator のサブコマンド名候補:
- 案 A: `p2:check-initial-creation`（簡潔 / HF2-01 と同形）
- 案 B: `p2:check-expiration`（汎用化、将来他の expiration check にも流用可能）
- 案 C: `p2:check-initial-creation-expiration`（冗長だが意味が明確）

**推奨**: **案 A**（簡潔 + 他コマンドとの命名一貫性）

[Answer]
（人間が回答を記入）

---

### [Question] Q2: `commit count` 算出に使うコマンド

初回コミット日と累積コミット回数を取得する git コマンド候補:
- 案 A: `git log --diff-filter=A --format=%ai -- <path>` で初回追加日、`git rev-list --count HEAD -- <path>` で件数（2 コマンド実行）
- 案 B: `git log --format=%ai -- <path>` の出力行数で件数、最終行で初回日（1 コマンドで完結するがソート依存）

**推奨**: **案 A**（責務分離・`--diff-filter=A` で rename 済みファイルも初回追加として扱える / 実行回数は multiply で問題視せず）

[Answer]
（人間が回答を記入）

---

### [Question] Q3: L4 CI パイプラインへの組み込みタイミング

本 validator は L4 validator として設計するが、`npx phasegate validate --layer L4` の既存パイプラインに**今回のコミットで接続する**か、**次 issue で接続する**か:
- 案 A: 今回のコミットで `validate --layer L4` の execute chain に含める（CI で即時走る）
- 案 B: 今回は handler を新設するのみ。既存 L4 パイプラインへの接続は ISSUE-013（新設）で対応

**推奨**: **案 B**（初期導入リスクを最小化。warn 固定とはいえ、既存プロジェクトで突然新 warn が噴出すると混乱を招くため、opt-in CLI として先行リリースし、安定後に自動実行へ接続）

[Answer]
（人間が回答を記入）

---

### [Question] Q4: デフォルトルールを適用するか否か

`phasegate.config.json` に `initialCreationExpirationRules` セクションが無い場合の挙動:
- 案 A: 常にデフォルトルール（`docs/**/*.md`、90 日、5 コミット、or）を適用
- 案 B: セクションが無ければ validator 自体を disabled とし、明示的に opt-in を要求
- 案 C: CLI フラグ `--with-defaults` を渡した時のみデフォルト適用

**推奨**: **案 A**（他 validator と同様の挙動で UX 一貫。warn 固定なのでブロッカーにはならない）

[Answer]
（人間が回答を記入）

---

## 6. 前提条件・リスク

### リスク

1. **既存プロジェクトで即時 warn 噴出**: 稼働中プロジェクトの設計文書に `initial_creation: true` が多く残っている場合、validator 導入直後に多量の warn が出る → Q3 の案 B（opt-in CLI 先行）で緩和
2. **git コマンド 2 回実行のコスト**: 文書 100 件で 200 回 execSync が走るが、既存 `GitLogDocumentAgeAdapter` も同等のパターンで許容されているため問題視しない
3. **frontmatter-flag-parser の traceability-model → phase2-extensions への cross-unit import**: D5 で整理済み。adapter でラップして影響範囲を閉じ込める

### 前提

- 既存 `HarnessConfigV2` 型は拡張可能（optional フィールド追加で破壊なし）
- `DocumentScannerPort` は HF2-01 と共通で再利用可能（glob パターンのみで十分）
- `fast-glob` 追加依存不要（既存プロジェクトで採用済み）

## 7. 完了条件

- [ ] UT-P2-066〜082 全て GREEN
- [ ] IT-P2-042〜061 全て GREEN
- [ ] `pnpm test` 全 tests GREEN（既存 3077 tests + 新規約 20 tests）
- [ ] `phasegate.config.json` schema に新フィールド対応
- [ ] composition-root 配線完了
- [ ] CLI サブコマンド動作確認
- [ ] L1 lint 違反ゼロ（新規ファイルに `@unit` / `@layer` コメント必須）
