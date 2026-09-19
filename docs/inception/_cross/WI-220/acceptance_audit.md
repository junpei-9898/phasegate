# 受け入れ条件監査

<!-- @work-item-id WI-220 -->

## 判定方法

description.md の AC と test_plan.md の T01–T25 を変更せずに照合する。部分的な成功を条件全体の完了へ拡張しない。実行記録・候補archiveの識別子は [検証報告](validation_report.md)、性能の生データと比較条件は [性能報告](performance_report.md)、独立agentの成否は [比較報告](agent_comparison_report.md) を参照する。以下は B5a（2026-09-19）の実施分最終監査。予定した全8課題のagent比較を含む実行・レビューは終了したが、既知未達があるため **WI 全体は未完了・公開不可**。未実施と既知不合格を区別する。

## 完了判定を止めている3点

1. 相対性能は合格だが、上位の絶対500ms/format-only fast-path要求は未達。
2. T20のsnapshot助言は実装済みだが、意味的影響の全判定基準は未達。
3. T24全8課題を実施したが、読取で旧4/4に対し候補3/4となり新規未達0を満たさない。共有旧1の監査未完了や旧復旧2件失敗も隠さない。

[D09](decision_log.md) に、追加設計を同WIで続けるか、未達を明示して完成範囲を分離するかの判断点を記載。ユーザーへ選択を提示済みだが未承認であり、別WIへの移管・上位要求緩和・公開は実行していない。通常回帰や復旧改善の成功を、この判断の代わりにしない。

| AC | 対応試験 | 現在の証拠 | 完了に必要な残件 |
|---|---|---|---|
| 01 旧allow維持 | T01–T03 | B5aで0.340.0/0.335.0更新各4件成功。旧新設定キー、TDD既定profile、正規設定変更・rollbackを比較。0.335.0既存保護差はD08で承認済み、破損設定のデータ消失防止はD06で別記 | 配布配置・root/local・agent更新を照合済み。全入力無差分は主張しない |
| 02 保護と再開 | T04–T06,T18 | 信頼ルート拒否、session境界、World鮮度。明示依存enforceで不足設計→反映→同一操作再開を2経路確認。上位原案承認/却下＋代替案採用の旧新各2回成功 | 各実agent課題を照合済み。自発的エスカレーション検出率とは区別しT20未達を保持 |
| 03 復旧・反復停止 | T07–T08 | PlanChecker反復停止、子孫回収、破損・欠落・EACCES保全。config6境界、reconcile12境界で再開。実agent復旧は旧0/2に対しB5a2/2、同状態反復なし | 固定範囲で確認済み。試験対象外ファイル構成・OS・電源断は未検証 |
| 04 内部削減・公開契約 | T09–T11 | PlanChecker旧constructor/custom executor維持、Stop旧ports維持。TDD新規coverage拒否を修正、再開確認。World ON/OFF×configured有無の4実CLI比較でcustom rootの拒否/修復/再開を確認 | 公開入口は保持。外部deep import利用の不存在や全呼出形式は証明せず削除しない |
| 05 ON/OFF・読取 | T02,T12–T13 | 旧値3×新値4×pre/postの24条件。Read/OFF lint要求0・ログ0、全体解析後の対象報告。旧0.340/0.335各4条件のroot/local実配布hook比較で有効値と設定原文保持 | 固定した条件は確認済み。任意の全外部設定形式へ一般化しない |
| 06 無関係WIと共有依存 | T14–T15 | 明示強制化、fix反映先候補、unknown旧範囲fallbackを接続。標準ゲートの拒否後修復・再開2経路を確認。共有契約変更の候補2試行が両Unit反映・既存consumer互換を達成、旧1試行は監査未完了 | 固定した構造検査と明示採用後の伝播を確認済み。意味影響の自発検出とは区別 |
| 07 意味と追跡 | T16–T19 | タグと意味を区別、World再評価とskill手順を整備。上位判断後・新機能・共有変更の成果物本文をレビュー。product29文書metadata成功、旧Post/Stop/TDD記述の整合を更新 | 500ms要求の未達を維持。fixture外文書の完全整合や自動意味承認は主張しない |
| 08 変更の意味分類 | T20 | 8ケースcorpusと任意snapshot助言を追加。module宣言差分/本文レビュー/不明を区別、既存gate不変をCLIで確認 | 内部adapter等の意味判定と広いcorpus評価。現revision・公開境界・上位承認はsnapshotだけでは証明できない |
| 09 利用者ファイル保全 | T01,T03,T08,T22 | B5a実tarballで更新・手編集競合・明示解決・再配置・rollback成功。Node18/22/24各release16成功。実agent更新/復旧と別clone後続編集4件で原文保持・不要追認なし | 固定範囲で確認済み。macOS以外とNode18最小minor等は未検証、全対応環境成功としない |
| 10 品質・性能・負荷 | T21,T23–T24 | B5a最終全体5,595成功・失敗0・23skip、forks20成功。追加opt-in設定4条件は旧2版と別実行成功。性能30回×2run全相対基準成功。全8課題実施・証跡保存済み | 読取候補1誤認を成功例で相殺しない。絶対500ms目標は未達。D09判断待ち |
| 11 外部ガード競合 | T25 | 実global hook/外部plugin/PJ hookを読取照合。外部guard直接はbootstrap不足exit2、PJ除外済global adapterは0、Phasegate文書pre0・設定保護pre2。文書保存と準備の再開確認済み | この環境の代表経路は確認済み。他plugin/OSへ一般化せず、外部設定自動変更は行わない |

