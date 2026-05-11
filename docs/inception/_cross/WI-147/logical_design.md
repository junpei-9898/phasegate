---
traceability:
  initial_creation: true
work_item: WI-147
---

# WI-147 logical design: manifest-driven uninstall

@work-item-id WI-147

`phasegate uninstall` は installation unit の application use case として実装する。presentation は `--dry-run` / `--apply` / `--force` / `--json` の解釈と出力整形だけを担当し、reverse-op の判定と副作用は `RunUninstallUseCase` に委譲する。

## Flow

1. `.phasegate/manifest.json` を読む。存在しない場合は `missing-manifest` の plan を返し、apply しても自動削除しない。
2. manifest entry ごとに現在のファイル状態と manifest hash を比較する。
3. `created` は hash 一致なら削除、hash mismatch は `ai-assisted` として force なしで refuse する。
4. `symlink` は `../skills` の phasegate symlink だけを削除し、非 symlink / target mismatch は `manual` として skip する。
5. `merged` は target path から reverse strategy を選び、JSON / shell / package.json の managed portion だけを除去する。
6. apply 成功時は空ディレクトリを cascade cleanup し、最後に manifest を `.phasegate/uninstalled-{timestamp}.json` に rename する。

## Reverse strategies

- JSON: 現行 template に含まれる hook entry を structural equality で差し引き、`permissions.deny` は template 由来の値だけを除去する。
- Shell: `# === phasegate managed (BEGIN) ===` から `# === phasegate managed (END) ===` の block だけを削除する。block が無い場合は手動削除済みとして skip する。
- package.json: `devDependencies.phasegate` と `scripts.phasegate:*` だけを削除する。他の scripts / dependencies は保持する。
- created / yaml-add: manifest hash と現在 hash が一致する場合だけファイルを削除する。

## RepairMode

- `mechanical`: hash 一致 created、phasegate symlink、parse 可能 JSON、managed block を持つ shell、package.json。
- `ai-assisted`: created hash mismatch、merged hash mismatch だが reverse は可能。force なし apply では refuse する。
- `manual`: manifest なし、JSON parse 不可、symlink target mismatch、未知 strategy。
