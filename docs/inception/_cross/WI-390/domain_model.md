# WI-390 Domain Model

<!-- @work-item-id WI-390 -->

## 1. Protected Trust Root Policy

`ProtectedFileList` は protected pattern を次の2集合として扱う。

- **TrustRootPattern**: agent が config 経由で除外できない防御基盤。
  - `phasegate.config.json`
  - `.phasegate-local/phasegate.config.json`
  - `.phasegate/baseline.json` と nested equivalent
  - `.husky/**` と nested equivalent
  - root の `CLAUDE.md` / `AGENTS.md` / `GEMINI.md`
- **ExcludablePattern**: `protectedFiles.exclude` で明示解除できる通常の protected file。
  - `biome.json` / `.biome.json` / `tsconfig.json` / `package.json` / `package-lock.json`
  - user-defined `protectedFiles.patterns`

### Invariants

- P-1: `exclude` は TrustRootPattern を削除できない。
- P-2: protected-file 判定は baseline / phase / Quick Mode / session より先に評価される。
- P-3: config 自身の状態や内容を authorization 根拠にせず、対象 path だけで direct mutation を block する。
- P-4: missing / invalid config でも hook と doctor は起動でき、無関係操作の fail-open は維持する。
- P-5: config recovery は phasegate managed command または agent hook 外の人間編集で行う。

## 2. Markdown Classification

`MarkdownDocument` は suffix が case-sensitive に `.md` または `.mdx` の changed file である。
組み込みカテゴリ判定では config / API contract / test の構造ルールの後、domain / CREATE fallback より前に
`docs` へ分類する。protected-file 判定はカテゴリ判定より上流にあるため instruction trust root は Quick Mode を通過しない。

## 3. Rejection Semantics

`RejectionRule` に `CATEGORY_NOT_ALLOWED` を追加する。

| Rule | 意味 |
|---|---|
| `CATEGORY_NOT_ALLOWED` | 判定対象が1カテゴリだけで、そのカテゴリが allowedCategories 外 |
| `MIXED_CHANGES` | 判定対象に2カテゴリ以上があり、少なくとも1カテゴリが allowedCategories 外 |
| `NEW_DOMAIN` | domain path の CREATE |
| `API_CONTRACT` | port / adapter contract change |

MIXED / CATEGORY_NOT_ALLOWED の分岐は file 数ではなく `categorizedFiles.size` で決める。同一不許可カテゴリの
複数ファイルは `CATEGORY_NOT_ALLOWED` である。

## 4. Husky Runtime State

`HuskyRuntimeState` は Git が実際に参照する hook runtime を表す immutable value object とする。

```text
active(hooksPath=.husky|.husky/_)
inactive(reason=unset|unsupported-path|shim-missing, observedPath?)
unavailable(reason)
```

- H-1: project install では active 以外を red finding にする。
- H-2: `.husky/_` は `h` と必要な shim entry が存在するときだけ active。
- H-3: `.husky` は v8 compatibility として許容する。
- H-4: personal install は `.git/hooks` を所有するため Husky runtime check を scope out する。
- H-5: git 実行失敗を healthy と偽装せず red finding として可視化する。

## 5. PostTool Analysis Contract

PostToolUse の TypeScript analysis は編集を契機に project の PhaseGate lint 契約を観測する。

- type error: project / target directory の tsconfig による `tsc --noEmit`
- PhaseGate structural lint: `phasegate lint --json --skip-eslint-removal-check`

単一ファイル `--target` は参照グラフを縮退させ `L1-007` を偽陽性にするため使用しない。
- formatting: project root の Biome config を使う `biome check --write`

unrelated file の lint failure と upstream Biome recommendation は対象編集の block reason に混ぜない。
