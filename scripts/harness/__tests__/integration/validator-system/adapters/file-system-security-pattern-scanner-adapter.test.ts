/**
 * @layer test
 * @unit validator-system
 * @story H08-02
 * @work-item-id WI-120
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { FileSystemSecurityPatternScannerAdapter } from '../../../../validator-system/infrastructure/adapters/file-system-security-pattern-scanner-adapter.js';
import { join } from 'node:path';

const FIXTURES_DIR = join(
  process.cwd(),
  'scripts/harness/__tests__/fixtures/validator-system'
);

target('FileSystemSecurityPatternScannerAdapter', () => {
  describe('scan', () => {
    context('セキュリティ問題のないファイル群の場合', () => {
      it('passed=trueかつfindings=[]が返る (IT-REPO-Security-001)', async () => {
        // Arrange
        const fixturePath = join(FIXTURES_DIR, 'secure-source.ts');
        const adapter = new FileSystemSecurityPatternScannerAdapter();

        // Act
        const actual = await adapter.scan([fixturePath]);

        // Assert
        expect(actual).toEqual({ passed: true, findings: [] });
      });
    });

    context('ハードコードされたAPIキーを含むファイルの場合', () => {
      it('passed=falseかつfindings[0].code.toString()="L3-001"が返る (IT-REPO-Security-002)', async () => {
        // Arrange
        const fixturePath = join(FIXTURES_DIR, 'insecure-source.ts');
        const adapter = new FileSystemSecurityPatternScannerAdapter();

        // Act
        const actual = await adapter.scan([fixturePath]);

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.findings[0].code.toString()).toBe('L3-001');
        expect(actual.findings[0].severity.toString()).toBe('error');
      });
    });

    context('複数ファイルにわたるスキャンの場合', () => {
      it('findings[0]のmessageに問題ファイルのパスが含まれる (IT-REPO-Security-003)', async () => {
        // Arrange
        const securePath = join(FIXTURES_DIR, 'secure-source.ts');
        const insecurePath = join(FIXTURES_DIR, 'insecure-source.ts');
        const adapter = new FileSystemSecurityPatternScannerAdapter();

        // Act
        const actual = await adapter.scan([insecurePath, securePath]);

        // Assert
        expect(actual.findings[0].message).toContain('insecure-source.ts');
      });
    });

    context('存在しないファイルパスを渡した場合', () => {
      it('エラーなく実行されfindings=[]が返る（ファイル読み取りエラーはスキップ） (IT-REPO-Security-004)', async () => {
        // Arrange
        const adapter = new FileSystemSecurityPatternScannerAdapter();

        // Act
        const actual = await adapter.scan(['/nonexistent/path/file.ts']);

        // Assert
        expect(actual).toEqual({ passed: true, findings: [] });
      });
    });

    context('代表的な token family を含むファイルの場合', () => {
      it('OpenAI/GitHub/AWS/npm/Slack を検出し、実値は出力しない (WI-120)', async () => {
        // Arrange
        const secretPath = join(FIXTURES_DIR, 'g5/security-token-families.fixture');
        const openai = 'sk-abcdefghijklmnopqrstuvwxyz123456';
        const github = 'ghp_abcdefghijklmnopqrstuvwxyz123456';
        const aws = 'AKIAABCDEFGHIJKLMNOP';
        const npm = 'npm_abcdefghijklmnopqrstuvwxyz123456';
        const slack = 'xoxb-' + 'FAKEFAKEFAKEFAKEFAKE';
        const adapter = new FileSystemSecurityPatternScannerAdapter();

        // Act
        const actual = await adapter.scan([secretPath]);

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.findings.map((finding) => finding.code.toString()).every((code) => code === 'L3-001')).toBe(true);
        expect(JSON.stringify(actual.findings)).not.toContain(openai);
        expect(JSON.stringify(actual.findings)).not.toContain(github);
        expect(JSON.stringify(actual.findings)).not.toContain(aws);
        expect(JSON.stringify(actual.findings)).not.toContain(npm);
        expect(JSON.stringify(actual.findings)).not.toContain(slack);
        expect(JSON.stringify(actual.findings)).toContain('secret.openai');
        expect(JSON.stringify(actual.findings)).toContain('secret.github');
        expect(JSON.stringify(actual.findings)).toContain('secret.aws-access-key');
        expect(JSON.stringify(actual.findings)).toContain('secret.npm');
        expect(JSON.stringify(actual.findings)).toContain('secret.slack');
      });
    });

    context('fixture allowlist marker を含む場合', () => {
      it('dummy token を findings から除外する (WI-120)', async () => {
        // Arrange
        const fixturePath = join(FIXTURES_DIR, 'g5/security-allowlisted.fixture');
        const adapter = new FileSystemSecurityPatternScannerAdapter();

        // Act
        const actual = await adapter.scan([fixturePath]);

        // Assert
        expect(actual).toEqual({ passed: true, findings: [] });
      });
    });

    context('allowlist marker が行/領域スコープの場合（whole-file skip 回帰）', () => {
      it('直前行にマーカーがある dummy は除外しつつ、離れた行の本物の秘密は検出する (WI-120)', async () => {
        // Arrange
        const fixturePath = join(FIXTURES_DIR, 'g5/security-scoped-allowlist.fixture');
        const dummy = 'sk-abcdefghijklmnopqrstuvwxyz123456';
        const realGithub = 'ghp_realrealrealrealrealrealreal12';
        const realAws = 'AKIAABCDEFGHIJKLMNOP';
        const adapter = new FileSystemSecurityPatternScannerAdapter();

        // Act
        const actual = await adapter.scan([fixturePath]);

        // Assert: 直前行にマーカーのある dummy はスキップされるが、マーカー非隣接の
        // 本物の秘密（github/aws）は検出される。以前はファイル全体がスキップされ
        // これらが検出漏れしていた。
        expect(actual.passed).toBe(false);
        const messages = actual.findings.map((finding) => finding.message).join('\n');
        expect(messages).toContain('secret.github');
        expect(messages).toContain('secret.aws-access-key');
        expect(actual.findings.some((finding) => finding.message.includes('secret.openai'))).toBe(false);
        // 実値そのものは redact され出力されない
        const serialized = JSON.stringify(actual.findings);
        expect(serialized).not.toContain(dummy);
        expect(serialized).not.toContain(realGithub);
        expect(serialized).not.toContain(realAws);
      });
    });
  });
});
