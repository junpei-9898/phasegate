# L3-005 AC-bound Coverage Ratchet — phasegate 自リポジトリの段階的準拠計画

> 対象: **phasegate の OWN リポジトリのみ**。製品デフォルト（standard/strict プリセット）は L3-005 を **一切含まない**（default-OFF, opt-in）。本ドキュメントは他ユーザーの設定を一切変更しない。
> 作成日: 2026-07-05（WI-227 / H16-03）

---

## 1. 背景 — L3-005 とは

L3-005（AC-bound coverage / `ac-bound-coverage`）は、**スコープ内 story** の各 Acceptance Criterion が **≥1 の `binding:"ac"` テスト参照**（絶対 `@ac HXX-YY-N` / 相対 `@ac AC-N`）を持つことを機械的に検査する **fail-closed** な L3 CI バリデータである。

L3-004（story-level の AC 網羅ゲート）との違い:

| | L3-004（nyquist） | L3-005（ac-bound-coverage） |
|--|-------------------|------------------------------|
| 粒度 | story-level（AC ごとに testReference が 1 件以上） | **per-AC binding**（各 AC が `binding:"ac"` ref を持つ） |
| スコープ | 全 story（StoryCatalog 登録済み） | `layers.L3.acBoundStories`（明示スコープのみ） |
| 既定 | プリセットで有効 | **default-OFF / opt-in** |
| fail 条件 | matrix 不在 / parse 不能 / 未網羅 AC | matrix 不在 / parse 不能 / **スコープ内に fileFallbackOnly な AC** |

判定ロジック（正しく、維持すべきもの）:

1. `phasegate:generate-matrix` 相当で matrix を生成（fail 時は fail-closed）
2. `acBoundStories` の各 storyId について、matrix 上の全 linked AC を走査
3. testReferences に `binding:"ac"` を 1 件も持たない AC（fileFallbackOnly）が 1 つでもあれば FAIL
4. `acBoundStories` 外の story は完全に無視

これは **fail-closed** である（L4-007 advisory の fail-open とは対照的。L3-005 は CI を落とす blocking tier）。

## 2. 初期スコープ（phasegate 自リポジトリ）

> 数値根拠: `phasegate:generate-matrix` で生成した `requirement-test-matrix.json` を元に測定（2026-07-05）。

初期スコープ `acBoundStories: ["HF2-05"]`。現在のスコープ（v0.176.0）は `["HF2-05", "H06-03", "H05-02"]` へ拡張済み（R2/R3 完了、下記 §4 参照）。

- **HF2-05**: 全 6 AC（AC-1〜AC-6）が genuinely ac-bound（各 AC が ≥1 の `binding:"ac"` ref を持つ、fileFallbackOnly===0）。したがって L3-005 は HF2-05 について **PASS** する。自リポジトリ config に L3-005 を有効化しても CI は green を維持する。
- **H06-03**（R2 完了・スコープ内）: AC-4 の source ギャップ（`SeverityDowngradeViolationError` の ADR 参照欠落）を修正し per-AC binding へ昇格済み。全 AC が fileFallbackOnly===0。
- **H05-02**（R3 完了・スコープ内, v0.176.0）: legacy ADR コーパスの canonical 正規化（v0.173.0）と §12 Key Decisions の ADR 起票（v0.175.0, ADR-022〜029 + 007/008/010）完了により legacy blocker が解消。AC-1（§12 marker presence テスト = `real-adr-corpus.it.test.ts` の `@ac H05-02-1`、11 canonical key の実在 + discovery + schema-validity を fail-closed 検証）+ AC-2/3/4（同ファイルの conformance/status/discovery テスト）で全 AC を per-AC binding 化。全 AC が fileFallbackOnly===0。

## 3. 決定 — 自リポジトリのみ opt-in で L3-005 を有効化

- **製品デフォルトは L3-005 を含まない**: `DEFAULT_CONFIG.layers.L3.validators`・`config-foundation/infrastructure/presets/standard.json`・`strict.json` はいずれも L3-005 を含まない（他ユーザーには従来どおり適用されず、増分の破壊なし）。
- **自リポジトリは per-repo で明示有効化**: `phasegate.config.json` の `layers.L3.validators` に `L3-005` を追加し、`layers.L3.acBoundStories: ["HF2-05"]` を設定する。

```jsonc
// phasegate.config.json（自リポジトリのみ）
"layers": {
  "L3": {
    "enabled": true,
    "validators": ["L3-001", "L3-002", "L3-003", "L3-004", "L3-005"],
    "acBoundStories": ["HF2-05", "H06-03", "H05-02"],
    "requirementMatrixPath": ".harness/requirement-test-matrix.json"
  }
}
```

検証: `phasegate:ci-check --json` の `data.validatorResults` において L3-005 が `passed=true, skipped=false`（有効化かつ pass）。

## 4. ラチェット計画 — スコープを段階的に拡大する

「一度スコープに入れたら外さない」ラチェット（逆行禁止）で `acBoundStories` を段階的に拡大する。

| フェーズ | ゲート内容 | 完了条件 |
|---------|-----------|---------|
| **R0（現在, 2026-07-05）** | L3-005 を自リポジトリで有効化。初期スコープ `["HF2-05"]`。HF2-05 は全 AC ac-bound で PASS | 本ドキュメント作成 + config 有効化 + ci-check green |
| **R1** | 新規実装 story に `@ac` binding を義務化し、緑のまま `acBoundStories` に追加していく | スコープが単調増加、逆行なし |
| **R2（完了）** | H06-03 AC-4 の source ギャップ（ADR 参照欠落）を修正し、per-AC binding へ昇格。H06-03 をスコープに追加 | ✅ H06-03 が fileFallbackOnly===0、`acBoundStories += H06-03` |
| **R3（完了, v0.176.0）** | legacy ADR コーパス正規化（v0.173.0）+ §12 Key Decisions の ADR 起票（v0.175.0）完了後、H05-02 AC-1/2/3/4 を per-AC binding へ昇格しスコープに追加 | ✅ H05-02 が fileFallbackOnly===0（AC-1 = §12 marker presence テスト、AC-2/3/4 = real-adr-corpus.it.test.ts）、`acBoundStories += H05-02`。legacy blocker 解消 |
| **R4（将来）** | 全 story が ac-bound に到達したら、attestation の `granularity.traceability.level` を binary/global に "ac" へ切替える検討（KNOWN_LIMITATIONS_REGISTRY の切替）。それまでは `level:"file"` を維持し、per-story の acBoundScope で正直な範囲を示す | 全 story ac-bound |

**逆行防止**: R0 到達後は `acBoundStories` から story を削除してはならない。各段階でスコープ story 数を本表に追記し、減少していないことをレビューで確認する。

## 5. 関連する実装

- **validator-system**: `AcBoundCoveragePolicyPort` + `NyquistAcBoundCoveragePolicyAdapter`（fail-closed）、`ValidatorId` に `L3-005`、`RunL3ValidatorsUseCase` の L3-005 override ブロック。
- **config-foundation**: `layers.L3.acBoundStories`（additive-safe）、alias `ac-bound-coverage`→`L3-005`。
- **attestation**: `AcBoundScopeService`（domain, 純粋）、`MatrixSourcePort` / `AcBoundAllowlistPort`、`AttestationRecord.acBoundScope`、produce（導出）/ verify（再導出比較, anti-laundering）。`GranularityDerivationService` は UNTOUCHED（level は "file" のまま）。
