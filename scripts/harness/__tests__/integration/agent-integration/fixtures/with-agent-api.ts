// @ts-ignore — このファイルはimport解析テスト用フィクスチャです。パッケージは意図的に未インストール
import { query } from '@anthropic-ai/claude-code';

export async function runQuery(prompt: string): Promise<unknown> {
  return query({ prompt });
}
