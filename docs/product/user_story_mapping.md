# User Story Mapping — Phasegate

> **ステータス**: 確定版（self-hosting 遡及作成 2026-04-05）
> **前提**: `docs/inception/_shared/story_mapping_plan.md`
> **関連**: `docs/product/user_stories.md`

---

## 1. Story Map 全体構造

```
Backbone: AI-Driven Development Life Cycle (AIDLC)
│
├── Activity 1: Product Definition
│   ├── Task: Define product vision
│   └── Task: Create user stories
│
├── Activity 2: Story Design
│   ├── Task: Map stories
│   └── Task: Define unit boundaries
│
├── Activity 3: Unit Design
│   ├── Task: Domain modeling
│   ├── Task: Logical architecture
│   └── Task: UI/UX design
│
├── Activity 4: Test Engineering
│   ├── Task: Unit test design
│   ├── Task: IT test design
│   └── Task: Scenario test design
│
├── Activity 5: Implementation
│   ├── Task: TDD implementation
│   └── Task: Quick mode implementation
│
├── Activity 6: Verification
│   ├── Task: L1-L4 validation
│   └── Task: Traceability check
│
└── Activity 7: Governance
    ├── Task: CI/CD integration
    └── Task: Scheduled audits
```

## 2. Wave 分割

### Wave 1: 基盤構築（MVP 基盤）

| Epic | 含まれる Activity | US 数 |
|------|------------------|-------|
| H-01 Biome AST | Activity 6 (L1) | 3 |
| H-02 Phase Dependency | Activity 2, 3 | 3 |
| H-03 Traceability | Activity 6 | 3 |
| H-04 Config v2 | 横断 | 3 |
| H-05 ADR | 横断 | 3 |
| H-06 HarnessError | 横断 | 3 |

### Wave 2: コア品質 + エージェント統合

| Epic | 含まれる Activity | US 数 |
|------|------------------|-------|
| H-07 Nyquist | Activity 4, 6 | 4 |
| H-08 L2-L4 Validators | Activity 6 | 5 |
| H-09 Harness API | 横断 | 4 |
| H-10 Quick Mode | Activity 5 | 4 |
| H-11 Agent Integration | Activity 5, 6 | 4 |

### Wave 3: 拡張・運用・保証

| Epic | 含まれる Activity | US 数 |
|------|------------------|-------|
| H-12 スキル品質強化 | Activity 3, 5 | 6 |
| H-13 Scheduled Gov + CI/CD | Activity 7 | 3 |
| H-14 K1-K15 回帰保証 | 横断 | 3 |
| H-15 v0 テスト移行 | Activity 6 | 2 |

## 3. リリース計画

| Release | スコープ | Wave |
|---------|---------|------|
| v0.x | Self-hosting 基盤（継続） | Wave 1 相当 |
| v1.0 | OSS 公開 | Wave 1 + Wave 2 |
| v1.1+ | 拡張機能 | Wave 3 |

## 4. 詳細

個別 US の内容は `docs/product/user_stories.md` を参照。Wave 内訳の根拠は `docs/inception/_shared/story_writer_plan.md` §3 Wave 分割を参照。
