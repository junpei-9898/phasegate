---
id: WI-090
type: fix
severity: normal
status: implemented
affects: [harness-api, setup]
github_issue: null
reporter: junpei-9898
related: [WI-089]
---

# WI-090: phasegate CLI が unknown flag を silent ignore する問題 — typo を error にして "Did you mean ..." を提示する

> 起票日: 2026-05-08
> 起票経緯: WI-089 dogfood 検証中に検出。`npx phasegate init --skill-set core` (正しくは `--skills core`) を実行しても error にならず、`--skill-set` 値が silent に無視されて `--skills` の default `"all"` で deploy された。

## 背景・症状

`scripts/harness/main.ts` の `parseFlag(args, "--xxx")` は `args.indexOf("--xxx")` で位置検出するだけで、**known flag の allow-list 検証を行わない**。結果として:

1. **typo を検出しない** — `--skill-set` のような typo は無視され default 値が使われる (silent failure)
2. **`--yes` は parse もされない** — `phasegate init --yes` は完全な no-op (yes/no 確認自体が無いため意図は通るが、入力 token として通っているのか silent ignore なのか区別がつかない)
3. **`init --help` も silent ignore** — usage 表示すら出ない
4. **help line に flag 抜け** (`main.ts:84`) — `--skills <core|all>` と `--yes` が記載されておらず、ユーザーが正しい flag 名を確認できない

dogfood で実害が確認できた症状: WI-089 の P1 conditional (`if (skillSet !== "core")`) を core モードで suppress 検証しようとしたが、typo `--skill-set core` が default fallback されたため core path が試せなかった。

## スコープ (init subcommand 限定)

本 WI では **影響の出やすい `init` subcommand のみ** unknown-flag 検証を導入。他 subcommand への展開は別 WI で漸進。

### 1. `validateKnownFlags` ユーティリティを main.ts に追加

`parseFlag` / `hasFlag` の隣 (main.ts:159 周辺) に以下を inline 追加:

```typescript
function validateKnownFlags(args: readonly string[], known: readonly string[]): string | null {
  const knownSet = new Set(known);
  for (const arg of args) {
    if (!arg.startsWith("--")) continue;
    const flagName = arg.includes("=") ? arg.slice(0, arg.indexOf("=")) : arg;
    if (knownSet.has(flagName)) continue;
    const suggestion = findClosestFlag(flagName, known);
    return suggestion
      ? `Error: unknown flag '${flagName}'. Did you mean '${suggestion}'?`
      : `Error: unknown flag '${flagName}'. Known flags: ${known.join(", ")}`;
  }
  return null;
}

function findClosestFlag(input: string, known: readonly string[]): string | undefined {
  let best: string | undefined;
  let bestDist = Infinity;
  for (const flag of known) {
    const dist = levenshtein(input, flag);
    if (dist < bestDist) {
      bestDist = dist;
      best = flag;
    }
  }
  return bestDist <= 3 ? best : undefined;
}

function levenshtein(a: string, b: string): number { /* 標準 DP 実装 */ }
```

設計判断:
- **戻り値は `string | null`** (エラーメッセージか null)。`process.exit` を呼ばない設計にして単体テスト可能性を確保
- **`--flag=value` 形式にも対応** (`flagName = arg.slice(0, arg.indexOf("="))` で flag 名のみ抽出)
- **Levenshtein 閾値 ≤ 3** — `--skill-set` (12) vs `--skills` (8) は距離 4 → 閾値超だが「`-set` を suffix で削るだけ」のケースなので 3 に下げると拾えない可能性。**閾値 4 で運用** (実装時に `--skill-set` ↔ `--skills` が拾えるか確認し調整)

### 2. `init` subcommand に validateKnownFlags 適用

```typescript
case "init": {
  const KNOWN_INIT_FLAGS = ["--name", "--preset", "--skills", "--agent", "--with-husky", "--yes"];
  const flagError = validateKnownFlags(args, KNOWN_INIT_FLAGS);
  if (flagError) {
    console.error(flagError);
    process.exit(2);
  }
  // 既存 parseFlag 群はそのまま
  const projectName = parseFlag(args, "--name") ?? "my-project";
  // ...
}
```

`--yes` は no-op として known flag 扱い (削除すると既存 user の script が壊れる可能性あり、互換性優先)。

### 3. help line 修正 (main.ts:84)

```diff
   init                         Initialize project: deploy skills + design docs + phasegate.config.json
-                              (--name <project-name>, --preset <full|standard|minimal|custom>, --agent <claude|codex|both>, --with-husky)
+                              (--name <project-name>, --preset <full|standard|minimal|custom>,
+                               --skills <core|all>, --agent <claude|codex|both>, --with-husky, --yes)
```

### 4. テスト追加

`scripts/harness/__tests__/unit/harness-api/cli-flags.test.ts` (新規) に以下:

- `levenshtein()`:
  - 「同一文字列なら 0」
  - 「1 文字置換なら 1」
  - 「prefix 追加なら追加長」
- `findClosestFlag()`:
  - 「known と完全一致なら自身を返す」
  - 「typo `--skill-set` → `--skills` を返す」
  - 「全く違う `--xyz` → undefined」
- `validateKnownFlags()`:
  - 「known flags のみなら null」
  - 「unknown flag → 'Did you mean ...?' を含む string」
  - 「`--flag=value` 形式の unknown も検出」
  - 「positional args (`-- ` なし) は無視」
  - 「known flag の値部分は無視」(`--skills core` の `core` は flag ではない)

