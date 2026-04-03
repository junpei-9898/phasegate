# AIDLC Hooks Engine 実装計画

> FUSEファイルシステムを用いて、Claude Code Hooksをプラットフォーム非依存で再現する
> 作成日: 2026-03-10

---

## 1. 背景と目的

### 問題
現在のAIDLC Harnessは検証レイヤー（L1-L4）を備えているが、これらはすべて**事後的**な検証である（ESLintの即時検出を除く）。Claude Code Hooksが提供する「ツール使用の前後にインターセプトして品質を強制する」パターンを、**どのCoding Agentでも利用可能な汎用的な仕組みとして**再現したい。

### 目指す姿

```
現状:  Agent → OS → ディスク → (後から検証)
目標:  Agent → OS → [FUSE Hooks Layer] → ディスク (事前・事後にインターセプト)
                      + [Shell Wrapper] (Bash実行のインターセプト)
                      + [Magic File] (完了ゲート)
```

---

## 2. Claude Code Hooks 全イベント再現マッピング

### 2.1 全Hookイベントと再現方式

| Claude Code Hook | イベント | 再現技術 | 再現度 |
|:----------------|:---------|:---------|:------:|
| PreToolUse[Write\|Edit] | ファイル書き込み前 | FUSE `write()`/`open()` インターセプト | 100% |
| PostToolUse[Write\|Edit] | ファイル書き込み後 | FUSE `release()` コールバック | 100% |
| PreToolUse[Read] | ファイル読み取り前 | FUSE `open()`/`read()` インターセプト | 100% |
| PostToolUse[Read] | ファイル読み取り後 | FUSE `read()` 完了コールバック | 100% |
| PreToolUse[Bash] | コマンド実行前 | シェルラッパー（PATH優先） | 90% |
| PostToolUse[Bash] | コマンド実行後 | シェルラッパー（exit後処理） | 90% |
| Stop | 完了宣言時 | マジックファイルパターン + CLIコマンド | 85% |
| PreCompact | コンテキスト圧縮前 | **再現不可**（Agent内部イベント） | 0% |
| SubagentStop | サブAgent停止時 | **再現不可**（Agent内部イベント） | 0% |

### 2.2 再現不可能なHookの代替戦略

| Hook | 代替アプローチ | 説明 |
|:-----|:-------------|:-----|
| PreCompact | `.harness/context-priority.json` | 圧縮時に優先して残すべきファイルリストをAGENTS.mdで指示 |
| SubagentStop | `harness gate --subagent` | サブエージェント完了時にCLIで検証を実行するようAGENTS.mdで指示 |

---

## 3. 技術選定

### 3.1 FUSE実装

| 選択肢 | 説明 | 推奨 |
|:-------|:-----|:----:|
| **fuse-native (sagemathinc fork)** | Node.js用FUSEバインディング。TypeScript定義あり | ⭐ |
| node-fuse-bindings | libfuseの高レベルAPIバインディング | △ |
| Go + bazil.org/fuse | Go製FUSEライブラリ | - |

**選定: `@anthropic-ai/fuse-native`（sagemathinc/fuse-native fork）**

理由:
- TypeScript定義が付属し、既存PJのTypeScript基盤と整合
- libfuseの高レベルAPIをラップしており、主要なファイルシステムコールバックを全て公開
- Node.jsのイベントループと自然に統合でき、非同期処理が容易

### 3.2 macOS FUSE基盤

| 選択肢 | 説明 | 推奨 |
|:-------|:-----|:----:|
| **FUSE-T** | カーネル拡張不要（NFSv4ローカルサーバー方式）。Apple Siliconフレンドリー | ⭐ |
| macFUSE | 成熟しているが、カーネル拡張が必要。macOS 26でFSKitバックエンド予定 | △ |

**選定: FUSE-T**

理由:
- カーネル拡張（kext）のインストールが不要で、セットアップが容易
- Apple Silicon対応が安定
- macFUSEとAPI互換（drop-in replacement）
- Appleのkext非推奨方針と一致

### 3.3 シェルラッパー（Bash Hook用）

