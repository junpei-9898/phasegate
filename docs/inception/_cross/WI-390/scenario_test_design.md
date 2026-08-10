# WI-390 Scenario Test Design

<!-- @work-item-id WI-390 -->

## Scenario 1: packed tarball

1. `npm pack` で exact artifact を作る。
2. 空の project repo に tarball を install する。
3. `install --agent both --with-husky --apply` を実行する。
4. `git config core.hooksPath` と doctor finding を確認する。
5. root Markdown の change category と config direct-write hook を実行する。
6. PostToolUse analyze hook が project の PhaseGate lint 契約を使用することを確認する。

期待: #47〜#50 の全 external contract が tarball から再現可能な green になる。

## Scenario 2: registry package

1. npm publish 後、registry が `phasegate@0.340.0` を返すまで確認する。
2. clean temp repo に `phasegate@0.340.0` を install する。
3. Scenario 1 の public CLI / bundled template assertions を繰り返す。
4. `npx phasegate --version` が v0.340.0 を返す。

期待: local source や workspace symlink に依存せず全修正が配布されている。

## Scenario 3: GitHub publication

1. main の release commit に `v0.340.0` tag がある。
2. GitHub Release が exact tag を参照する。
3. issue #47〜#50 のコメントに registry / scenario evidence があり、全件 closed である。