`scripts/harness/__tests__/integration/setup/init-flag-validation.test.ts` (新規 or 既存に追記) に:

- 「`init --skill-set core` 実行時 process が exit 2 + stderr に suggestion」(spawn 経由)

## 受け入れ基準

- [x] `main.ts` に `validateKnownFlags` / `findClosestFlag` / `levenshtein` 3 関数が追加される
- [x] `init` subcommand 冒頭で `validateKnownFlags(args, KNOWN_INIT_FLAGS)` が呼ばれ、unknown flag で exit 2
- [x] `--skill-set core` 実行時、stderr に `Error: unknown flag '--skill-set'. Did you mean '--skills'?` が出力される (smoke + integration test 確認済)
- [x] `--skills core` (正しい flag) 実行時、従来通り core skills deploy される (smoke 確認済 + 4 番目の integration test で flag validation reject されないこと確認)
- [x] `--name`, `--preset`, `--skills`, `--agent`, `--with-husky`, `--yes` の組み合わせは error にならない
- [x] `--flag=value` 形式の unknown flag (例: `--skill-set=core`) も検出される
- [x] help line (main.ts:84) に `--skills <core|all>` と `--yes` が追加される
- [x] 結合テスト 4 ケース追加。全 3503 テスト (前回 3499 + 新規 4) グリーン (※ 単体テストは helpers が main.ts inline 非 export のため省略、結合テストで挙動を検証)
- [x] L1 / L2 (metadata, test-quality) 維持 (`No violations found`)
- [x] CHANGELOG に v0.126.0 として WI-090 を記載
- [x] minor version bump (0.125.0 → 0.126.0)
- [ ] dogfood: publish 後、別 PJ で `npx phasegate@0.126.0 init --skill-set core --yes` が exit 2 で error suggestion を出すこと、`--skills core --yes` が成功することを確認 (publish 後)

## スコープ外 (別 WI で漸進)

- 他 subcommand (update-skills / migrate / lint / validate / etc.) への validateKnownFlags 展開
- `--help` per subcommand 実装
- yargs / commander 等の CLI library 導入 (現在は zero-dep parser、本 WI でも依存追加なし)
- `--flag=value` 形式の値抽出を `parseFlag` 側でも対応 (現状は `parseFlag` が `args[idx+1]` 方式のみ。本 WI は validation のみで parsing は touch しない)

## 関連

- WI-089 (`docs/inception/_cross/WI-089/description.md`) — 副次検出として記録した「`--skill-set` arg-parsing bug」の解消
- `scripts/harness/main.ts:159` (`parseFlag` / `hasFlag` 定義位置)
- `scripts/harness/main.ts:436-475` (`init` subcommand)
- `scripts/harness/main.ts:84` (help line)

## リリース手順

1. main.ts に helper 3 関数 + KNOWN_INIT_FLAGS 適用 + help line 修正
2. テスト追加 (unit 8+ / integration 1+)
3. CHANGELOG / package.json 更新 (v0.126.0)
4. WI-090 description.md 進捗ログ追記
5. commit (Work-Item: WI-090 trailer 必須)
6. tag v0.126.0 + push origin main --tags
7. user に publish を委ねる (`npm publish --auth-type=web`)
8. publish 後 dogfood: 別 PJ で `--skill-set core` (typo) → error suggestion / `--skills core` → success を確認

## 教訓フィードバック (memory 適用)

- `feedback_dogfood_before_release.md`: CLI 挙動変更は publish 前に dogfood で 1 回試す。「typo は error」「正常 flag は通る」両方確認
- `feedback_npm_publish_auth_type_web.md`: publish は `--auth-type=web` 固定、`--otp` は使わない

## 進捗ログ

### v0.126.0 完了 — 2026-05-08

scope 通り `init` subcommand のみに validateKnownFlags を導入:

- `scripts/harness/main.ts:165-220` 周辺に `levenshtein` / `findClosestFlag` / `validateKnownFlags` を inline 追加。`hasFlag` 直後に配置し、parser ヘルパー群と凝集を保つ。
- `init` case 冒頭 (`main.ts:436-444`) で `KNOWN_INIT_FLAGS = ["--name", "--preset", "--skills", "--agent", "--with-husky", "--yes"]` と照合し、unknown flag は `console.error` + `process.exit(2)`。
- help line (main.ts:84) を 2 行に折り返し、`--skills <core|all>` と `--yes` を追記。
- 結合テスト `scripts/harness/__tests__/integration/harness-api/init-flag-validation.integration.test.ts` 新規追加 (4 ケース)。
- 全 3503 テストグリーン、L1 No violations。
- helpers の単体テストは main.ts が top-level で `main()` を呼ぶ entry point のため省略 (export して import するとテスト時も `main()` が実行されてしまう)。helpers の挙動は結合テストでカバー済。

**実装上の判断**:
- Levenshtein 閾値は **4** (description で示した目安どおり) — `--skill-set` (12 文字) ↔ `--skills` (8 文字) の距離が 4 で、これを suggestion 拾いの境界として運用。
- `--yes` は parse コードに対応がなくても known flag として受理 (silent ignore は許容、unknown flag error は出さない)。
- 他 subcommand への展開は本 WI ではせず、必要が出てから漸進的に導入する方針。
