# Quality Harness US再設計 — 議論用ドキュメント

> **目的**: プロダクト分離（Quality Harness / Orchestration Engine）に伴い、アーカイブUS55件を仕分けし、Harness側のUSを再設計する
> **入力**: `docs/product/harness_product_overview.md`, `docs/product/archive/user_stories.md`

---

## 1. 仕分け方針

### 判断基準
- **Quality Harnessの責務**: 「何を守るか（WHAT to enforce）」
- **Orchestrationの責務**: 「どう実行するか（HOW to orchestrate）」
- harness_product_overview.md §1.4 の責務境界表が正式な基準

---

## 2. Orchestration側に移管するUS（Harness USから除外）

### E-01: コンテキストエンジニアリング基盤 → 全除外
| US | タイトル | 移管理由 |
|----|---------|---------|
| US-001 | context-priority.json | コンテキスト配分はOrchestrationの責務（§1.4: コンテキスト管理） |
| US-002 | SKILL.mdコンテキストバジェット | 同上 |
| US-003 | Fresh Context Protocol | 同上 |
| US-004 | Compact時優先保持 | 同上 |

### E-04: セッション継続性 → 全除外
| US | タイトル | 移管理由 |
|----|---------|---------|
| US-013 | session-state.json | セッション管理はOrchestration（§1.4: セッション管理） |
| US-014 | harness:resume | 同上 |
| US-015 | Stop Hook/pause時更新 | 同上 |

### E-07: ライフサイクル管理 → 全除外
| US | タイトル | 移管理由 |
|----|---------|---------|
| US-023 | milestones.json | Milestone管理はOrchestration（§1.4） |
| US-024 | state.json | 同上 |
| US-025 | harness:progress | 同上 |
| US-026 | マイルストーン完了時監査 | 同上 |

### E-15: オーケストレーションコマンド → 全除外
| US | タイトル | 移管理由 |
|----|---------|---------|
| US-050 | /gsdlc:init-project | Orchestrationコマンド |
| US-051 | /gsdlc:design | 同上 |
| US-052 | /gsdlc:plan | 同上 |
| US-053 | /gsdlc:execute | 同上 |
| US-054 | /gsdlc:verify | 同上 |

### E-08 一部 → 移管
| US | タイトル | 移管理由 |
|----|---------|---------|
| US-027 | orchestration.config.json新設 | Orchestration設定ファイル |
| US-028 | sessionセクション追加 | 同上 |

**移管合計: 20件**

---

## 3. Harness側に残すUS（要改修）

### E-02: Nyquist検証層（US-005~009）→ 維持・改修
- 新harness_product_overview.mdの§5.3 Traceability Modelと統合
- @story メタデータとの連携を強化
- L3 nyquistバリデータとの整合性を明確化
- **議論点**: US-008 (impact-analysis) はharnessコマンドとして残すべきか？

### E-03: Quick Mode（US-010~012）→ ほぼ維持
- harness_product_overview.md §5.4に詳細定義済み
- US-011のバリデータ構成をL1-L4体系に合わせて更新

### E-05: 品質ハーネス強化 Hooks拡張（US-016~019）→ 要改修
- **議論点**: PreToolUse/PostToolUse/Stop HookはClaude Code固有のAPI
  - エージェント非依存の観点で矛盾しないか？
  - → 解: HookはClaude Code「利用時」のオプショナルな強化。L1-L4はHook無しでも機能する
  - US-016~019はClaude Code統合オプションとして位置付け直す？

### E-06: ADR・ドキュメント管理基盤（US-020~022）→ 維持
- ほぼ変更なし

### E-08 一部: phasegate.config.json v2（US-029~030）→ 要改修
- US-029: 「GSD由来機能のデフォルト無効化」→ Harness側の設定に限定
- US-030: v1→v2マイグレーション → phasegate.config.jsonのみを対象に
- **議論点**: orchestration.config.jsonへの分離はOrchestration側USか？
  → US-030の「分離」機能自体がどちらの責務か要整理

### E-09: K回帰保証（US-031~033, US-055）→ 拡張
- K14（Phase Dependency Model）、K15（Plan文書必須生成）の回帰テスト追加が必要
- Go/No-Go Gateの帰属再整理（品質側: #4, #5, #8）

### E-10: HarnessError拡充（US-034~035）→ 維持
- ほぼ変更なし

### E-11: Biome移行（US-036~039）→ 維持
- US-037（PostToolUse Hook）: エージェント非依存の文脈で「Claude Code利用時のオプション」として再定義

### E-12: FUSE Hooks Engine（US-040~044）→ v1スコープ外
- harness_product_overview.md §5.7: v1スコープ外の将来構想
- **議論点**: USとして残すか、将来フェーズとして記録のみか？

### E-13 一部: スキル強化
- US-045: Fresh Context部分はOrchestration移管、Atomic Commits部分はHarness
  - → 分割してHarness側は「Atomic Git Commits」のみのUSに
- US-046: test-coverage-checker Nyquist統合 → Harness
- US-047: implementation-readiness-checker Plan-Checker → Harness

### E-14: v0テスト移行（US-048~049）→ 維持

