# Quality Harness US再設計 — 計画書

> **フェーズ**: Phase 1（計画）— 人間承認待ち
> **目的**: プロダクト分離に伴い、Quality Harness側のUSを再設計する
> **入力**: `docs/product/harness_product_overview.md`, `docs/product/archive/user_stories.md`
> **レビュー**: Claude (Opus 4.6) 初期分析 → codex (gpt-5.4) 1stレビュー → Claude統合 → codex 2ndレビュー → 修正反映
> **作成日**: 2026-03-12

---

## QA（設計判断の根拠）

### Q1: FUSE Hooks Engine（旧E-12）の扱い
- **Q**: v1スコープ外のFUSE関連USをどう扱うか？
- **A**: **Phase 2 backlogとして独立保持**。v1 Epicには混ぜず将来フェーズとして記録。
- **根拠**: harness_product_overview.md §5.7で明確にv1スコープ外と定義済み。

### Q2: Hook系US（旧E-05）のエージェント非依存性との整合
- **Q**: PreToolUse/PostToolUse/Stop HookはClaude Code固有API。エージェント非依存原則と矛盾しないか？
- **A**: コア能力をCLI/FSフォールバックで定義し、Claude HookはAdapter実装として扱う。ただし§10.1でv1必須機能に指定されているため**Wave 2に配置**（Wave 3に遅延させない）。
- **根拠**: §2.2「エージェントの下に敷かれる」原則 + §10.1「リンター設定保護Hook」「Stopフックテストゲート」がv1必須。

### Q3: Harness APIコマンド群のUS粒度
- **Q**: 5つのharnessコマンドを個別USにするか、まとめるか？
- **A**: **4USに分割**。(1) check-ready/check-phase、(2) ci-check、(3) detect-drift、(4) status。
- **根拠**: statusは成果物駆動状態導出を背負う独立機能。ci-checkは全L3バリデータの統合実行。

### Q4: Preset Systemの独立US化
- **Q**: minimal/standard/strictはconfig v2の一部か、独立USか？
- **A**: H-04配下の**独立US**として扱う（Epic分割はしない）。
- **根拠**: Presetはレイヤー有効化、閾値、strict専用機能まで挙動が変わる機能。

### Q5: US-045の分割方法
- **Q**: story-implementorのFresh ContextとAtomic Commitsをどう分けるか？
- **A**: **三分割**。Harness: (a) Atomic commits + (b) TDD品質契約。Orchestration: Fresh Context Protocol。quick-implementorも別USで立てる。

### Q6: US-015の扱い
- **Q**: Stop Hook/pause時のsession-state.json更新はHarnessかOrchestrationか？
- **A**: **分割**。Stop Hook品質ゲート（テスト通過強制）→ Harness。session-state.json永続化 → Orchestration。

### Q7: バリデータ個別US化の粒度
- **Q**: L1-L4の18バリデータをどの粒度でUS化するか？
- **A**: L3 coverageはsecurity+performanceと分離して独立US化。L4は3バリデータを個別US化（drift-detect, consistency-check, dead-code）。

### Q8: 30スキルの移管・維持（codex 2ndレビューで追加）
- **Q**: §7の30スキルについて、v1でどう移管・維持するかのUSが不足している
- **A**: H-11に「スキルSKILL.md構造維持検証US」を追加。v0既存スキルのSKILL.md構造が所定フォーマットを維持していることを検証する。新規スキルについてはH-14回帰テストでカバー。

### Q9: Wave依存のH-05/H-06順序（codex 2ndレビューで修正）
- **Q**: H05(HarnessError)は全バリデータにadr_refを要求するが、ADR整備はH06。依存方向が逆。
- **A**: **H-05をADR基盤、H-06をHarnessError体系に入れ替え**。ADRが先、HarnessErrorのadr_ref付与が後。

---

## 計画内容

### 1. 最終仕分け結果

