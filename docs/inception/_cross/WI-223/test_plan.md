# 検証計画

<!-- @work-item-id WI-223 -->
- T01 カタログ: 旧7/29件の順序、consumerとの差分2件、setup/installation一致、返却配列の変更が正本を壊さない。
- T02 セット読取: core/consumer/all、空白差、欠落、不正JSON、未知値。doctorでconsumerが欠損と診断されない。
- T03 実filesystem: project/personalのconsumer install→reconcileで27件・記録維持、ユーザースキル保全、preview非変更。
- T04 互換: core/allの配置・reconcile、既定all、旧設定、既存の手編集競合・中断回復試験。
- T05 実CLI: consumerを受理し、未知セットを拒否。init/install双方のhelpと配線。
- T06 スキル: 実corpus構造、参照整合。本体用スキルのトリガー範囲は本文レビュー。モデルの効果は未測定。
- T07 型/lint/metadata/readiness、関連Unit/IT/E2E。結果と未実施をvalidation_report.mdに保存。
