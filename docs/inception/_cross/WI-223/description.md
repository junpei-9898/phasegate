---
id: WI-223
type: refactor
severity: normal
status: tested
affects: [installation, harness-api, skill-quality]
depends_on: []
source: internal
---

# WI-223 配布スキルの責務分離とカタログ簡素化

<!-- @work-item-id WI-223 -->
2026-09-20。ユーザーの改善実施依頼とKISS/YAGNIを起点とする。既存利用者に突然の削除・新規blockを起こさない。

## 今回実装する範囲

- 配布カタログを既存installationモジュールの一箇所へ集約し、setupの公開入口は互換wrapperで保持する。
- `core`（7件）/`all`（29件）と省略時`all`を維持し、明示的な`consumer`（27件）を追加。Phasegate本体用`release-publisher`/`skill-creator`だけ除く。
- install/initで選択したセットをreconcile/doctorでも認識する。記録の欠落/不明は旧`all`にfallback。既存ファイルをセット変更だけで自動削除しない。
- 本体用スキルのトリガーを本体作業に限定し、重複したカタログ更新指示を修正する。
- 全スキルの全面書換え、技術別plugin/設定基盤、能力帯別の動的レンダラーは作らない。TS固有本文の全面的な言語非依存化とskill-doctorの正式個別診断は残件として明示する。

## 受け入れ条件

1. 旧core/allの名前・順序と既定値を保持し、consumerは本体用2件のみ除く。
2. project/personalのconsumer配置→reconcile→doctorで除外スキルが復活せず、ユーザースキルが残る。
3. core/allの再配置、記録欠落時の互換fallback、unknown引数拒否を確認する。
4. カタログ、CLI引数、文書を一致させ、既存gateと依存検査を変更しない。
5. テスト・型・必要な検査と制限を記録する。公開・push・このPJ自身へのinstallはしない。

## 採番

inception全体のdirectory/idと参照を走査。WI-009/222は過去の参照が残るため再利用せず、未使用WI-223を採用。WI-220/221の変更と未達を混ぜない。
