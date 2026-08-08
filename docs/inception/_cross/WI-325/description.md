---
id: WI-325
type: fix
status: reflected
source: verification-followup
---

# WI-325: load 経路の JSON パース失敗が「persist 失敗」と誤報される

## 問題

`FileSystemConfigRepository.load()` の JSON パース失敗（`SyntaxError`）時に
`ConfigPersistenceError`（メッセージ: `Failed to persist config: ...`）が throw され、
「読み込み失敗なのに書き込み失敗」という誤解を招くメッセージが表示されていた。

- 該当箇所: `scripts/harness/config-foundation/infrastructure/repositories/file-system-config-repository.ts` の load 経路

## 修正

- `ConfigParseError extends ConfigPersistenceError` を新設
  - メッセージ: `Failed to parse config JSON: ${configPath}`
  - `name: 'ConfigParseError'`、cause 保持、`Object.setPrototypeOf` 対応
- load 経路の `SyntaxError` は `ConfigParseError` を throw
- save 経路は従来どおり `ConfigPersistenceError`（`Failed to persist config: ...`）

## 互換性

サブクラス化により、main.ts の `instanceof ConfigPersistenceError` fail-open 判定
（WI-314、"Warning: phasegate.config.json is not valid JSON: ..."）は無変更で動作する。
警告メッセージに含まれる error.message が parse 失敗を正しく表すようになる。

## テスト

- `scripts/harness/__tests__/integration/config-foundation/file-system-config-repository.test.ts`
  - IT-CF-039: load の JSON 破損 → ConfigParseError + parse メッセージ + cause = SyntaxError
  - IT-CF-059: ConfigParseError instanceof ConfigPersistenceError === true（fail-open 互換の固定）
  - IT-CF-042: save 失敗 → ConfigPersistenceError + persist メッセージ（ConfigParseError ではない）
