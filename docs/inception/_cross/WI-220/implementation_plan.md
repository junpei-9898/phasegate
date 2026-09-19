# 実装・削減計画

<!-- @work-item-id WI-220 -->

## 判断方針

支配軸は既存利用者の停止リスクと復旧可能性。二次条件は保護の維持、設計整合、agentの品質・速度、保守する分岐の少なさ。全面撤去案は公開契約を壊すため不採用。全面的な新ゲート追加案も過去資産への遡及要求と運用複雑化のため不採用。内部は一本化し、互換変換は入口に限定する。

本計画は以前の調査結果を具体化したもの。以下は基準commitで確認した所見であり、候補版で再現してから変更する。「呼出箇所を見つけなかった」は外部利用不存在の証明ではない。

## 所見から変更への対応

| 対象・根拠（リポジトリ相対パス） | 所見 | 対応 |
|---|---|---|
| `scripts/harness/skill-quality/presentation/handlers/run-plan-checker-loop-handler.ts`、同Unit composition-root | ファイルパスを本文として評価。チェックボックス率で同じ内容を反復評価 | 内部の無意味な反復を撤去。公開export・配布呼出元を調査し、必要な入口のみ維持。チェック率を設計品質と呼ばない |
| `scripts/harness/agent-integration/infrastructure/adapters/harness-config-config-query-adapter.ts` | post hookの有効性がcascadeUpdate、pre hookがagentLessonCollectionに結合 | 実行責務と設定解決を分離。旧有効値を互換変換し、既定値を突然変えない |
| `scripts/harness/agent-integration/presentation/post-tool-use-hook.ts`、hook translator、harness-api lint adapter | 対象パスが空、読み取りでも起動し得る。`--fast`と500ms timeoutが実処理に整合しない | 読み取りを除外、対象伝播、処理契約に合うtimeout。解析範囲と報告範囲を分離 |
| `.phasegate/hook-skip-events.jsonl` | 正常なHOOK_DISABLED記録の大量蓄積 | 正常skipの連続記録を削減。異常理由と必要な監査証跡は保持。既存ログを勝手に削除しない |
| `scripts/harness/skill-quality/application/usecases/execute-tdd-cycle-usecase.ts`、同Unit L2 adapter | passed自己申告でcommitに進む。L2と称してL3も走り、共通設定と経路が分岐 | 公開CLIを維持し、設定解決・検証・通常git hook経路を統一。実測と自己申告を区別。Work-Item trailerを検証 |
| agent-integrationの同期translator、Stop周辺の未使用import/registry | 実経路は非同期側。同期側はテストやexportとの関係を要確認 | 呼出・export・配布調査後に内部死蔵を撤去。置換先のない公開入口を消さない |
| `scripts/harness/phase-dependency-model/domain/services/story-reflection-checker.ts` とfs adapter | タグ確認中心。WI列挙範囲が広い | 対象WIと共有依存に絞る。単なるタグ追加を意味的整合の証明にしない |
| `scripts/harness/quick-mode/domain/services/quick-mode-judgment-engine.ts` | ファイル名・場所・CREATE/MODIFYが変更リスクの代理になっている | 契約・不変条件への影響を優先。内部adapter追加だけで上位承認必須にしない |
| `scripts/harness/skill-quality/application/usecases/apply-cascade-update-usecase.ts`、`skills/cascade-updater/SKILL.md` | CLIはタグ追記中心。skillは固定承認段階と追記偏重 | 機械更新と意味レビューを分離。現行設計を統合更新し、前提変更だけ上位判断へ戻す |
| World Model、baseline/waiver、ADR-038/039/041 | 明示依存・pin・権限境界という有用な基盤がある | 再利用し、別の必須状態機械やskill名による認可を新設しない |
| 外部baseline-guardrails共通hook | 計画文書もbootstrap不在で拒否。plugin無効化とは別経路で起動 | Phasegate本体の不具合と区別し、外部hook共存・復旧を検証対象へ追加 |

## 実行順・成果物・終了条件

| 段階 | 作業と成果物 | 終了条件 |
|---|---|---|
| B0 基準固定 | 本WIに `compatibility_inventory.md` と `decision_log.md` を作成。公開CLI/export/設定/配布物/対応環境、旧版fixture、許可・拒否・復旧の期待値を固定 | 対象版・hash・設定・判断理由が再現可能。未確定な公開契約を列挙 |
| B1 内部削減 | PlanChecker無意味反復、実利用のない同期処理・import等を削減。必要な公開入口は薄い委譲にする | T09–T11、既存関連テストが通る。削除で失われる責務がない |
| B2 実行経路整理 | hookの設定結合・対象伝播・ログを整理。検証設定とcommit経路を統一 | T01–T13、T21。旧ON/OFF不変、必要なL3検証も失われない |
| R1 互換整理版 | B0–B2の配布物・移行案内・検証報告 | 対象回帰と配布検証が全合格。公開は別途承認 |
| B3 判定改善 | 対象WI/依存範囲、変更リスク判定を改善。曖昧な意味判定はまず助言として評価 | T14–T17, T20。不要ブロック減少と必要検出維持を両方確認 |
| B4 伝播改善 | cascade手順、設計更新、上位判断と再開の契約を整理 | T16–T19。承認・却下・代替案いずれも有限の次行動に到達 |
| B5 総合比較 | 全テスト、旧環境更新、実agent比較。`validation_report.md` を作成 | T01–T25。未検証を成功扱いせず、リリース可否を明示 |
| R2 改善版 | B3–B5の配布物と説明 | 想定外拒否・復旧不能・必要エスカレーション欠落が0件 |

R1/R2は順序を示す名称で、版番号や公開の許可ではない。各段階は独立に戻せる変更単位にし、整理と判定変更を混ぜない。

## 実装前の文書反映

この計画は未確定のため `*_plan.md` とする。コード／テスト変更に入る前に、対象段階の `logical_design.md`、必要なら `domain_model.md`、関係テスト設計を本WIに作成し、対応する既存 `docs/product/construction/{unit}/` 文書へ本文の変更と `@work-item-id WI-220` を反映する。タグだけ追記して完了にしない。

Unit境界や契約に影響する場合は `docs/product/units/integration_contract.md` と全体像も更新。制御原則を変更する場合はADRを先に作成し、既存ADRとの優先関係を明記する。ガイド、CLI help、配布skill/templateも同じ変更単位で追従させる。変更のないUnitに形式だけの全文書を量産しない。

## 責任と未確定事項

実装担当は再現テスト・移行手順・証跡を作成し、保守者が互換対象、意図的な判定差分、公開可否を承認する。利用者に内部実装知識を要求しない復旧手順を用意する。最古のサポート対象版、公開exportの外部利用、各runtimeでの実測はB0で確定する。確認不能な対象の削除は延期し、全体を無条件に旧経路と二重化しない。