| 選択肢 | 説明 | 推奨 |
|:-------|:-----|:----:|
| **PATHオーバーライド** | `.harness/bin/` をPATHの先頭に配置 | ⭐ |
| LD_PRELOAD | 共有ライブラリの差し替え | - |
| シェルのalias/function | .bashrcでのオーバーライド | △ |

**選定: PATHオーバーライド**

理由:
- 最もシンプルかつポータブル
- Coding Agentが使用するシェルにかかわらず動作
- AGENTS.mdでPATH設定を指示するだけで導入可能
- ラッパースクリプトの追加・削除が容易

---

## 4. アーキテクチャ設計

### 4.1 全体構成

```
┌──────────────────────────────────────────────────────────────────────┐
│                     AIDLC Hooks Engine                               │
│                                                                      │
│  ┌────────────────────────────────────────────────────┐              │
│  │              .harness-hooks.yml (設定)               │              │
│  │                                                    │              │
│  │  hooks:                                            │              │
│  │    preWrite:                                       │              │
│  │      - name: protect-config                        │              │
│  │        match: ["tsconfig.json", ".eslintrc*"]      │              │
│  │        action: block                               │              │
│  │        message: "設定ファイルの変更は禁止です"        │              │
│  │    postWrite:                                      │              │
│  │      - name: format-and-lint                       │              │
│  │        match: ["*.ts", "*.tsx"]                     │              │
│  │        command: "harness lint --fix {file}"         │              │
│  │    preRead:                                        │              │
│  │      - name: protect-secrets                       │              │
│  │        match: [".env*", "*.key", "*.pem"]          │              │
│  │        action: block                               │              │
│  │    preBash:                                        │              │
│  │      - name: deny-destructive                      │              │
│  │        match: ["rm -rf *", "git push*"]            │              │
│  │        action: block                               │              │
│  │    onComplete:                                     │              │
│  │      - name: test-gate                             │              │
│  │        command: "pnpm test"                        │              │
│  └────────────────────────────────────────────────────┘              │
│                          │                                           │
│           ┌──────────────┼──────────────┐                            │
│           ▼              ▼              ▼                            │
│  ┌──────────────┐ ┌─────────────┐ ┌─────────────┐                   │
│  │ FUSE Daemon  │ │Shell Wrapper│ │ Magic File  │                   │
│  │              │ │             │ │ Gate        │                   │
│  │  preWrite    │ │  preBash    │ │  onComplete │                   │
│  │  postWrite   │ │  postBash   │ │             │                   │
│  │  preRead     │ │             │ │             │                   │
│  │  postRead    │ │             │ │             │                   │
│  └──────────────┘ └─────────────┘ └─────────────┘                   │
│           │              │              │                            │
│           ▼              ▼              ▼                            │
│  ┌──────────────────────────────────────────────────┐                │
│  │         .harness/ (フィードバック領域)              │                │
│  │                                                  │                │
│  │  violations.jsonl   — ブロックされた操作ログ       │                │
│  │  feedback.md        — リント/型エラー詳細          │                │
│  │  bash-audit.jsonl   — コマンド実行監査ログ         │                │
│  │  COMPLETE           — 完了シグナルファイル          │                │
│  │  metrics.json       — Hook実行統計               │                │
│  └──────────────────────────────────────────────────┘                │
│                                                                      │
│  CLI:                                                                │
│    harness hooks mount [source] [workspace]   — FUSE起動             │
│    harness hooks unmount [workspace]          — FUSE停止             │
│    harness hooks status                       — Hook状態表示          │
│    harness hooks test                         — Hook動作テスト        │
│    harness gate                               — 完了ゲート実行        │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.2 ディレクトリ構成（新規追加分）

```
scripts/harness/
├── hooks/                              # [NEW] Hooks Engine
│   ├── engine/                         # コアエンジン
│   │   ├── hook-config-loader.ts       # .harness-hooks.yml の読み込み・バリデーション
│   │   ├── hook-matcher.ts             # パスパターンマッチング（glob対応）
│   │   ├── hook-executor.ts            # フック実行（command/block/log）
│   │   └── hook-logger.ts             # violations.jsonl / feedback.md への記録
│   │
│   ├── fuse/                           # FUSE デーモン
│   │   ├── fuse-daemon.ts              # メインデーモンプロセス
│   │   ├── fuse-handlers.ts            # FUSE syscallハンドラ（open/read/write/release）
│   │   ├── passthrough-fs.ts           # パススルーファイルシステム基盤
│   │   └── fuse-types.ts              # FUSE関連の型定義
│   │
│   ├── shell/                          # シェルラッパー
│   │   ├── generate-wrappers.ts        # ラッパースクリプト生成ロジック
│   │   └── templates/                  # ラッパーテンプレート
│   │       ├── bash-wrapper.sh         # bash ラッパー
│   │       ├── git-wrapper.sh          # git ラッパー
│   │       ├── npm-wrapper.sh          # npm/pnpm ラッパー
│   │       └── node-wrapper.sh         # node ラッパー
│   │
│   ├── gate/                           # 完了ゲート
│   │   ├── completion-gate.ts          # 完了チェックロジック
│   │   └── magic-file-handler.ts       # .harness/COMPLETE 書き込み検知
│   │
│   └── adapters/                       # プラットフォームアダプター
│       ├── claude-code-adapter.ts      # .claude/settings.json 生成
│       ├── codex-adapter.ts            # .codex/ 設定生成
│       └── generic-adapter.ts          # AGENTS.md 指示生成
│
├── cli/                                # 既存CLI拡張
│   ├── hooks-mount.ts                  # [NEW] harness hooks mount
│   ├── hooks-unmount.ts                # [NEW] harness hooks unmount
│   ├── hooks-status.ts                 # [NEW] harness hooks status
│   ├── hooks-test.ts                   # [NEW] harness hooks test
│   └── gate.ts                         # [NEW] harness gate
│
└── __tests__/
    └── hooks/                          # [NEW] Hooksテスト
        ├── engine/
        │   ├── hook-config-loader.test.ts
        │   ├── hook-matcher.test.ts
        │   ├── hook-executor.test.ts
        │   └── hook-logger.test.ts
        ├── fuse/
        │   ├── fuse-handlers.test.ts
        │   └── passthrough-fs.test.ts
        ├── shell/
        │   └── generate-wrappers.test.ts
        ├── gate/
        │   ├── completion-gate.test.ts
        │   └── magic-file-handler.test.ts
        └── integration/
            └── hooks-e2e.test.ts
