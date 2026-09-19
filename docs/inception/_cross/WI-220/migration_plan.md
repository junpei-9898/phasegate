# 互換性・移行・復旧計画

<!-- @work-item-id WI-220 -->

## 互換性対象

B0で旧版の配布物・hash・公開CLI/export・設定schema・生成済みhook/skillを固定する。基準v0.340.0に加え、保守者が明示したサポート範囲の最古版と設定形式の境界版を含める。すべての歴史的バージョンへの互換を未検証のまま約束しない。

本WIのR1/R2では既存公開CLIと旧設定の読み取りを維持する。廃止判断の見直し時点はR2公開判断時。削除は本WIでは実施せず、対象利用・告知期間・移行方法・復旧検証を揃えた別の明示的な破壊的変更判断を必要とする。期限到来だけで自動削除しない。

## 設定解決の期待値

| 旧post hook有効値 | 新独立キー | 期待値 |
|---|---|---|
| false | 不在 | false |
| true | 不在 | true |
| 旧キーも不在 | 不在 | 旧版の実測既定値を維持 |
| 任意 | 明示値 | 新キー対応版では明示値を優先。旧版へ戻す際は更新前設定を復元 |

候補版では `agentIntegration.preToolUse.enabled` / `agentIntegration.postToolUse.enabled` を任意の独立キーとして実装した。不在時は旧設定・旧既定値を維持する。旧schemaのreaderが残っている間は新キーを自動書込みしない。新パッケージ＋旧配置物、旧パッケージ＋新配置物の可否を明示し、非互換の組合せは導入前に説明する。

## 移行手順の要件

1. 現在の版・配置物・設定・個人上書き・利用者編集を検出し、dry-runで対象差分を提示する。
2. 対象ファイルだけ復元可能なバックアップとhashを保存する。秘密情報を報告へ複製しない。
3. 管理された設定更新／配置更新経路を使用し、ユーザー編集競合では上書きせず差分を示す。
4. 中断時の部分更新を識別し、再実行は冪等にする。旧値から新値への変換は一度だけ行う。
5. 配布物で代表操作・必要なエスカレーション・復旧を確認してから成功とする。

更新時に過去WIの設計追加、全pin作成、baseline全消去、個人設定全書換を要求しない。既存skipログも削除しない。

## エラーからの復旧

| 状態 | 必要な応答・復旧検証 |
|---|---|
| config missing / invalid-json / invalid-schema | 状態と操作ごとのADR-038契約を固定し、読取り・doctor等の診断と許可された復旧が動くことを確認。形式別の既存差異を整理作業のついでに変更しない |
| 信頼ルート変更が必要 | ADR-041の管理コマンドで可能な操作と、人間のhook外でのレビュー付き操作を区別。禁止操作をagentに再試行させない |
| 必須設計不足 | 足りない文書・反映先・対象WIを示す。修正する文書自体が同じ理由で拒否されないことを確認 |
| 上位判断待ち | 決定者・論点・停止範囲を提示。承認／却下／代替案後の再開条件を明示 |
| timeout / I/O障害 | 成功偽装をしない。子プロセスを回収し、状態と具体的な次行動を提示 |
| 更新中断 | バックアップと対象hashで復元し、旧パッケージ・設定・生成物の整合した組へ戻す。利用者の後続編集を上書きしない |
| 外部hook競合 | 発生元・読み込んだ設定・適用範囲を識別。Phasegateを無効にして解決したことにしない |

自動再試行は同一入力・同一状態では行わない。回復可能fixtureでは提示された最大3操作で正常状態へ戻ることを目標とする（人間の承認待ち時間は除外）。その範囲で直せないものは人間への明確な引継ぎを終点とし、無限再試行は不可。

### 配布物で確認したstrict設定からの文書編集再開

対象は有効な設定の `quickMode.allowedCategories: ["bugfix"]` により文書編集が拒否され、決定者がdocs/test/configも許可する方針を選んだ場合に限る。設定直接Writeや保護解除を使わず、以下を実行する。

1. `phasegate config:plan --intent quick-mode-relax --dry-run --json` で変更対象がallowedCategoriesだけであることを確認する。
2. 方針が合意済みなら `phasegate config:plan --intent quick-mode-relax --apply --json` で適用し、出力のbackupPathと変更結果を確認する。
3. 元の文書編集を再実行する。fixtureでは許可へ戻り、設定直接Writeは引き続き保護される。

