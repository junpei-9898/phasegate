// @story H10-02
// @unit quick-mode
// @layer integration
// @work-item-id WI-220
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SnapshotRiskAdvisoryAdapter } from '../../../quick-mode/infrastructure/adapters/snapshot-risk-advisory-adapter.js';
import { runInCwd } from '../../e2e/cli-test-helpers.js';

async function assess(beforeContent: string | null, afterContent: string | null) {
  const root = await mkdtemp(join(tmpdir(), 'phasegate-risk-'));
  try {
    await writeFile(join(root, 'snapshots.json'), JSON.stringify([{ filePath: 'src/change.ts', beforeContent, afterContent }]));
    return await new SnapshotRiskAdvisoryAdapter(root).assess(['src/change.ts'], 'snapshots.json');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('snapshotから得られるリスク助言', () => {
  it.each([
    ['method引数', 'export class Cache { read(key: string): string { return key; } }', 'export class Cache { read(key: number): string { return String(key); } }'],
    ['method返却値', 'export class Cache { read(): string { return "x"; } }', 'export class Cache { read(): number { return 1; } }'],
    ['property型', 'export class Cache { value: string = "x"; }', 'export class Cache { value: number = 1; }'],
    ['constructor引数', 'export class Cache { constructor(key: string) {} }', 'export class Cache { constructor(key: number) {} }'],
    ['継承', 'export class Cache extends Reader {}', 'export class Cache extends Writer {}'],
  ])('classの%s変更を宣言差分候補として検出すること', async (_label, before, after) => {
    const actual = await assess(before, after);
    expect(actual[0]).toMatchObject({ kind: 'module-surface-change', enforcement: 'none' });
  });

  it.each([
    ['export class Access { allow(role: string): boolean { return role === "admin"; } }', 'export class Access { allow(role: string): boolean { return true; } }'],
    ['export class Cache { value: string = "old"; }', 'export class Cache { value: string = "new"; }'],
  ])('classの宣言が同じでも本文の安全性を認定しないこと（%s）', async (before, after) => {
    const actual = await assess(before, after);
    expect(actual[0]).toMatchObject({ kind: 'behavior-review', enforcement: 'none' });
  });

  it.each([
    '@sealed export class Cache { read(): string { return "x"; } }',
    'export class Cache { read(key: string = "x"): string { return key; } }',
    'export class Cache { get value(): string { return "x"; } }',
  ])('未対応class構文を安全と判定しないこと（%s）', async content => {
    const actual = await assess(content, content.replaceAll('"x"', '"y"'));
    expect(actual[0]).toMatchObject({ kind: 'unknown', enforcement: 'none' });
  });
  it('ラベル付きcorpusの契約差分と本文変更を区別し内部実装の未判定を残すこと', async () => {
    const samples = JSON.parse(await readFile(new URL('../../fixtures/wi-220/semantic-risk-corpus.json', import.meta.url), 'utf8')) as Array<{
      id: string; path: string; before: string | null; after: string | null;
    }>;
    const root = await mkdtemp(join(tmpdir(), 'phasegate-risk-corpus-'));
    try {
      await writeFile(join(root, 'snapshots.json'), JSON.stringify(samples.map((sample) => ({
        filePath: sample.path, beforeContent: sample.before, afterContent: sample.after,
      }))));
      const actual = await new SnapshotRiskAdvisoryAdapter(root).assess(samples.map((sample) => sample.path), 'snapshots.json');
      expect(Object.fromEntries(actual.map((advice, index) => [samples[index].id, advice.kind]))).toEqual({
        'internal-extraction': 'behavior-review',
        'internal-adapter-change': 'behavior-review',
        'internal-adapter-addition': 'unknown',
        'public-signature': 'module-surface-change',
        authorization: 'behavior-review',
        'business-invariant': 'behavior-review',
        'persisted-format': 'behavior-review',
        'missing-content': 'unknown',
      });
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it('不正なsnapshot形式を空の成功に置換しないこと', async () => {
    const root = await mkdtemp(join(tmpdir(), 'phasegate-risk-invalid-'));
    try {
      await writeFile(join(root, 'snapshots.json'), JSON.stringify([{ filePath: 'src/a.ts', beforeContent: 42 }]));
      const actual = new SnapshotRiskAdvisoryAdapter(root).assess(['src/a.ts'], 'snapshots.json');
      await expect(actual).rejects.toThrow('Risk snapshots must be an array');
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it('対象が欠ける場合や重複する場合に都合のよい一件を採用しないこと', async () => {
    const root = await mkdtemp(join(tmpdir(), 'phasegate-risk-'));
    try {
      const item = { filePath: 'src/a.ts', beforeContent: 'a', afterContent: 'a' };
      await writeFile(join(root, 'snapshots.json'), JSON.stringify([item, item]));
      const actual = await new SnapshotRiskAdvisoryAdapter(root).assess(['src/a.ts', 'src/missing.ts'], 'snapshots.json');
      expect(actual.map((advice) => ({ path: advice.path, kind: advice.kind, before: advice.beforeHash }))).toEqual([
        { path: 'src/a.ts', kind: 'unknown', before: null },
        { path: 'src/missing.ts', kind: 'unknown', before: null },
      ]);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it.each(['client.ts', 'cache-adapter.ts'])('助言の有無で既存CLI分類と終了コードを変更しないこと（%s）', async (file) => {
    const root = await mkdtemp(join(tmpdir(), 'phasegate-risk-cli-'));
    try {
      const initialized = runInCwd(root, 'init', '--name', 'risk-advice');
      expect(initialized.exitCode, initialized.stderr).toBe(0);
      await mkdir(join(root, 'src'));
      const before = 'export function read(id: string): string { return id; }';
      const after = 'export function read(id: number): string { return String(id); }';
      await writeFile(join(root, 'src', file), after);
      await writeFile(join(root, 'snapshots.json'), JSON.stringify([{ filePath: `src/${file}`, beforeContent: before, afterContent: after }]));
      const args = ['check-change-category', '--paths', `src/${file}`, '--format', 'json', '--fail-on-full-required'];
      const baseline = runInCwd(root, ...args);

      const actual = runInCwd(root, ...args, '--risk-snapshots', 'snapshots.json');

      expect(actual.exitCode, actual.stderr).toBe(baseline.exitCode);
      expect(baseline.exitCode).toBe(file === 'client.ts' ? 0 : 1);
      const { riskAdvice, ...classification } = JSON.parse(actual.stdout);
      expect(classification).toEqual(JSON.parse(baseline.stdout));
      expect(JSON.parse(baseline.stdout)).not.toHaveProperty('riskAdvice');
      expect(riskAdvice).toEqual([expect.objectContaining({ kind: 'module-surface-change', enforcement: 'none' })]);
    } finally { await rm(root, { recursive: true, force: true }); }
  }, 30000);
  it('公開関数の引数変更をmodule契約差分候補として返すこと', async () => {
    const actual = await assess('export function read(id: string): string { return id; }', 'export function read(id: number): string { return String(id); }');
    expect(actual[0]).toMatchObject({ path: 'src/change.ts', kind: 'module-surface-change', source: 'caller-snapshot', enforcement: 'none' });
    expect(actual[0].beforeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(actual[0].beforeHash).not.toBe(actual[0].afterHash);
    expect(JSON.stringify(actual)).not.toContain('return String');
  });
  it('signature不変の認可変更も安全と認定せず本文レビューを案内すること', async () => {
    const actual = await assess("export function allow(role: string): boolean { return role === 'admin'; }", 'export function allow(role: string): boolean { return true; }');
    expect(actual[0].kind).toBe('behavior-review');
    expect(actual[0].reason).toContain('authorization');
    expect(actual[0].enforcement).toBe('none');
  });
  it('内部抽出の意味同値性を推測で承認しないこと', async () => {
    const actual = await assess('export function run(x: string): string { return x.trim(); }', 'const clean = (x: string) => x.trim(); export function run(x: string): string { return clean(x); }');
    expect(actual[0].kind).toBe('behavior-review');
  });
  it.each([
    ['export interface Port { read(): string; }', 'export interface Port { read(): number; }'],
    ['export type Id = string;', 'export type Id = number;'],
  ])('宣言された型契約の差分を検出すること（%s）', async (before, after) => {
    const actual = await assess(before, after);
    expect(actual[0].kind).toBe('module-surface-change');
  });
  it.each([
    [null, 'export const added = 1;'],
    ['export const removed = 1;', null],
    ['export function inferred() { return 1; }', 'export function inferred() { return "one"; }'],
    ['export class Item {}', 'export class Item { value = 1; }'],
    ['export function broken(', 'export function broken() {}'],
  ])('未対応または不完全な情報を安全と判定しないこと（%s）', async (before, after) => {
    const actual = await assess(before, after);
    expect(actual[0]).toMatchObject({ kind: 'unknown', enforcement: 'none' });
  });
  it('完全同文は比較範囲内の変更なしとし承認とは区別すること', async () => {
    const actual = await assess('export const value = 1;', 'export const value = 1;');
    expect(actual[0]).toMatchObject({ kind: 'no-content-change', source: 'caller-snapshot', enforcement: 'none' });
    expect(actual[0].beforeHash).toBe(actual[0].afterHash);
  });
});