#### Orchestration移管: 21件
| 旧US | タイトル | 移管理由 |
|------|---------|---------|
| US-001~004 | E-01 コンテキスト基盤全体 | Orchestration責務 |
| US-013~014 | E-04 session-state/resume | セッション管理 |
| US-015（状態永続化部分） | pause時session-state更新 | セッション管理 |
| US-023~026 | E-07 ライフサイクル管理全体 | Orchestration責務 |
| US-027~028 | orchestration.config.json | Orchestration設定 |
| US-030 | v1→v2マイグレーション（分離機能） | 両パッケージ横断 |
| US-045（FCP部分） | Fresh Context Protocol | コンテキスト管理 |
| US-050~054 | E-15 オーケストレーションコマンド | Orchestration |

### 2. Epic再構成（確定版）

| Epic ID | Epic名 | 概要 | Wave |
|---------|--------|------|------|
| **H-01** | **Biome AST解析基盤** | L1コア4ルールBiome移植 + AIアンチパターン4ルール + CIパイプライン統合 | 1 |
| **H-02** | **Phase Dependency Model** | 3層フェーズ依存定義 + phase-gateバリデータ拡張 + phaseDependencies設定 | 1 |
| **H-03** | **Traceability Model** | @unit/@layer/@US-XXX/@storyメタデータ体系 + metadataバリデータ拡張 + 逆引きチェーン検証 | 1 |
| **H-04** | **phasegate.config.json v2** | 品質設定スキーマ確定 + Preset System (minimal/standard/strict) + 新セクション | 1 |
| **H-05** | **ADR基盤** | ADRテンプレート + archgate + 初期ADR作成（§12 Key Decisionsベース）+ ステータス管理 | 1 |
| **H-06** | **HarnessError体系** | 統一エラーフォーマット + ADR参照+fix_example付与 + fix_example品質保証 + severity権限契約 | 1 |
| **H-07** | **Nyquist検証層** | requirement-test-matrix.json + AC網羅率算出 + Traceability統合 + impact-analysis | 2 |
| **H-08** | **L2-L4バリデータ体系** | L2 test-quality + L3 security/performance/coverage + L4 drift-detect/consistency-check/dead-code | 2 |
| **H-09** | **Harness API** | check-ready/check-phase + ci-check + detect-drift + status（成果物駆動状態導出） | 2 |
| **H-10** | **Quick Mode** | Quick Mode設定 + 判定エンジン + quick-check + quick-implementor | 2 |
| **H-11** | **エージェント統合オプション** | コア能力CLI/FS定義 + Claude Code Hook Adapter (PreToolUse/PostToolUse/Stop) + エージェント非依存ガード | 2 |
| **H-12** | **スキル品質強化** | story-implementor Atomic Commits/TDD契約 + Nyquist統合 + Plan-Checker + Agent-Lesson + Cascade Updater + SKILL.md構造維持 | 3 |
| **H-13** | **Scheduled Governance & CI/CDテンプレート** | L4運用 + aidlc-gate.yml + consistency-check.yml + .husky/pre-commit + 反復エラーエスカレーション + AGENTS.mdポインタ化 | 3 |
| **H-14** | **K1-K15回帰保証** | K1-K15全非交渉要件の回帰テスト + Go/No-Go Gate品質側3条件 | 3 |
| **H-15** | **v0テスト資産移行** | v0 143テスト仕様のv1再実装 + CIゲート化 | 3 |
| **H-F1** | **FUSE Hooks Engine** | (Phase 2 backlog) L0 Pre-write enforcement | Future |
| **H-F2** | **Phase 2拡張** | (Phase 2 backlog) doc-freshness-checker + pointer-validator + E2Eテスト戦略テンプレート | Future |

### 3. Wave分割（依存関係ベース）

