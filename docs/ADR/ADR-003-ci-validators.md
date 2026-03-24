# ADR-003: L3 — CI バリデータによるセキュリティ・パフォーマンス・カバレッジ検証

## Status

Accepted

## Context

セキュリティ脆弱性（ハードコードされた秘密情報）、パフォーマンス問題（ループ内 await）、テストカバレッジ不足は、Editor-Time や Pre-commit では検出コストが高く、CI パイプラインでの検証が適切である。

## Decision

L3（CI/CD）で以下の4バリデータを実行する。

| バリデータ | コード | 検出対象 |
|-----------|--------|---------|
| security | L3-001 | ハードコード秘密情報、SQL インジェクションパターン |
| performance | L3-002 | ループ内 await（TypeScript AST）、バンドルサイズ超過 |
| coverage | L3-003 | テストカバレッジ閾値（standard: 90%, strict: 95%） |
| nyquist | L3-004 | 要件→テスト双方向トレーサビリティ |

### 技術的実装

- **security**: 正規表現パターンマッチング（API key, password, secret token パターン）
- **performance**: TypeScript Compiler API (`ts.createProgram`) による AST レベルの await-in-loop 検出
- **nyquist**: `@story` メタデータと受け入れ基準の双方向マッピング検証

## Consequences

- セキュリティ脆弱性が PR マージ前に検出される
- パフォーマンス問題が AST レベルで正確に検出される（正規表現ではなく構文木解析）
- 要件→テストのトレーサビリティが Nyquist Validation で体系的に保証される

## 関連要件

K1（4層防御）、K10（Security/Performance検出）