```

---

## 5. 各コンポーネント詳細設計

### 5.1 FUSE Daemon（コア）

#### 5.1.1 パススルーファイルシステム

FUSEの基本戦略は「パススルー」である。すべてのファイルシステム操作を実ファイルシステムに委譲しつつ、特定のタイミングで**Hookを挟む**。

```typescript
// passthrough-fs.ts の概念設計
interface PassthroughFS {
  // 読み取り系
  getattr(path: string): Promise<Stats>;
  readdir(path: string): Promise<string[]>;
  open(path: string, flags: number): Promise<FileDescriptor>;
  read(path: string, fd: number, buf: Buffer, len: number, pos: number): Promise<number>;
  
  // 書き込み系
  create(path: string, mode: number): Promise<FileDescriptor>;
  write(path: string, fd: number, buf: Buffer, len: number, pos: number): Promise<number>;
  truncate(path: string, size: number): Promise<void>;
  
  // ライフサイクル
  release(path: string, fd: number): Promise<void>;  // ファイルクローズ
  unlink(path: string): Promise<void>;                // ファイル削除
}
```

#### 5.1.2 Hookインターセプションポイント

```typescript
// fuse-handlers.ts のHookインターセプト設計

// PreWrite: write() が実ファイルシステムに到達する前に実行
async function handleWrite(path: string, fd: number, buf: Buffer, len: number, pos: number): Promise<number> {
  const hooks = configLoader.getHooks('preWrite');
  for (const hook of hooks) {
    if (matcher.matches(path, hook.match)) {
      const result = await executor.execute(hook, { path, content: buf.toString() });
      if (result.blocked) {
        logger.logViolation({ hook: hook.name, path, reason: result.message });
        throw new FuseError(EPERM); // Permission denied → Agentに返る
      }
    }
  }
  
  // パススルー：実ファイルシステムに書き込み
  return fs.writeSync(fd, buf, 0, len, pos);
}