**残存合計: 約25件（改修含む）**

---

## 4. 新規USが必要な領域

harness_product_overview.mdに定義されているがアーカイブUSでカバーされていない概念:

### 4.1 Phase Dependency Model（§5.6, K14）
- 3層フェーズ構造（Level 1/2/3）の定義と前提条件の機械的強制
- phase-gateバリデータの拡張（レベル間依存検証）
- phaseDependencies設定（phasegate.config.json）
- カスタマイズ制約の実装

### 4.2 Planning Mode（§5.6, K15）
- interactive / embedded-qa モードの選択
- plan文書（*_plan.md）の必須生成
- QAセクションの構造化
- plan文書なしのPhase 2移行拒否

### 4.3 Traceability Model（§5.3, K3.5拡張）
- @US-XXX メタデータの設計文書付与・検証
- @story メタデータのテストファイル付与・検証
- 逆引きチェーン（実装→Unit→設計→US→計画）の検証
- metadataバリデータ(L2)の拡張

### 4.4 Harness API/コマンド（§9.1）
- harness:check-ready（Phase Gate通過状態返却）
- harness:check-phase（現在フェーズ返却）
- harness:ci-check（L3バリデータ実行結果返却）
- harness:detect-drift（設計-実装乖離レポート返却）
- harness:status（ハーネス全体健全性サマリ返却）
- **議論点**: これらはバリデータのCLIラッパーか、独立したUSか？

### 4.5 Preset System（§7.3）
- minimal/standard/strictの3プリセット定義
- プリセット切替機能
- プリセットごとのバリデータ有効/無効マッピング

### 4.6 CI/CDテンプレート（§7.4）
- aidlc-gate.yml（PR検証ワークフロー）
- consistency-check.yml（週次検証）
- .husky/pre-commit テンプレート

### 4.7 phasegate.config.json v2 新セクション
- phaseDependencies（§5.6）
- planningMode（§5.6）
- paths（designDocs, inceptionDocs）
- reporting（format, outputDir）

### 4.8 Agent-Lesson System（K9）
- 旧USでは明示的なUS化されていなかった
- [Agent-Lesson]収集→AGENTS.md更新の仕組み

### 4.9 Cascade Updater拡張（K8）
- Level 3完了後のproduct/construction/{unit}/累積更新
- @US-XXXアノテーション自動付与

---

## 5. 議論すべき設計判断

### Q1: E-12 FUSE Hooks Engine（US-040~044）の扱い
- 選択肢A: v1 USとして残すが優先度をCould/Won'tに
- 選択肢B: USから除外し、harness_product_overview.md §5.7の将来構想として記録のみ
- 選択肢C: Phase 2 USとして別セクションに分離

### Q2: Hook系US（E-05）のエージェント非依存性との整合
- PreToolUse/PostToolUse/Stop HookはClaude Code固有API
- 品質ハーネスの「エージェント非依存」原則との整合をどう取るか
- 提案: 「エージェント統合オプション」Epicとして再定義

### Q3: Harness APIコマンド群のUS粒度
- 5つのharnessコマンドを個別USにするか、まとめるか
- 提案: 関連性の高いものをグループ化（check系3つ + detect-drift + status）

### Q4: Preset Systemの独立US化
- minimal/standard/strictはconfig v2の一部か、独立機能か
- 提案: phasegate.config.json v2のUSに含める

### Q5: E-13 US-045の分割方法
- Atomic Commits（Harness）とFresh Context（Orchestration）の分離
- story-implementor自体はHarness所属スキル（§7.2）
- 提案: Atomic Commits + TDD品質保証部分のみHarness USに

---

## 6. 予想されるEpic再構成（仮）

| Epic ID | Epic名 | 旧Epic対応 | 新規/改修 |
|---------|--------|-----------|---------|
| H-01 | Biome AST解析基盤 | E-11 | 改修 |
| H-02 | Phase Dependency Model | 新規 | 新規 |
| H-03 | Traceability Model | 新規（K3.5拡張） | 新規 |
| H-04 | Nyquist検証層 | E-02 | 改修 |
| H-05 | Quick Mode | E-03 | 軽微改修 |
| H-06 | HarnessError体系 | E-10 | 改修 |
| H-07 | phasegate.config.json v2 | E-08一部 | 改修 |
| H-08 | Harness API | 新規 | 新規 |
| H-09 | ADR基盤 | E-06 | 維持 |
| H-10 | CI/CDテンプレート | 新規 | 新規 |
| H-11 | エージェント統合オプション | E-05 | 再定義 |
| H-12 | スキル品質強化 | E-13一部 | 改修 |
| H-13 | K1-K15回帰保証 | E-09 | 拡張 |
| H-14 | v0テスト資産移行 | E-14 | 維持 |
| H-15 | FUSE Hooks Engine | E-12 | 将来Phase |

---

## レビュー依頼事項

1. 仕分け（§2, §3）に漏れ・誤りはないか
2. 新規US領域（§4）に漏れはないか — harness_product_overview.mdの全セクションがカバーされているか
3. 設計判断（§5）への意見
4. Epic再構成（§6）の妥当性