実公開0.335.0からB4d候補へ更新した一時projectで、予告時の本文不変、管理コマンドのpre hook通過、旧設定backup、関係のない設定の維持、文書再開、再apply後の安定性を確認した。この復旧経路があることは0.335.0→候補の全allow不変を意味せず、D05の互換判断は残る。

これは無条件の推奨緩和ではない。strictを維持する方針、設計不足、上位契約変更、設定破損など別の原因には適用せず、その原因に対応する正規手順か人間への引継ぎを選ぶ。実利用者の設定を自動変更しない。

### 破損・未存在・読込不能の設定

B2k以降の候補では、破損・読込不能のconfig:plan previewはblockedと復旧理由を返す。未存在のpreviewは旧applicable／before=null／部分patchを維持し、commandsの先頭でinstall --dry-runを案内する。いずれもapplyはrefused／exit 1で元状態を保持する。従来の「空backupを作り不完全な設定で上書きしてexit 0」は復旧成功として維持しない。有効な設定への通常applyとschema-invalidの上流exit 2は変更しない。

未存在はinstall --dry-runで初期化内容を確認する。破損は元データを残し、権限ある人間が既存backup／バージョン管理から復元するかJSONを修復する。権限不足はファイルアクセス権を確認する。原因解消後にpreviewから再開し、直接Writeの反復やhookの無効化で突破しない。この意図した拒否差分は公開判断時にD06と合わせてレビューする。

## リリース停止と復旧

旧allow→新blockの未承認差分は0件、必要block→新allowの見逃しは0件。意図的な不要block解消は理由とテストを記録する。セキュリティ上の既知欠陥修正で新たな拒否が必要なら、本WIの互換整理に混ぜず別判断・事前案内・復旧検証を行う。

回帰があれば候補版の展開を止め、検証済みの旧版とバックアップの組へ戻す。全ガード解除や `--no-verify` は復旧手順に含めない。

## 今回の外部競合から得た確認事項

baseline-guardrails pluginのPJ単位無効化だけでは、ユーザー共通hooksから直接起動されるadapterは止まらなかった。adapterの `codex-is-ignored.sh` が読むPJ完全一致の除外リストにより、このPJだけ外部適用を外す経路を確認した。これはPhasegateの設定ではなく端末の外部連携設定。製品の移行処理がその共通設定を勝手に変更してはならない。

### T25 再確認（2026-09-19）

実端末のユーザー共通hook登録は `codex-pretooluse.sh` を直接起動し、PJ側 `.codex/hooks.json` は別に `phasegate hook pre-tool-use` を登録していることを読取確認した。実adapterと実plugin hookへ同じPJ cwdの診断payloadを渡し、以下を観測した。提案patch自体は適用しない診断であり、共通設定・除外設定・保護設定を変更していない。

| 経路 | exit | 観測 |
|---|---:|---|
| 外部pluginのcheck-harness-ready直接 | 2 | 外部固有 `.harness/project-config.json` 不在を報告 |
| 外部共通adapter（現在のPJ除外適用） | 0 | stdout/stderrとも空 |
| Phasegate pre（WI-220 inception文書） | 0 | category=docsの正規許可 |
| Phasegate pre（phasegate.config.json） | 2 | 保護拒否とconfig:planの正規復旧案内 |

同じ作業で計画/product文書を実際に保存しmetadata検証も成功した。外部plugin要求をPhasegateの設定不足と混同せず、Phasegate保護を残した復旧の当環境証拠である。異なる端末の外部plugin版やhook runner全般の保証ではない。確認対象は `/Users/jumpei/.codex/hooks.json` と `/Users/jumpei/.claude/plugins/marketplaces/atomica-internal/scripts/codex-pretooluse.sh`、同marketplaceの `plugins/baseline-guardrails/hooks/check-harness-ready.sh`。存在を確認せずこの端末固有パスを他の利用者へ処方しない。

## 開発者向けruntime archive生成

依存導入済みcheckoutで `npm run pack:runtime -- --pack-destination <既存の出力directory>` を実行する。通常 `npm pack` はTSのみの従来互換配布、`pack:runtime` はTSと事前生成JSを含む性能検証対象配布である。CI/canaryは後者を検査する。生成物はcheckout外の一時packageで作り、利用者設定・既存TS入口は変更しない。出力directory内の同名archiveがある場合は拒否するので、新しいdirectoryで実行する。生成後はその同一archiveで配布・更新/復旧・性能試験を行う。公開は別途承認が必要であり、このコマンドは公開しない。