// PostWrite: release() (ファイルクローズ)時に実行
async function handleRelease(path: string, fd: number): Promise<void> {
  fs.closeSync(fd);
  
  const hooks = configLoader.getHooks('postWrite');
  for (const hook of hooks) {
    if (matcher.matches(path, hook.match)) {
      const result = await executor.execute(hook, { path });
      if (result.output) {
        logger.writeFeedback(path, result.output);
      }
    }
  }
}

// PreRead: open() 時にアクセス制御
async function handleOpen(path: string, flags: number): Promise<number> {
  if (flags & O_RDONLY || flags & O_RDWR) {
    const hooks = configLoader.getHooks('preRead');
    for (const hook of hooks) {
      if (matcher.matches(path, hook.match)) {
        const result = await executor.execute(hook, { path });
        if (result.blocked) {
          logger.logViolation({ hook: hook.name, path, reason: result.message });
          throw new FuseError(EACCES); // Access denied
        }
      }
    }
  }
  return fs.openSync(sourcePath(path), flags);
}
```

### 5.2 シェルラッパー（Bash Hook用）

#### 5.2.1 ベストプラクティス

**なぜPATHオーバーライドが最適か:**
- Coding Agentはシステムのシェルを経由してコマンドを実行する
- `PATH`の先頭にラッパーディレクトリを置けば、同名のコマンドが優先実行される
- Agent側の設定変更が不要（AGENTS.mdでPATH設定を指示するだけ）
- ラッパー内で元のコマンドをfull pathで呼び出すことで、再帰を防止

#### 5.2.2 bashラッパー設計

```bash
#!/bin/bash
# .harness/bin/bash
# PreToolUse[Bash] + PostToolUse[Bash] の再現

HARNESS_DIR="$(dirname "$(dirname "$(realpath "$0")")")"
CONFIG="$HARNESS_DIR/../.harness-hooks.yml"
ORIGINAL_BASH="/bin/bash"

# --- PreToolUse[Bash] ---
COMMAND="$*"

# 危険コマンドパターンチェック（.harness-hooks.ymlから読み込み）
DENY_PATTERNS=$(harness hooks check-bash "$COMMAND" 2>&1)
if [ $? -ne 0 ]; then
  echo "HARNESS BLOCKED: $COMMAND" >&2
  echo "$DENY_PATTERNS" >&2
  # 監査ログに記録
  echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"cmd\":\"$COMMAND\",\"status\":\"blocked\",\"reason\":\"$DENY_PATTERNS\"}" >> "$HARNESS_DIR/bash-audit.jsonl"
  exit 1
fi

# --- 実行 ---
$ORIGINAL_BASH "$@"
EXIT_CODE=$?

# --- PostToolUse[Bash] ---
# 監査ログに記録
echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"cmd\":\"$COMMAND\",\"status\":\"executed\",\"exit_code\":$EXIT_CODE}" >> "$HARNESS_DIR/bash-audit.jsonl"

# PostBash hookの実行（設定にある場合）
harness hooks post-bash "$COMMAND" "$EXIT_CODE" 2>/dev/null

exit $EXIT_CODE
```

#### 5.2.3 gitラッパー設計

```bash
#!/bin/bash
# .harness/bin/git
# git操作のインターセプト

HARNESS_DIR="$(dirname "$(dirname "$(realpath "$0")")")"
ORIGINAL_GIT="/usr/bin/git"

# Pre: 危険なgit操作のブロック
case "$1" in
  push|reset|rebase|cherry-pick|clean)
    echo "HARNESS BLOCKED: git $* は保護されています" >&2
    echo "理由: 破壊的なgit操作はハーネスによりブロックされます" >&2
    exit 1
    ;;
  commit)
    # Pre-commitバリデーション（--no-verify のブロック含む）
    if echo "$*" | grep -q -- "--no-verify"; then
      echo "HARNESS BLOCKED: --no-verify は禁止されています" >&2
      exit 1
    fi
    # 既存のpre-commitバリデータを実行
    harness hooks pre-commit 2>&1
    if [ $? -ne 0 ]; then
      exit 1
    fi
    ;;
