import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ShellWrapperAdapter } from '../../../fuse-hooks-engine/infrastructure/adapters/shell-wrapper-adapter.js';
import { DestructiveCommandList } from '../../../fuse-hooks-engine/domain/value-objects/destructive-command-list.js';

let tmpDir = '';

target('ShellWrapperAdapter', () => {
  afterEach(async () => {
    if (tmpDir !== '') {
      await fs.rm(tmpDir, { recursive: true, force: true });
      tmpDir = '';
    }
  });

  it('IT-HF-029 安全なコマンドを実行できること', async () => {
    // Arrange
    const sut = new ShellWrapperAdapter();
    // Act
    const actual = await sut.execute('echo hook', { failOnNonZero: true, timeout: 1000 });
    // Assert
    expect(actual.exitCode).toBe(0);
    expect(actual.stdout).toContain('hook');
    expect(typeof actual.stderr).toBe('string');
  });

  it('IT-HF-039 stderrが正しく返されること', async () => {
    // Arrange
    const sut = new ShellWrapperAdapter();
    // Act
    const actual = await sut.execute('echo error_output >&2', { failOnNonZero: false, timeout: 1000 });
    // Assert
    expect(actual.stderr).toContain('error_output');
  });

  context('破壊的コマンドブロック', () => {
    it('IT-HF-030 rm -rf がブロックされること', async () => {
      // Arrange
      const sut = new ShellWrapperAdapter();
      // Act & Assert
      await expect(
        sut.execute('rm -rf /', { failOnNonZero: true }),
      ).rejects.toThrow('Destructive command blocked');
    });

    it('IT-HF-031 git reset --hard がブロックされること', async () => {
      // Arrange
      const sut = new ShellWrapperAdapter();
      // Act & Assert
      await expect(
        sut.execute('git reset --hard', { failOnNonZero: true }),
      ).rejects.toThrow('Destructive command blocked');
    });

    it('IT-HF-032 通常のrmコマンドはパススルーされること', async () => {
      // Arrange
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'shell-wrapper-'));
      const dummyFile = path.join(tmpDir, 'dummy.txt');
      await fs.writeFile(dummyFile, 'test', 'utf8');
      const sut = new ShellWrapperAdapter();
      // Act
      const actual = await sut.execute(`rm "${dummyFile}"`, { failOnNonZero: true, timeout: 3000 });
      // Assert
      expect(actual.exitCode).toBe(0);
    });
  });

  context('カスタムDestructiveCommandList', () => {
    it('IT-HF-033 カスタムコマンドリストでブロックされること', async () => {
      // Arrange
      const customList = DestructiveCommandList.create([
        { command: 'docker', dangerousOptions: ['system prune'] },
      ])._unsafeUnwrap();
      const sut = new ShellWrapperAdapter({ destructiveCommandList: customList });
      // Act & Assert
      await expect(
        sut.execute('docker system prune -af', { failOnNonZero: true }),
      ).rejects.toThrow('Destructive command blocked');
    });

    it('IT-HF-034 カスタムリストにないコマンドはパススルーされること', async () => {
      // Arrange
      const customList = DestructiveCommandList.create([
        { command: 'docker', dangerousOptions: ['system prune'] },
      ])._unsafeUnwrap();
      const sut = new ShellWrapperAdapter({ destructiveCommandList: customList });
      // Act
      const actual = await sut.execute('echo safe', { failOnNonZero: true, timeout: 1000 });
      // Assert
      expect(actual.exitCode).toBe(0);
    });
  });

  context('ラッパースクリプト生成', () => {
    it('IT-HF-035 指定ディレクトリにラッパースクリプトが生成されること', async () => {
      // Arrange
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'shell-wrapper-'));
      const sut = new ShellWrapperAdapter();
      // Act
      const generated = await sut.generateWrappers(tmpDir);
      // Assert
      expect(generated.length).toBeGreaterThan(0);
      for (const scriptPath of generated) {
        const stat = await fs.stat(scriptPath);
        expect(stat.isFile()).toBe(true);
        // 実行権限を確認
        expect(stat.mode & 0o111).toBeGreaterThan(0);
      }
    });

    it('IT-HF-036 生成されたラッパーが破壊的コマンドをブロックすること', async () => {
      // Arrange
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'shell-wrapper-'));
      const sut = new ShellWrapperAdapter();
      await sut.generateWrappers(tmpDir);
      const rmWrapper = path.join(tmpDir, 'rm');
      // Act
      const content = await fs.readFile(rmWrapper, 'utf8');
      // Assert
      expect(content).toContain('HARNESS');
      expect(content).toContain('-rf');
    });
  });

  context('PATH override', () => {
    it('IT-HF-037 getModifiedPathがラッパーディレクトリを先頭に含むこと', () => {
      // Arrange
      const sut = new ShellWrapperAdapter();
      const wrapperDir = '/tmp/harness-wrappers';
      // Act
      const modified = sut.getModifiedPath(wrapperDir);
      // Assert
      expect(modified.startsWith(wrapperDir + path.delimiter)).toBe(true);
      expect(modified).toContain(process.env.PATH ?? '');
    });
  });

  context('failOnNonZero=false', () => {
    it('IT-HF-038 非ゼロ終了でもエラーにならずresultが返されること', async () => {
      // Arrange
      const sut = new ShellWrapperAdapter();
      // Act
      const actual = await sut.execute('exit 42', { failOnNonZero: false, timeout: 1000 });
      // Assert
      expect(actual.exitCode).toBe(42);
    });
  });

  context('タイムアウト', () => {
    it('IT-HF-072 タイムアウト時にエラーが発生すること', async () => {
      // Arrange
      const sut = new ShellWrapperAdapter();
      // Act & Assert
      await expect(
        sut.execute('sleep 10', { failOnNonZero: true, timeout: 100 }),
      ).rejects.toThrow();
    });

    it('IT-HF-073 failOnNonZero=trueで非ゼロ終了時にrejectされること', async () => {
      // Arrange
      const sut = new ShellWrapperAdapter();
      // Act & Assert
      await expect(
        sut.execute('exit 1', { failOnNonZero: true, timeout: 1000 }),
      ).rejects.toThrow();
    });
  });
});
