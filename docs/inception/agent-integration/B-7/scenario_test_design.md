# B-7 シナリオテスト設計: ProtectedFileList 除外設定機能

## シナリオ一覧

### ST-B7-01: 除外設定あり — 除外対象ファイルは保護をバイパス

**前提**: `phasegate.config.json` に `protectedFiles.exclude: ["tsconfig.json"]` が設定されている
**操作**: `tsconfig.json` への Write/Edit フックイベントが発火
**期待**: ProtectedFileList にマッチせず、ブロックされない（shouldBlock: false）

### ST-B7-02: 除外設定あり — 除外対象外のファイルは引き続き保護

**前提**: `phasegate.config.json` に `protectedFiles.exclude: ["tsconfig.json"]` が設定されている
**操作**: `package-lock.json` への Write/Edit フックイベントが発火
**期待**: ProtectedFileList にマッチし、ブロックされる（shouldBlock: true）

### ST-B7-03: 除外設定なし — 現行動作と完全互換

**前提**: `phasegate.config.json` に `protectedFiles` セクションが存在しない
**操作**: `tsconfig.json` への Write/Edit フックイベントが発火
**期待**: DEFAULT_PATTERNS 全てが有効、ブロックされる（shouldBlock: true）

### ST-B7-04: 全パターン除外 — INV-4 フォールバック

**前提**: `protectedFiles.exclude` に DEFAULT_PATTERNS 全5件を指定
**操作**: `tsconfig.json` への Write/Edit フックイベントが発火
**期待**: フォールバックにより DEFAULT_PATTERNS が復元され、ブロックされる（shouldBlock: true）