esac

# 実行
$ORIGINAL_GIT "$@"
```

### 5.3 完了ゲート（Stop Hook再現）

#### 5.3.1 マジックファイルパターン

```typescript
// magic-file-handler.ts
// FUSEの write() で .harness/COMPLETE への書き込みを検知

async function handleCompleteWrite(path: string, content: string): Promise<void> {
  // 無限ループ防止
  if (fs.existsSync('/tmp/.harness-gate-active')) {
    return; // ゲート実行中はパススルー
  }
  
  fs.writeFileSync('/tmp/.harness-gate-active', '');
  
  try {
    const gateResult = await completionGate.run();
    
    if (gateResult.passed) {
      // 全チェック通過 → 書き込みを許可（＝完了を承認）
      fs.writeFileSync(sourcePath(path), 'PASSED\n' + JSON.stringify(gateResult, null, 2));
    } else {
      // チェック失敗 → 書き込みを拒否 + フィードバック
      const feedback = formatGateFailure(gateResult);
      logger.writeFeedback('.harness/COMPLETE', feedback);
      throw new FuseError(EPERM);
    }
  } finally {
    fs.unlinkSync('/tmp/.harness-gate-active');
  }
}
```

#### 5.3.2 CLIベースの完了ゲート（フォールバック）

```typescript
// completion-gate.ts
// FUSEが使えない環境でのフォールバック + 直接CLI実行用

interface GateResult {
  passed: boolean;
  checks: {
    name: string;
    passed: boolean;
    message?: string;
    duration: number;
  }[];
  totalDuration: number;
}

async function runCompletionGate(): Promise<GateResult> {
  const checks = configLoader.getHooks('onComplete');
  const results: GateResult['checks'] = [];
  
  for (const check of checks) {
    const start = Date.now();
    const result = await executor.executeCommand(check.command);
    results.push({
      name: check.name,
      passed: result.exitCode === 0,
      message: result.exitCode !== 0 ? result.stderr : undefined,
      duration: Date.now() - start,
    });
  }
  
  return {
    passed: results.every(r => r.passed),
    checks: results,
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
  };
}
```

---

## 6. Hook設定ファイル仕様

### 6.1 `.harness-hooks.yml` フォーマット

```yaml
# .harness-hooks.yml - AIDLC Hooks Engine 設定ファイル
version: "1.0"

# FUSE設定
fuse:
  enabled: true
  mount_point: ".workspace"     # マウント先（デフォルト）
  source: "."                   # マウント元（プロジェクトルート）
  exclude_from_mount:           # マウントから除外するパス
    - "node_modules"
    - ".git"
    - ".harness"

