---
id: WI-316
type: fix
severity: medium
status: drafted
affects: [installation]
source: github#36
---

# WI-316: install の --with-husky / --with-ci が dead flag で Husky/CI が常時書き込まれる

<!-- @work-item-id WI-316 -->

## 背景

`phasegate install` の `--with-husky` / `--with-ci` フラグは `KNOWN_INSTALL_FLAGS` でパースは通るが、一度も読まれていない dead flag だった。実際の配線は `includeHusky: !personal` / `includeCi: !personal` であり、`--personal` なしの install では常に `.husky/*` と `.github/workflows/phasegate-aidlc-gate.yml` が書き込まれていた。ヘルプ文言（`Include Husky hook targets` / `Include GitHub Actions target`）は opt-in を示唆しており、`init` / `setup:agent` は `hasFlag` による正しい opt-in 実装であるため、install だけが乖離していた。

## 修正

- `scripts/harness/main.ts` の install case を `init` / `setup:agent` と同じ opt-in 配線に変更:
  - `includeHusky: !personal && hasFlag(args, "--with-husky")`
  - `includeCi: !personal && hasFlag(args, "--with-ci")`
- install のヘルプ文言に opt-in（default では書き込まない）である旨を明記
- `docs/guide/installation.md` に install の Husky / CI ターゲットが `--with-husky` / `--with-ci` の opt-in である旨を追記
- `run-install.ts` の usecase 側 default（`input.includeHusky ?? true`）は変更しない（プログラマティック呼び出しの契約維持。CLI は常に明示値を渡すため CLI 挙動は opt-in になる）
- CLI 統合テスト `scripts/harness/__tests__/integration/installation/install-flag-wiring.integration.test.ts` を追加（フラグなし `install --apply` で `.husky/` / `.github/workflows/` が作成されないこと、両フラグ指定で作成されることを spawn で検証）
