// @layer test
// @story H07-01
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { MatrixValidationService } from '../../../nyquist-validation/domain/services/matrix-validation-service.js';

// StoryRegistryPort モックファクトリ
const createStoryRegistryPort = (validStoryIds: string[]) => ({
  getValidStoryIds: vi.fn().mockResolvedValue(validStoryIds),
  findAllStoryIds: vi.fn().mockResolvedValue(validStoryIds),
});

target('MatrixValidationService', () => {

  describe('storyId整合性テスト', () => {
    // UT-MVS-001
    it('validStoryIds=["H07-01"] で rawData の storyId="H07-01" のとき passed=true、validatedData=rawData が返されること', async () => {
      // Arrange
      const port = createStoryRegistryPort(['H07-01']);
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = { storyMappings: [{ storyId: 'H07-01', acMappings: [] }] };
      // Act
      const actual = await sut.validate(rawData);
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.validatedData).not.toBeNull();
    });

    // UT-MVS-002
    it('validStoryIds=["H07-01"] で rawData の storyId="H07-99"（未登録）のとき passed=false、errors に H07-99未登録の HarnessError が含まれること', async () => {
      // Arrange
      const port = createStoryRegistryPort(['H07-01']);
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = { storyMappings: [{ storyId: 'H07-99', acMappings: [] }] };
      // Act
      const actual = await sut.validate(rawData);
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors).toHaveLength(1);
    });

    // UT-MVS-003
    it('validStoryIds=["H07-01","H07-02"] で rawData に両方のstoryIdが含まれるとき passed=true が返されること', async () => {
      // Arrange
      const port = createStoryRegistryPort(['H07-01', 'H07-02']);
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = {
        storyMappings: [
          { storyId: 'H07-01', acMappings: [] },
          { storyId: 'H07-02', acMappings: [] },
        ],
      };
      // Act
      const actual = await sut.validate(rawData);
      // Assert
      expect(actual.passed).toBe(true);
    });

    // UT-MVS-004
    it('validStoryIds=[]（空） で rawData の storyId="H07-01" のとき passed=false、errors が 1件であること', async () => {
      // Arrange
      const port = createStoryRegistryPort([]);
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = { storyMappings: [{ storyId: 'H07-01', acMappings: [] }] };
      // Act
      const actual = await sut.validate(rawData);
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors).toHaveLength(1);
    });
  });

  describe('複数エラー収集テスト', () => {
    // UT-MVS-005
    it('validStoryIds=["H07-01"] で rawData に "H07-02","H07-03"（未登録2件）がある場合 passed=false、errors が 2件であること', async () => {
      // Arrange
      const port = createStoryRegistryPort(['H07-01']);
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = {
        storyMappings: [
          { storyId: 'H07-02', acMappings: [] },
          { storyId: 'H07-03', acMappings: [] },
        ],
      };
      // Act
      const actual = await sut.validate(rawData);
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors).toHaveLength(2);
    });
  });

  describe('不変条件テスト', () => {
    // UT-MVS-006
    it('passed=true のとき validatedData が非null であること', async () => {
      // Arrange
      const port = createStoryRegistryPort(['H07-01']);
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = { storyMappings: [{ storyId: 'H07-01', acMappings: [] }] };
      // Act
      const actual = await sut.validate(rawData);
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.validatedData).not.toBeNull();
    });

    // UT-MVS-007
    it('passed=false のとき validatedData が null であること', async () => {
      // Arrange
      const port = createStoryRegistryPort(['H07-01']);
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = { storyMappings: [{ storyId: 'H07-99', acMappings: [] }] };
      // Act
      const actual = await sut.validate(rawData);
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.validatedData).toBeNull();
    });
  });

  describe('スキーマ準拠 stories 形式テスト（回帰: 旧実装は no-op だった）', () => {
    // UT-MVS-009
    it('スキーマ準拠の stories 形式で未登録 storyId="H07-99" があるとき passed=false、errors が1件返ること', async () => {
      // Arrange
      const port = createStoryRegistryPort(['H07-01']);
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = {
        version: '1.0',
        generatedAt: '2026-07-04T00:00:00.000Z',
        stories: [{ storyId: 'H07-99', storyMappings: [] }],
      };
      // Act
      const actual = await sut.validate(rawData);
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors).toHaveLength(1);
      expect(actual.errors[0].message).toContain('H07-99');
    });

    // UT-MVS-010
    it('スキーマ準拠の stories 形式ですべて登録済みなら passed=true が返ること', async () => {
      // Arrange
      const port = createStoryRegistryPort(['H07-01']);
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = {
        version: '1.0',
        generatedAt: '2026-07-04T00:00:00.000Z',
        stories: [{ storyId: 'H07-01', storyMappings: [] }],
      };
      // Act
      const actual = await sut.validate(rawData);
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.validatedData).not.toBeNull();
    });

    // UT-MVS-011
    it('HF2-01 形式の storyId が有効一覧に登録済みなら passed=true が返ること', async () => {
      // Arrange
      const port = createStoryRegistryPort(['HF2-01']);
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = {
        version: '1.0',
        generatedAt: '2026-07-04T00:00:00.000Z',
        stories: [{ storyId: 'HF2-01', storyMappings: [] }],
      };
      // Act
      const actual = await sut.validate(rawData);
      // Assert
      expect(actual.passed).toBe(true);
    });
  });

  describe('INV-1 storyId 重複検出テスト', () => {
    // UT-MVS-012
    it('同一 storyId="H07-01" が2件存在するとき passed=false、重複エラーが含まれること', async () => {
      // Arrange
      const port = createStoryRegistryPort(['H07-01']);
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = {
        version: '1.0',
        generatedAt: '2026-07-04T00:00:00.000Z',
        stories: [
          { storyId: 'H07-01', storyMappings: [] },
          { storyId: 'H07-01', storyMappings: [] },
        ],
      };
      // Act
      const actual = await sut.validate(rawData);
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors.some((e) => e.message.includes('重複'))).toBe(true);
    });
  });

  describe('StoryRegistryPort エラー伝播テスト', () => {
    // UT-MVS-008
    it('StoryRegistryPort が例外をthrow するとき validate がその例外をそのまま上位に伝播すること', async () => {
      // Arrange
      const port = {
        getValidStoryIds: vi.fn().mockRejectedValue(new Error('ポート接続エラー')),
        findAllStoryIds: vi.fn().mockRejectedValue(new Error('ポート接続エラー')),
      };
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = { storyMappings: [{ storyId: 'H07-01', acMappings: [] }] };
      // Act
      const actual = () => sut.validate(rawData);
      // Assert
      await expect(actual()).rejects.toThrow('ポート接続エラー');
    });
  });
});
