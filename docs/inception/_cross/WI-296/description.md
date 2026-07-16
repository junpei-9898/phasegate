---
id: WI-296
type: story
severity: high
status: drafted
affects: [world-model, harness-api]
source: internal
---

# WI-296: `world:pin` / `world:derive` CLI integration

<!-- @work-item-id WI-296 -->

## 背景

WM-11でread-only `world:inspect`、WM-12〜14でconstraint evaluationとobligation derivationが完成した。WM-15ではADR-037の残るtop-level commandをCLIへ統合し、review対象control mutationとgenerated report writeを別flagで公開する。

## CLI surface

- `world:pin --constraint <pgw:v1:constraint:...> --endpoint claimant|premise [--apply]`
- `world:derive [--write] [--out <project-relative-path>]`
- 共通: `--format human|json`、`--json`

`world:pin`は既存ConstraintRecordの指定endpointをcurrent Snapshotの一意candidateへ解決する。defaultはcandidate / digest diffだけを返し、`--apply`時だけconstraints documentをatomic replaceする。

`world:derive`はSnapshot、constraints、policy declarationsからWCR evaluationとobligation reportを組み立てる。defaultはpure、`--write`時だけraw reportを保存する。

## 受け入れ基準

- pin previewは全fileを不変にし、applyもconstraints以外を変更しない。
- missing / duplicate / ambiguous alias / malformed declarationはexit 1でwriteしない。
- unknown schema / config / I/O / hashing failureはexit 2。
- deriveはnew / invalid structural obligationまたはrepaid cleanupでexit 1、adopted / waived / declared debtだけならexit 0。
- `--out`単独、unknown flag、format conflictはexit 2。
- JSONはsingle `phasegate-world-cli/v1` envelope、primary resultはstdout、human usage / execution failureはstderr。
- `generatedAt`を出力せず、同じinputのderive JSONをbyte-identicalにする。
- main dispatch、root/subcommand help、known command catalog、conformance testを同じ着地で更新する。
- H17-10を`planned -> required`へ進め、AC-1〜5を同じ着地のtestへbindする。

## スコープ外

- World validator ID / registry / automatic gate integration
- config `world` schema追加（WM-18）
- baseline採用、waiver作成、Git add / commit
- nested command alias
