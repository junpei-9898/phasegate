# シナリオテスト設計: H10-04 — quick-implementor（Quick Mode下のad-hoc実装スキル）

> **Unit ID**: quick-mode
> **ストーリーID**: H10-04
> **作成日**: 2026-03-20

## 1. テスト対象CLIコマンド / 機能

H10-04はSKILL.mdドキュメントの生成であり、CLIコマンドを持たない。成果物は `docs/skills/quick-implementor/SKILL.md` として配置される。

- `docs/skills/quick-implementor/SKILL.md`: quick-implementorスキルの定義文書
- H10-01（QuickModeJudgmentEngine）を前提条件として参照
- H10-03（ValidatorRelaxationProfile）に基づいて品質チェックを実行するフロー定義

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-H10-04-001 | quick-implementor SKILL.mdが存在する | ファイルシステム確認 | `docs/skills/quick-implementor/SKILL.md` が存在する |
| SC-H10-04-002 | SKILL.mdにQuick Mode判定（H10-02）への参照が含まれる | SKILL.md内容確認 | QuickModeJudgmentEngineまたはquick-checkへの参照を含む |
| SC-H10-04-003 | SKILL.mdにAtomic commit維持の記述が含まれる | SKILL.md内容確認 | Atomic commitに関する記述を含む |

## 3. テスト配置
- ドキュメント存在確認: ファイルシステム確認（E2Eテストまたは手動確認）

## 4. 前提条件
- H10-01〜H10-03の実装が完了していること
- skill-creatorスキルによるSKILL.md作成プロセスが完了していること