# ファイル書き込み前Hook（FUSE write()でインターセプト）
hooks:
  preWrite:
    - name: protect-config-files
      match:
        - "tsconfig.json"
        - "tsconfig.*.json"
        - ".eslintrc*"
        - "eslint.config.*"
        - "biome.json"
        - "package.json"          # dependencies変更防止
        - ".harness-hooks.yml"    # Hook設定自体の保護
      action: block
      message: |
        設定ファイルの変更はブロックされました。
        コードを修正してエラーを解消してください（設定を変更しないこと）。
      severity: error
    
    - name: deny-forbidden-patterns
      match: ["*.ts", "*.tsx"]
      action: inspect
      rules:
        - pattern: "as any"
          message: "any型キャストは禁止です。適切な型を使用してください。"
        - pattern: "eslint-disable"
          message: "ESLint無効化は禁止です。ルールに従って修正してください。"
        - pattern: "eval("
          message: "eval()の使用は禁止です。"

  # ファイル書き込み後Hook（FUSE release()で実行）
  postWrite:
    - name: format-typescript
      match: ["*.ts", "*.tsx"]
      command: "npx biome format --write {file}"
      silent: true               # 成功時は出力しない
    
    - name: lint-typescript
      match: ["*.ts", "*.tsx"]
      command: "npx oxlint {file}"
      feedback: true             # 結果をfeedback.mdに書き出し
    
    - name: typecheck
      match: ["*.ts", "*.tsx"]
      command: "npx tsc --noEmit --pretty false"
      feedback: true
      debounce: 2000             # 2秒間の集約（連続書き込み対策）

  # ファイル読み取り前Hook（FUSE open()でインターセプト）
  preRead:
    - name: protect-secrets
      match:
        - ".env"
        - ".env.*"
        - "*.key"
        - "*.pem"
        - "*.crt"
        - "**/id_rsa"
        - "**/id_rsa.pub"
        - "**/config.ts"         # DB接続情報等
      action: block
      message: "機密ファイルへのアクセスはブロックされました。"
    
    - name: protect-production
      match:
        - "**/*prod*config*"
        - "**/*production*"
        - "**/*.prod.*"
      action: block
      message: "本番設定ファイルへのアクセスは禁止です。"

  # Bash実行前Hook（シェルラッパーでインターセプト）
  preBash:
    - name: deny-destructive-commands
      match:
        - "rm -rf *"
        - "sudo *"
        - "git push*"
        - "git reset*"
        - "git rebase*"
        - "git cherry-pick*"
        - "git revert*"
        - "git clean*"
        - "npm run deploy*"
      action: block
      message: "破壊的コマンドはハーネスによりブロックされました。"
    
    - name: deny-no-verify
      match:
        - "git commit*--no-verify*"
      action: block
      message: "--no-verify は禁止です。Pre-commitフックをバイパスできません。"

  # Bash実行後Hook
  postBash:
    - name: audit-log
      match: ["*"]              # 全コマンドを記録
      action: log
      target: ".harness/bash-audit.jsonl"

  # 完了ゲートHook（マジックファイル + CLI）
  onComplete:
    - name: test-all
      command: "pnpm test"
      required: true            # 失敗時は完了をブロック
    
    - name: lint-all
      command: "npx oxlint ."
      required: true
    
    - name: harness-validate
      command: "pnpm phasegate:ci-check"
      required: true

# プラットフォームアダプター設定
adapters:
  claude_code:
    enabled: true
    generate: ".claude/settings.json"  # 自動生成先
  codex:
    enabled: true
    generate: ".codex/setup.sh"
  agents_md:
    enabled: true
    generate: "AGENTS.md"              # Hook利用方法を追記
