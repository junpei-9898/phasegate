---
id: WI-248
type: issue
severity: high
status: reflected
affects: [validator-system]
---

# WI-248: AdrFoundationReferenceAdapter が実在 ADR を発見できない phantom gate

> 起票日: 2026-07-10
> 経緯: WI-247 で ci-governance 側の ADR 参照経路を修正した際、validator-system 側の `AdrFoundationReferenceAdapter` が同種の rootDir 誤設定を抱えたまま残っていることが判明した。

## 背景 / 根本原因

`scripts/harness/validator-system/infrastructure/adapters/adr-foundation-reference-adapter.ts` は
`createAdrFoundationModule(process.cwd())` を呼び、生成された `adrRepository` に ADR 参照を委譲する。

しかし adr-foundation の repository 実装 `FileSystemAdrRepository` は、`listAdrFiles()` で
`readdir(this.rootDir)` を実行し `ADR_FILE_PATTERN`（`^[0-9]{3}-[a-z0-9-]+\.md$`）に一致する
ファイルのみを ADR として列挙する。つまり **rootDir は ADR ディレクトリ（`docs/ADR`）自体**を
指す必要がある。

project root（`process.cwd()`）を渡すと、root 直下には `NNN-*.md` 形式のファイルが存在しない
ため `readdir` の結果が空になり、`findById` が常に `null` を返す。結果として:

- `exists(adrRef)` が実在 ADR（例: `ADR-013`）に対しても常に `false` を返す
- `getMetadata(adrRef)` が実在 ADR に対しても常に `null` を返す

これは検査が「常に通過（実在 ADR を見つけられないので参照違反も検出しない）」する
phantom gate である。

正準の使い方は `scripts/harness/main.ts` の `list-adrs` / `validate-adr` ケース
（`createAdrFoundationModule(join(rootDir, "docs", "ADR"))`）を参照。

## 再現条件

1. リポジトリ root（`docs/ADR/013-story-reflection-gate.md` 等が実在）を cwd とする。
2. `new AdrFoundationReferenceAdapter().exists("ADR-013")` を呼ぶ。
3. 期待値 `true` に対し、実際は `false` が返る（バグ）。

## 受け入れ条件 (AC)

- **AC-1**: 実在 ADR（`docs/ADR` に存在する `ADR-013` 等）に対し `exists()` が `true` を返す。
- **AC-2**: 実在 ADR に対し `getMetadata()` が正しい `adrId` / `title` / `status` を返す。
- **AC-3**: 実在しない ADR 参照（`ADR-999`）に対し `exists()` は `false`、`getMetadata()` は `null` を返す（回帰なし）。
- **AC-4**: adapter は rootDir をコンストラクタで受け取り（既定 `process.cwd()`）、内部で
  `path.join(rootDir, 'docs', 'ADR')` を module に渡す。呼び出し元（validator-system
  composition-root）は `cwd` を渡す。

## 修正方針

WI-247 の adapter パターン / main.ts 正準に倣い、`AdrFoundationReferenceAdapter` を
`rootDir` 受け取り + `path.join(rootDir, 'docs', 'ADR')` 委譲に変更。composition-root の
生成箇所を `new AdrFoundationReferenceAdapter(cwd)` に追随させる。

## スコープ外

- adr-foundation repository / composition-root は無変更（設計どおり ADR ディレクトリを rootDir に取る）。
- ci-governance 側 adapter（WI-247 で別設計 = in-memory knownAdrIds を採用済み）は無変更。