## T01–T25の照合

「確認済み」は記載fixtureでの期待結果であり、未知入力・全OSの保証ではない。全体回帰に含まれる試験と、archive指定の別実行を区別する。実行件数・失敗からの修正経緯は検証報告を正とする。

| 試験 | 実施した証拠・範囲 | 現在の扱い |
|---|---|---|
| T01 | package-upgrade-compatibilityの旧0.340/0.335→B5a比較、通常操作・TDD legacy | 固定操作で確認済み。旧0.335の既存保護差はD08 |
| T02 | hook-enabled-compatibility 24条件、root/localの実配布hook4条件×旧2版 | 確認済み。設定自動移行なし |
| T03 | 実npm install、非force再配置、手編集競合、rollback、root/local優先順位 | 固定配置・設定で確認済み |
| T04 | 既存PreToolUse・session・config保護の回帰、正規config:plan経路 | 既存保護を維持。全未知toolの許否保証ではない |
| T05 | session期限/Unit/WI、対象・共有依存enforce、unknown fallback | 構造的条件を確認。意味的変更の自動認識はT20の未達と分離 |
| T06 | 標準ゲートで既存product/不足productの拒否→inception修正→反映→再開 | 2経路確認済み。設計修正の循環ブロックを解消 |
| T07 | config-plan-recovery-safety、hook欠落/不正JSON/I/O、child-process-lifecycle | 操作ごとの拒否/feedbackを保持し復旧確認 |
| T08 | config6中断点、reconcile12中断点、配布rollback、実agent旧新各2 | 固定境界で確認済み。候補復旧2/2、旧不整合を隠さない |
| T09 | plan-checker-handler/run-plan-checker-loop、既定停止とcustom executor互換 | 確認済み。チェック率を意味承認にしない |
| T10 | tdd-commit-traceability、実Git hook拒否、Work-Item trailer、legacy/configured | 確認済み。passedは申告、実テスト実行と区別 |
| T11 | L1/L2 adapter、L3・coverage・World custom rootの拒否/修復/再開 | 明示configuredだけ設定統合。legacyの新規拒否を撤回 |
| T12 | Read/OFF、skip recorder、未知shell/mixed write、不正入力 | lint/正常skipログ0と必要診断を確認 |
| T13 | 全体グラフfixture、reportTargets、複数対象、未知入力fallback | 検査範囲を狭めず報告を限定。format-only fast-pathとは別 |
| T14 | work-item-reflection-scope-resolver、resolved-work-item-reflection | 宣言対象と無関係WIを分離、対象不足を検出 |
| T15 | transitive/cross/unknown/偽装、session-reflection-advisory、実共有契約変更 | 固定範囲で確認。共有比較は候補2/2・旧1/2完了、旧未完了を保持 |
| T16 | cascade-tag-lifecycle、legacy reflection、cascade DTO/handler | 参照と意味的承認を分離 |
| T17 | world-mutation-fixtures、pin/review更新、OFF/例外の既存回帰 | fixture範囲で鮮度評価を確認 |
| T18 | 上位原案承認と却下/代替案採用の旧新4試行 | 判断前未変更、判断後6成果物反映と再開を確認。自発検出率は未計測 |
| T19 | product29文書metadata、旧Post/Stop/TDD記述整理、WI判断/検証導線 | 本文レビュー済み。上位500ms要求の未達を隠さない |
| T20 | semantic-risk corpus8例、snapshot助言、class宣言/本文分離 | 部分実装。意味分類の全基準は未達、D09判断待ち |
| T21 | B5a同一archiveのwarm/cold各30回×2run、720標本 | 相対基準成功。絶対500ms・他OSは別の未達/未検証 |
| T22 | B5a release16×Node18.20.8/22.23.2/24、旧2版upgrade各4 | macOSで確認。他OS/最小Node minorは未検証 |
| T23 | 通常5,595成功/23skip、forks20、型/lint/integrity/readiness | 成功。opt-in別実行と歴史的probe skipを明示 |
| T24 | 読取8、残る7課題各4、合計36試行（予備/中止は別） | 実施・レビュー終了。読取候補1誤認により全体未達。旧共有1未完了・旧復旧2不成功を保持 |
| T25 | 当環境のglobal guard/plugin/PJ hookの発生元と除外状態を照合 | 文書保存→準備再開を確認。他環境への外挿なし |

## 次の実装判断

1. B5a最終全体suiteは5,595成功・失敗0・23skip（577.08秒）、forks20成功。配布・更新・性能2runも同archiveで成功。後続opt-in設定試験の別実行と区別する。
2. AC-06 は Unit 全WIの単純除外では解決しない。対象WIの出所、共有依存の正本、不明時の旧動作を定義し、不要停止削減と必要停止維持を同時に試験する。
3. AC-08 は既存の強制gateを直ちに置換せず、計画どおり助言比較から実装する。意味が不明な入力を機械的に安全と認定しない。
4. T21はB5aでも相対基準を達成。検査を欠落させず、旧版timeoutと候補の診断完了を分けて記録する。上位の500ms目標や未実装fast-path要求を勝手に変更しない。
5. D08で互換対象0.335.0、既存session許可維持と明示強制化、隔離agent比較、事前コンパイル方式の検証が承認された。公開・push・利用者設定の自動移行は引き続き未承認。

各行の残件を満たした証拠が揃うまでは、ACの達成、WI完了、リリース可能を宣言しない。