```
Wave 1: 基盤構築（H-01〜H-06）
───────────────────────────────────
H-04 config v2/preset  ← 全Epicの設定基盤
H-01 Biome L1基盤      ← L1バリデータの土台
H-02 Phase Dependency   ← phase-gateの前提定義
H-03 Traceability       ← metadataの前提定義
H-05 ADR                ← HarnessError(H-06)のadr_ref前提
H-06 HarnessError       ← ADR(H-05)完了後に全バリデータにadr_ref付与

Wave 2: コア品質機構 + エージェント統合（H-07〜H-11）
───────────────────────────────────
H-07 Nyquist            ← Traceability(H-03)の上に構築
H-08 L2-L4バリデータ    ← L1(H-01) + Phase(H-02) + Error(H-06)の上に構築
H-09 Harness API        ← バリデータ群のCLIラッパー
H-10 Quick Mode         ← L1-L4基盤 + config(H-04)の上に構築
H-11 エージェント統合   ← コア機能(Wave 1)完成後。v1必須のため前倒し

Wave 3: 拡張・運用・保証（H-12〜H-15）
───────────────────────────────────
H-12 スキル品質強化     ← Nyquist(H-07) + バリデータ(H-08)の上に構築
H-13 Scheduled Gov      ← L4バリデータ(H-08) + CI template
H-14 K回帰保証          ← 全機能実装後の横断テスト
H-15 v0テスト移行       ← Biome(H-01)完了後

Future Phase:
H-F1 FUSE Hooks Engine  ← v1完了後
H-F2 Phase 2拡張        ← v1完了後
```

### 4. US一覧（Epic別）

#### H-01: Biome AST解析基盤（3 US）
| US | タイトル | 旧US | 優先度 |
|----|---------|------|--------|
| H01-01 | v0コア4ルールのBiomeプラグイン移植（require-unit-comment/require-layer-comment/no-layer-violation/enforce-folder-structure） | US-036 | Must |
| H01-02 | AI生成コードアンチパターン検出ルール（no-any-abuse/no-code-duplication/no-ghost-file/no-comment-flood） | US-038 | Must |
| H01-03 | CIパイプラインBiome統合（ESLint完全除去） | US-039 | Must |

#### H-02: Phase Dependency Model（3 US）
| US | タイトル | 旧US | 優先度 |
|----|---------|------|--------|
| H02-01 | 3層フェーズ構造（Level 1/2/3）定義 + phase-gateバリデータ拡張（レベル間依存検証） | 新規（K14） | Must |
| H02-02 | Planning Mode（interactive/embedded-qa）+ plan文書（*_plan.md）必須生成 | 新規（K15） | Must |
| H02-03 | Phase Dependencyカスタマイズ（phasegate.config.json phaseDependencies + override制約） | 新規 | Should |

#### H-03: Traceability Model（3 US）
| US | タイトル | 旧US | 優先度 |
|----|---------|------|--------|
| H03-01 | @unit/@layerメタデータ体系 + L2 metadataバリデータ基本実装（Unit名整合/Layer名整合） | 新規（K3.5） | Must |
| H03-02 | @US-XXXメタデータ + 設計文書累積更新時の付与検証（L2 metadata拡張） | 新規 | Must |
| H03-03 | @storyメタデータ + 逆引きチェーン全体検証（実装→Unit→設計→US→計画） | 新規 | Must |

#### H-04: phasegate.config.json v2（3 US）
| US | タイトル | 旧US | 優先度 |
|----|---------|------|--------|
| H04-01 | phasegate.config.json v2スキーマ定義（layers/quickMode/phaseDependencies/planningMode/paths/reporting/harnesses） | US-029改修 | Must |
| H04-02 | Preset System定義と切替（minimal: L1+L2 / standard: L1-L3+90% / strict: L1-L4+95%+bundleSize） | 新規 | Must |
| H04-03 | GSD由来品質機能のデフォルト無効化 + harness:enable/disable機能切替 | US-029一部 | Must |

#### H-05: ADR基盤（3 US）
| US | タイトル | 旧US | 優先度 |
|----|---------|------|--------|
| H05-01 | ADRテンプレート整備 + archgateパターン定義 | US-020改修 | Must |
| H05-02 | 初期ADR作成（§12 Key Decisions全件カバー: パッケージ分離/Biome選定/K全保持/FUSE外出し/fix_example必須/Quick Mode厳格定義/設定分離/Nyquist統合/成果物駆動/スタック検出/L0定義） | US-021改修 | Must |
| H05-03 | ADRステータス管理（Proposed/Accepted/Deprecated/Superseded）+ フロントマターバリデーション | US-022 | Must |