```

---

## 7. 実装計画（段階的）

### Phase 1: コアエンジン（Week 1-2）

| Step | タスク | 成果物 | テスト数(見込み) |
|:-----|:------|:-------|:---:|
| 1-1 | Hook設定ローダーの実装 | `hook-config-loader.ts` | 6 |
| 1-2 | パスマッチャーの実装（glob対応） | `hook-matcher.ts` | 8 |
| 1-3 | Hook実行エンジンの実装 | `hook-executor.ts` | 6 |
| 1-4 | ログ・フィードバックライターの実装 | `hook-logger.ts` | 5 |

### Phase 2: FUSEデーモン（Week 3-4）

| Step | タスク | 成果物 | テスト数(見込み) |
|:-----|:------|:-------|:---:|
| 2-1 | パススルーFS基盤の実装 | `passthrough-fs.ts` | 8 |
| 2-2 | PreWrite/PostWrite ハンドラ | `fuse-handlers.ts`（write/release） | 8 |
| 2-3 | PreRead ハンドラ | `fuse-handlers.ts`（open/read） | 5 |
| 2-4 | FUSEデーモンプロセス管理 | `fuse-daemon.ts` | 5 |
| 2-5 | FUSE用CLIコマンド | `hooks-mount.ts`, `hooks-unmount.ts`, `hooks-status.ts` | 6 |

### Phase 3: シェルラッパー + 完了ゲート（Week 5-6）

| Step | タスク | 成果物 | テスト数(見込み) |
|:-----|:------|:-------|:---:|
| 3-1 | ラッパースクリプト生成ロジック | `generate-wrappers.ts` | 5 |
| 3-2 | bash/git/npm ラッパーテンプレート | `templates/*.sh` | 4 |
| 3-3 | 完了ゲートロジック | `completion-gate.ts` | 6 |
| 3-4 | マジックファイルハンドラ | `magic-file-handler.ts` | 4 |
| 3-5 | ゲート用CLIコマンド | `gate.ts` | 3 |

### Phase 4: アダプター + 統合（Week 7-8）

| Step | タスク | 成果物 | テスト数(見込み) |
|:-----|:------|:-------|:---:|
| 4-1 | Claude Codeアダプター | `claude-code-adapter.ts` | 4 |
| 4-2 | Codexアダプター | `codex-adapter.ts` | 3 |
| 4-3 | AGENTS.md自動更新 | `generic-adapter.ts` | 3 |
| 4-4 | 統合テスト | `hooks-e2e.test.ts` | 8 |
| 4-5 | `hooks-test.ts` CLI（Hookの動作確認用） | `hooks-test.ts` | 3 |

### テスト合計見込み: 約97テスト（既存143 + 新規97 = 合計240テスト）

---

## 8. 前提条件・依存関係

### 8.1 必要なシステム依存

| 依存 | 用途 | インストール方法 |
|:-----|:-----|:---------------|
| FUSE-T | macOS用FUSEランタイム | `brew install fuse-t` |
| libfuse | Linux用FUSEランタイム | `apt install libfuse3-dev` |

### 8.2 必要なnpmパッケージ（新規追加）

```json
{
  "dependencies": {
    "fuse-native": "^3.0.0",
    "js-yaml": "^4.1.0",
    "micromatch": "^4.0.0",
    "chokidar": "^4.0.0"
  }
}
```

> **NOTE**: `chokidar` はFUSEが利用できない環境でのフォールバック用ファイル監視に使用。

---

## 9. 検証計画

### 9.1 自動テスト

```bash
# 全テスト実行
pnpm test

# Hooksテストのみ実行
pnpm test -- --grep "hooks"
```

テスト方針:
- コアエンジン（Phase 1）: 純粋なユニットテスト。ファイルシステムのモックを使用
- FUSEハンドラ（Phase 2）: 実際のFUSEマウント + テンポラリディレクトリでの統合テスト
- シェルラッパー（Phase 3）: 生成されたスクリプトの内容検証 + シェル実行テスト
- 統合テスト（Phase 4）: 実際にFUSEマウントし、保護ファイルへの書き込みがブロックされることを検証

### 9.2 手動検証

以下のシナリオを手動で確認:

1. **FUSE起動テスト**: `harness hooks mount . .workspace` → マウント成功確認
2. **PreWrite保護テスト**: `.workspace/tsconfig.json` に書き込み → Permission denied 確認
3. **PostWriteリントテスト**: `.workspace/src/test.ts` にエラーコードを書き込み → `.harness/feedback.md` にリント結果が出力されることを確認
4. **PreRead保護テスト**: `.workspace/.env` を読み取り → Access denied 確認
5. **完了ゲートテスト**: `harness gate` → テスト・リント・バリデータ全実行の確認
6. **シェルラッパーテスト**: `.harness/bin/bash -c "rm -rf /"` → ブロック確認

---

## 10. リスクと軽減策

| リスク | 影響 | 軽減策 |
|:------|:-----|:------|
| FUSE-Tの安定性 | ファイルI/Oの信頼性 | フォールバックモード（chokidarベース）を用意 |
| FUSEのパフォーマンスオーバーヘッド | 開発体験が遅くなる | node_modules等の大量ファイルはマウント対象外にする |
| macOS以外での動作 | Linux/WSLでの互換性 | libfuse3対応。CI環境ではFUSEなしモード（Git Hooks + CLIのみ）で動作 |
| エージェントがFUSEをバイパス | ソースディレクトリに直接アクセス | OSレベルのパーミッションでソースディレクトリの書き込みを制限 |
| 無限ループ | Hookがファイル変更→Hookが再トリガー | `.harness/` 配下はHook対象外。デバウンス + 再入ガード |

---

## 11. 今後の拡張（Phase 5以降）

- **Hookマーケットプレイス**: 共有可能なHookプリセット集（security-preset, style-preset等）
- **Web UI ダッシュボード**: Hook実行統計・違反履歴の可視化
- **リモートHook**: HTTP endpointとしてHookを定義し、外部サービスと連携
- **AI Hook**: Hookの判定にLLMを使用（例：コードの意図が設計書と整合しているか）
