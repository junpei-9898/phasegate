# WI-259 Logical Design — injection-scan (L3-006)

<!-- @work-item-id WI-259 -->

## Overview

L3-006（injection-scan）は指示搭載ファイル群（`skills/**/SKILL.md` / `CLAUDE.md` / `AGENTS.md` / `docs/templates/agent-context/**` / `.claude/settings.json`）を cwd 起点で走査し、既知のインジェクションパターンを **warning-only** の finding として file:line + 種別で報告する。ADR-030 §Decision.3.④ の advisory スキャナ。error は一切生成しない（§4.(b) 残存リスク: パターン検査は回避可能ゆえ blocking にしない）。

## Layers

- **domain**
  - `InjectionScanTarget` / `InjectionFinding` / `InjectionScanReport`（value-object）と `InjectionFindingKind`（union）。
  - `InjectionPatternScanService`（domain service）: `scan(targets): InjectionScanReport`。全 finding は severity=warning（INV-A）。パターン照合は純粋関数で、外部 I/O を持たない（domain 層の副作用禁止に適合）。
- **application**
  - `InjectionScanPolicyPort.collect(): Promise<readonly InjectionScanTarget[]>`（domain port）。走査対象の解決（glob / readFile）は infra が担う（cwd 起点、targetPaths 非依存）。
  - `RunL3ValidatorsUseCase` に optional `injectionScanPolicyPort` を追加。L3-006 の override ブロックで `collect()` → `service.scan()` → finding あれば `ValidationResult.fail(L3-006, warning-severity findings)`、無ければ `pass`。finding は必ず severity=warning のため ADR-017 集約で overall PASS。default-OFF/skip 時は override しない（L3-004/L3-005 と同方式）。
- **infrastructure**
  - `FileSystemInjectionScanAdapter`: 対象ファイル群を cwd 起点で列挙して読み込み、`InjectionScanTarget[]` を返す。`skills/*/SKILL.md`（readdir）+ 固定パス（`CLAUDE.md` / `AGENTS.md` / `docs/templates/agent-context/*.md` / `.claude/settings.json`）。不在ファイルは skip。project-relative path で報告。
- **presentation**: 既存 `RunValidatorsHandler` は無変更（override は usecase 内）。composition-root で port を配線。

## Validator registration

- `ValidatorId` に `'L3-006': 'injection-scan'` を追加（VALIDATOR_NAME_MAP）。
- composition-root `buildDefaultRegistry`: `createDef("L3-006", "L3", "always", "InjectionScanPolicyPort")`。
- `DEFAULT_CONFIG.layers.L3.validators` に `"L3-006"` を追加（default-ON）。
- config-foundation `validator-system-config-mapper`: L3 の alias に `"injection-scan": "L3-006"` を追加し、`includeValidator(l3Validators, "L3-006")` で常時含める（config で明示列挙していても default-ON を保証）。L3 fallback list にも `"L3-006"` を追加。
- composition-root: `new FileSystemInjectionScanAdapter(process.cwd())` を `runL3ValidatorsUseCase` に配線。

## パターン設計（narrow・誤検知回避）

| kind | パターン |
|---|---|
| instruction-override | `/ignore\s+(all\s+\|any\s+)?(previous\|prior\|above)\s+(instructions\|rules)/i`・`/disregard\s+(your\|all)\s+(instructions\|training)/i` + 日本語定型（「これまでの指示を無視」「以前の指示を無視」「上記の指示を無視」「指示を(全て\|すべて)無視」「システムプロンプトを無視」） |
| html-comment-instruction | 上記フレーズが HTML コメント（`<!-- ... -->` 内、または `<!--` を含む行）にある場合。この場合 instruction-override は二重報告しない |
| invisible-unicode | `/[​-‍﻿‪-‮⁦-⁩]/` |
| base64-blob | `/[A-Za-z0-9+/]{200,}={0,2}/` |

現 corpus（SKILL.md ×30 / CLAUDE.md / AGENTS.md / agent-context テンプレート / .claude/settings.json = 32 ファイル）で誤検知 0 を実証済み。

## Anti-injection rationale

L3-006 は anti-laundering ではなく **注意喚起（advisory）** の tier。ADR-030 §Decision.4.(b) の通り「検出をすり抜けた＝安全」という誤信頼を避けるため blocking にしない。authoritative な遮断は原理的に不可能であり、最終判断は人間レビューに委ねる。
