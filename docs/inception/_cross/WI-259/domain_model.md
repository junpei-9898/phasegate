# WI-259 Domain Model — injection-scan (L3-006)

<!-- @work-item-id WI-259 -->

## Value Objects

### InjectionFindingKind
検出種別の列挙（文字列 union）。
- `'instruction-override'` — 指示上書きフレーズ（英/日）。
- `'invisible-unicode'` — 不可視 Unicode（zero-width / bidi 制御）。
- `'base64-blob'` — 連続 200 文字以上の base64 塊。
- `'html-comment-instruction'` — HTML コメント内の指示上書きフレーズ（隠蔽意図の区別）。

### InjectionScanTarget
1 走査対象ファイルの入力モデル（infra が解決）。
- `path: string` — project-relative パス（報告用）。
- `content: string` — ファイル本文。

### InjectionFinding
1 件の検出。
- `kind: InjectionFindingKind`
- `sourcePath: string`
- `lineNumber: number`（1 起点）
- `message: string`
- `suggestion: string`
- `severity` は常に `'warning'`（error は構造上生成しない）。

### InjectionScanReport
走査判定レポート。
- `findings: readonly InjectionFinding[]`（**すべて warning**）
- `hasFindings(): boolean`

## Domain Service

### InjectionPatternScanService
`scan(targets: readonly InjectionScanTarget[]): InjectionScanReport`

不変ルール（advisory-only anti-injection）:
- **INV-A**: 生成する finding は **必ず severity='warning'**。error / violation は一切生成しない（ADR-030 §Decision.3.④ / §4.(b)）。
- **INV-B**: 1 行が複数種別に該当する場合、該当した各種別ごとに finding を生成する（例: HTML コメント内の指示上書きは `html-comment-instruction` として報告し、素の `instruction-override` は二重報告しない — コメント内は html-comment 種別に一本化する）。
- **INV-C**: どのパターンにも該当しない対象は finding を生成しない（無音 → pass）。

## 判定表

| 対象行の内容 | 検出種別 |
|---|---|
| `ignore previous instructions`（素の本文） | instruction-override |
| `<!-- ignore all previous rules -->` | html-comment-instruction（override は二重報告しない） |
| zero-width / bidi 制御文字を含む行 | invisible-unicode |
| 200 文字以上の連続 base64 | base64-blob |
| 「これまでの指示を無視」 | instruction-override |
| 通常の散文・コード | （finding なし） |

## Advisory 位置づけ

L3-006 は **default-ON・advisory-only（warning-only）**。usecase の override は finding があっても `severity=warning` の finding で `ValidationResult.fail` を構築するが、ADR-017 の集約規則（`failOnWarning=false` 既定）により overall gate は PASS のまま。L3-001（security, fail-closed）とは独立した advisory tier であり、二値合否には関与しない。
