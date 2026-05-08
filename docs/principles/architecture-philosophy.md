# アーキテクチャ原則

この文書を設計・実装判断の共通原則とする。Unit 固有の詳細は `docs/product/` と `docs/inception/` の該当文書に従う。

## 基本方針

- **設計書駆動**: 実装前に該当 WI、inception、product docs を読み、仕様を確認する。推測で実装しない。
- **PhaseGate 優先**: `docs/folder_management_rules.md` の AIDLC フェーズ順序を守る。実装前に必要な inception 成果物と product 反映を確認する。
- **既存設計尊重**: 変更対象と周辺コードを読み、既存の責務分割、命名、テスト粒度に合わせる。
- **最小変更**: 依頼された目的に必要な範囲だけを変更する。無関係なリファクタリングや先回りの抽象化をしない。
- **テストで証明**: 重要なふるまいは自動テストで確認する。手動確認だけで完了扱いにしない。

## アーキテクチャ境界

- ヘキサゴナルアーキテクチャと DDD の方針に従う。
- ドメイン層は外側の infrastructure / presentation に依存しない。
- UseCase は調整役とし、ビジネスルールは可能な限り Entity / Value Object / Aggregate に置く。
- Domain Service は、Entity / Value Object / Aggregate に自然に属さない複数概念のルールに限って使う。
- Port はアプリケーション境界を表し、外部 I/O の詳細は Adapter に閉じ込める。

## 変更スコープ

- 原則として対象 Unit と、その変更に必要な共有契約だけを触る。
- cross-cutting WI では `description.md` の `affects` を確認し、影響 Unit の product 反映を揃える。
- プロジェクトルート外のファイルは触らない。
- ユーザーや他作業者の未関連変更を戻さない。

## 作業順序

1. 関連する inception / product docs を確認する。
2. 変更対象と周辺コードを読む。
3. 必要なら先にテストを追加・更新する。
4. 最小実装でテストを通す。
5. 必要な検証コマンドを実行する。
6. 変更内容、検証結果、未検証事項を報告する。