#### H-06: HarnessError体系（3 US）
| US | タイトル | 旧US | 優先度 |
|----|---------|------|--------|
| H06-01 | HarnessError統一フォーマット（code/severity/message/suggestion/adr_ref/fix_example）+ 全バリデータへの適用 | US-034 | Must |
| H06-02 | fix_example品質保証（fix_exampleをテスト資産としてCI検証 — 不正修正例の自動検出） | 新規（codex提案） | Must |
| H06-03 | severity権限契約（severity: errorのオーケストレーターによる格下げ防止を検証） | 新規（codex提案） | Must |

#### H-07: Nyquist検証層（4 US）
| US | タイトル | 旧US | 優先度 |
|----|---------|------|--------|
| H07-01 | requirement-test-matrix.json新設（JSONスキーマ + US/AC/テストケースマッピング） | US-005 | Must |
| H07-02 | phase-gate ACマッピング完了チェック追加 | US-006 | Must |
| H07-03 | test-coverage-checkerでの要件カバレッジ（AC網羅率）算出 | US-007 | Must |
| H07-04 | harness:impact-analysis US-XXXコマンド（影響テストケース特定） | US-008 | Should |

#### H-08: L2-L4バリデータ体系（5 US）
| US | タイトル | 旧US | 優先度 |
|----|---------|------|--------|
| H08-01 | L2 test-qualityバリデータ（AAA/actual命名/single-act/no-domain-mock/E2E seed/describe-it規約） | v0維持+明示化 | Must |
| H08-02 | L3 security+performanceバリデータ（ハードコード秘密/SQLインジェクション/ループ内await/N+1/bundleSizeLimit） | v0維持+明示化 | Must |
| H08-03 | L3 coverageバリデータ（standard: 90% / strict: 95%閾値検証） | 新規（明示化） | Must |
| H08-04 | L4 drift-detectバリデータ（設計⇔コード双方向乖離検出） | 新規（明示化） | Must |
| H08-05 | L4 consistency-check + dead-codeバリデータ | 新規（明示化） | Must |

#### H-09: Harness API（4 US）
| US | タイトル | 旧US | 優先度 |
|----|---------|------|--------|
| H09-01 | harness:check-ready / harness:check-phase（Phase Gate通過状態+現在フェーズ返却） | 新規 | Must |
| H09-02 | harness:ci-check（全L3バリデータ統合実行結果返却） | US-019一部 | Must |
| H09-03 | harness:detect-drift（設計-実装乖離レポート返却） | 新規 | Must |
| H09-04 | harness:status（成果物駆動状態導出 + ハーネス全体健全性サマリ返却） | 新規（codex提案） | Must |

#### H-10: Quick Mode（4 US）
| US | タイトル | 旧US | 優先度 |
|----|---------|------|--------|
| H10-01 | Quick Mode設定（phasegate.config.json quickModeセクション: allowedCategories/maintainedLayers/relaxedGates） | US-010 | Must |
| H10-02 | Quick Mode判定エンジン（対象/対象外自動分類 + 混在変更拒否 + 新ドメイン/API変更自動拒否） | 新規（codex提案） | Must |
| H10-03 | Quick Modeバリデータ緩和実行（L1全維持 + L2選択 + L3 securityのみ + L4スキップ） | US-011 | Must |
| H10-04 | quick-implementor（Quick Mode下のad-hoc実装スキル定義） | 新規 | Should |

#### H-11: エージェント統合オプション（4 US）
| US | タイトル | 旧US | 優先度 |
|----|---------|------|--------|
| H11-01 | コア品質能力のCLI/FSフォールバック定義（Hook無しでもL1-L4全機能動作の保証） | 新規 | Must |
| H11-02 | Claude Code PreToolUse Hook Adapter（リンター設定保護: biome.json/tsconfig.json/package.json） | US-016 | Must |
| H11-03 | Claude Code PostToolUse Hook Adapter（Biomeベース高速フォーマット+リント） | US-037 | Must |
| H11-04 | Claude Code Stop Hook Adapter（テストゲート + harness:ci-check + 無限ループ防止stop_hook_activeフラグ） | US-017+018+019統合 | Must |

