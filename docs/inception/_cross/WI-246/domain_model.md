# WI-246 Domain Model

## Concepts

| Concept | Owner | Meaning |
|---|---|---|
| Source-touch | phase-dependency-model | ある WI のコミット（`Work-Item:` trailer で機械的に紐付く）が `scripts/harness/{unit}/{layer}/` 配下のソースファイルを変更した事実。git 履歴由来で洗浄不能 |
| Layer-aware reflection requirement | phase-dependency-model | cross-WI の `domain_model.md` 反映要求は source-touch(domain) が実在する場合のみ発火する。`logical_design.md` 反映要求は unit 全レイヤーを写像するため無条件 |
| Affects-empty skip | phase-dependency-model | `affects:` が空/未定義の cross-WI は「影響 unit なし」として反映要求の対象外になる |

## Invariants

- INV-A（anti-gutting）: unit U の domain 層ソースを変更した cross-WI は、U の product `domain_model.md` への `@work-item-id` 反映を引き続き要求される。
- INV-B: U の domain 層を変更していない cross-WI に対して `domain_model.md` 反映要求は発火しない。`logical_design.md` 反映要求は無条件に維持される。
- INV-C: `affects:` が空/未定義の cross-WI はどの unit にも反映要求を発火しない。
- INV-D: source-touch 判定が不能（WI に紐付くコミットが履歴に存在しない）の場合は「touch なし」として扱う。この規則は反映要求の除去方向にのみ作用し、新規ブロックを生まない。
- INV-E: unit-local WI（`WI-\d+` 形式でない storyId、または unit 配下 inception に設計文書を持つ WI）の要求判定は本変更の影響を受けない。

## Port 拡張

- `StoryReflectionFileSystemPort.storyTouchesUnitLayer(storyId: string, unitId: string, layer: string): Promise<boolean>` — source-touch の存在判定。ドメイン層は判定手段（git）を知らない。
