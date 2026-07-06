---
id: WI-234
type: chore
severity: normal
status: drafted
affects: [docs]
---

# WI-234: skill-quality coverage_report.md の水増し（ロンダリング）主張を正直化（Phase 1: ダウングレード）

> 起票日: 2026-07-07
> 経緯: リポジトリ全体で発見されたカバレッジレポート・ロンダリング（存在しないテスト ID の計上 / モック限定テストの実成果物検証への誤計上）の skill-quality インスタンス。反ロンダリング原則（真であることのみ）に基づき、まず虚偽の主張を正直な `未カバー/部分` に下方修正する。これは v0.174.0 の adr-foundation H05-02（「correct false coverage claim」）と同じ多段修復の Phase 1 に相当する。

## 背景

`docs/product/construction/skill-quality/coverage_report.md`（skill-quality は H12-01..H12-06 を担当）は、総合カバレッジ 98.4%（61/62）を主張していたが、実 grep 検証により以下の水増しが判明した:

1. **§6 Presentation Handler「6/6 100%（18件）」= 虚偽**。cited した `IT-API-*Handler-*` / `IT-API-*E2E-*` 連番 ID はテストツリーに 1 件も存在しない。実在は `ApplyCascadeUpdateHandler` の間接検証のみ（実 1/6）。
2. **§5 Infrastructure Adapter「11/11 100%（29件）」= 水増し**。専用テストファイルが実在するのは 5 adapter のみ（実 5/11）。残り 6 の `IT-REPO-*` ID は不存在。
3. **H12-06-AC-2/AC-3「SKILL.md が必須構造に適合」= 虚偽（実成果物検証の誤計上）**。cited した `IT-UC-ValSkill-001/002` は実在するが、モックした `SkillFileReaderPort` にコード内ハードコード Markdown を注入してバリデータ**ロジック**を検証するもので、実 `skills/*/SKILL.md` コーパスの適合は未検証。`IT-API-SkillE2E-001/002` は不存在。
4. **H12-01-AC-4「TDD 品質契約が SKILL.md に定義」= 虚偽（誤アーティファクト）**。cited した `UT-TC-004〜007` は `CommitReadiness` 値オブジェクトのロジック検証で、SKILL.md の内容ではない。
5. **H12-06-AC-1「requiredSections 6件」= ドリフト**。`skill-structure.ts` の `REQUIRED_SECTIONS` は 7 件（frontmatter/languageMetadata/purpose/inputs/outputs/prerequisites/executionFlow）。

## 作業内容（docs のみ）

1. 上記の虚偽行を `未カバー`（H12-01-AC-4 / H12-06-AC-2 / H12-06-AC-3 / INV-7 / §5 の 6 adapter / §6 の 5 handler）または `部分`（H12-02-AC-4 / H12-04-AC-4 / §6 ApplyCascadeUpdateHandler 間接）へ下方修正。各行に虚偽の理由（捏造 ID / モック限定 / 誤アーティファクト）と後続フェーズでの実テスト整備予定を注記。
2. `requiredSections 6件` → `7件` にドリフト修正（本行はカバー維持）。
3. §1 サマリー・§2 総計・§3〜§6・§8・§9 を再計算し、総合を **98.4%（61/62）→ 71.0%（44/62）** に訂正。
4. 「訂正履歴（2026-07-07）」を追記し、除去した水増しの一覧・**実ソースは実装済みでありテスト/引用のギャップであってフィーチャ欠落ではない**旨・実テスト + `@ac` 束縛 + L3-005 ゲーティングは後続フェーズ（WI-235+）で行う旨を記録。リポジトリ全体のロンダリング所見の skill-quality インスタンスである旨を参照。

## スコープ外（後続フェーズ）

- 新規テストの作成、`scripts/harness/` ソースの変更、`phasegate.config.json` / `acBoundStories` の変更、ADR の起票は**一切行わない**。本 WI は docs のみ。
- 実テスト追加・`@ac` 束縛・L3-005 ゲーティングは WI-235 以降で実施。

## 検証

- 各下方修正が grep で防御可能なこと（`IT-API-*Handler`/`IT-API-*E2E`/未実装 adapter の `IT-REPO-*` が 0 件、`REQUIRED_SECTIONS` が 7 件、validate-skill-structure テストが `vi.fn().mockResolvedValue` でモックしていること）。
- 反ロンダリング原則の遵守（不確実な行は `未カバー` とし、実カバーを過小・過大のいずれにも計上しない）。