#### H-12: スキル品質強化（6 US）
| US | タイトル | 旧US | 優先度 |
|----|---------|------|--------|
| H12-01 | story-implementor Atomic Git Commits + TDD品質契約（Green→commit, Refactor→commit） | US-045分割 | Must |
| H12-02 | test-coverage-checker Nyquist Validation統合（要件→テスト双方向トレーサビリティ + matrix.json生成） | US-046 | Must |
| H12-03 | implementation-readiness-checker Plan-Checker Loop統合（最大3回検証→修正 + Nyquist coverageRate閾値） | US-047 | Must |
| H12-04 | Agent-Lesson System（[Agent-Lesson]収集→AGENTS.md更新） | 新規（K9） | Must |
| H12-05 | Cascade Updater拡張（Level 3完了後の累積更新 + @US-XXXアノテーション自動付与） | 新規（K8） | Must |
| H12-06 | スキルSKILL.md構造維持検証（v0既存スキル+v1新規スキルのSKILL.md構造チェック） | 新規（codex 2nd提案） | Must |

#### H-13: Scheduled Governance & CI/CDテンプレート（3 US）
| US | タイトル | 旧US | 優先度 |
|----|---------|------|--------|
| H13-01 | CI/CDテンプレート（aidlc-gate.yml PR検証 + consistency-check.yml 週次 + .husky/pre-commit） | 新規 | Must |
| H13-02 | 反復エラー自動エスカレーション（同一HarnessError反復検出→自動エスカレーション） | 新規（codex提案） | Should |
| H13-03 | AGENTS.mdポインタ型移行（記述的→コマンド実行方式 + ADR参照リンク追加） | US-035 | Should |

#### H-14: K1-K15回帰保証（3 US）
| US | タイトル | 旧US | 優先度 |
|----|---------|------|--------|
| H14-01 | K1-K13回帰テスト整備（4層防御/Phase Gate/Biome AST/@unit@layer/テスト品質/DDD設計スキル/2Phase/DocSplit/Cascade/AgentLesson/Security+Perf/Drift/Consistency/Config） | US-031~033統合 | Must |
| H14-02 | K14-K15回帰テスト（Phase Dependency Model + Plan文書必須生成） + エージェント非依存ガード（coreが特定エージェントAPIをimportしていないことを検証） | 新規 | Must |
| H14-03 | Go/No-Go Gate品質側3条件回帰テスト（#4 yolo/skip-permissions不採用 + #5 2Phase維持 + #8 デフォルトOFF） | US-055改修 | Must |

#### H-15: v0テスト資産移行（2 US）
| US | タイトル | 旧US | 優先度 |
|----|---------|------|--------|
| H15-01 | v0 143テスト仕様のv1再実装（移行対象分析 + Biome対応修正 + 対応表作成） | US-048 | Must |
| H15-02 | v1再実装テストのCIゲート化（全件グリーン必須 + 90%カバレッジ適用） | US-049 | Must |

#### H-F1: FUSE Hooks Engine（Phase 2 backlog — 5 US）
| US | タイトル | 旧US |
|----|---------|------|
| HF1-01 | .harness-hooks.yml宣言的フック定義 | US-040 |
| HF1-02 | FUSEパススルー+PreWrite/PostWrite | US-041 |
| HF1-03 | PreRead Hook機密ファイルブロック | US-042 |
| HF1-04 | シェルラッパーPreBash/PostBash | US-043 |
| HF1-05 | 完了ゲートMagic File+CLI | US-044 |

#### H-F2: Phase 2拡張（Phase 2 backlog — 3 US）
| US | タイトル | 根拠 |
|----|---------|------|
| HF2-01 | doc-freshness-checker（L4拡張） | §10.2 Phase 2 |
| HF2-02 | pointer-validator（L4拡張） | §10.2 Phase 2 |
| HF2-03 | E2Eテスト戦略テンプレート（Playwright統合） | §10.2 Phase 3 |

### 5. US数サマリー

