# 配布スキル簡素化の設計

<!-- @work-item-id WI-223 -->
正本は既存`installation/application/bundled-skill-selection.ts`。カテゴリとセット選択を公開し、setupは再export/委譲する。新しいregistry/クラス/設定ファイルを作らない。

consumerはallから本体開発者用2件を除く。29件をnpmから物理削除せず旧allを保持する。技術別スキルの大量分割は行わない。

reconcileは各skills rootの既存`.harness-version`からセットを解決し、一度解決した値を配備・manifest hashまで用いる。core/consumer/allを認識し欠落/不正/未知値は従来allへfallback。共有とpersonal rootを混同しない。agent文書のセット表記も対応rootの値を使う。既存の競合拒否・バックアップ・中断回復を維持する。

doctorも同じ解決関数を使う。セット変更は選択されたスキルの配備だけを行い、以前配備した非選択スキルや手編集を自動削除しない。新規consumerは27件になるが、allからの切替を削除移行と呼ばない。

skill-creator指針に従い、本体専用知識のトリガー境界を狭める。skill-doctorは対象/能力帯未回答のため正式診断・効果主張はしない。KISS/YAGNIは設定増殖を避ける設計判断として適用する。