| Wave | Epic | US数 | Must | Should |
|------|------|------|------|--------|
| 1 | H-01 Biome | 3 | 3 | 0 |
| 1 | H-02 Phase Dependency | 3 | 2 | 1 |
| 1 | H-03 Traceability | 3 | 3 | 0 |
| 1 | H-04 Config v2 | 3 | 3 | 0 |
| 1 | H-05 ADR | 3 | 3 | 0 |
| 1 | H-06 HarnessError | 3 | 3 | 0 |
| **Wave 1小計** | | **18** | **17** | **1** |
| 2 | H-07 Nyquist | 4 | 3 | 1 |
| 2 | H-08 L2-L4 | 5 | 5 | 0 |
| 2 | H-09 Harness API | 4 | 4 | 0 |
| 2 | H-10 Quick Mode | 4 | 3 | 1 |
| 2 | H-11 エージェント統合 | 4 | 4 | 0 |
| **Wave 2小計** | | **21** | **19** | **2** |
| 3 | H-12 スキル品質 | 6 | 6 | 0 |
| 3 | H-13 Scheduled Gov | 3 | 1 | 2 |
| 3 | H-14 K回帰 | 3 | 3 | 0 |
| 3 | H-15 v0移行 | 2 | 2 | 0 |
| **Wave 3小計** | | **14** | **12** | **2** |
| Future | H-F1 FUSE | 5 | — | — |
| Future | H-F2 Phase 2拡張 | 3 | — | — |
| **v1合計** | | **53** | **48** | **5** |
| **全体（Future含む）** | | **61** | — | — |

### 6. harness_product_overview.md セクション別カバレッジ確認

| セクション | カバーするUS |
|-----------|-------------|
| §1 プロダクト定義 | 全体の方向性（US化不要） |
| §2 ポジショニング | H14-02（エージェント非依存ガード） |
| §3 v0からの進化 | H-15（v0テスト移行）、H-01（Biome移行） |
| §4 設計哲学 | H-02（Phase Gate）、H-06（Error as Teacher）、H-04（Progressive Disclosure）、H-10（Gated Velocity） |
| §5.1 レイヤー構成 | H-01（L1）、H-08（L2-L4） |
| §5.2 HarnessError | H-06 全体 |
| §5.3 Traceability | H-03 全体 |
| §5.4 Quick Mode | H-10 全体 |
| §5.5 config | H-04 全体 |
| §5.6 Phase Dependency | H-02 全体 |
| §5.7 FUSE | H-F1（Future） |
| §6 バリデータ一覧 | H-01（L1）、H-03（L2 metadata）、H-08（L2-L4）、H-07（nyquist） |
| §7 スキルシステム | H-12（スキル品質強化）、H-12-06（SKILL.md構造維持） |
| §7.3 プリセット | H-04-02 |
| §7.4 CI/CDテンプレート | H-13-01 |
| §8 非交渉要件K1-K15 | H-14 全体 |
| §9 オーケストレータ連携 | H-09（Harness API）、H-06-03（severity権限契約） |
| §10 スコープ | 全Wave構成 |
| §10.2 将来フェーズ | H-F2 |
| §11 リスク | H-06-02（fix_example品質）、H-10-02（Quick Mode圧力防止）、H-14-02（非依存性形骸化防止）、H-12-06（学習曲線軽減） |
| §12 Key Decisions | H-05-02（初期ADR） |

---

## 承認依頼事項

以下について人間の承認を求めます:

1. **仕分け**: Orchestration移管21件は妥当か？
2. **Epic構成**: H-01〜H-15 + H-F1/F2 の17 Epicで進めてよいか？
3. **Wave分割**: Wave 1(基盤18US) → Wave 2(コア品質+統合21US) → Wave 3(拡張14US) の順序は妥当か？
4. **Q1-Q9の設計判断**: 全て合意いただけるか？特に変更したい判断はあるか？
5. **codex提案の全採用**: fix_example品質保証、severity権限契約、Quick Mode判定エンジン、エージェント非依存ガード、反復エラー自動エスカレーション、SKILL.md構造維持、coverage独立US、L4分割、H-11 Wave 2前倒し — 全て採用でよいか？
6. **v1合計53 US**: この規模感は妥当か？

## 承認
- [ ] 人間承認済み
