import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import {
  ADR,
  InvalidAdrStatusTransitionError,
  MalformedAdrDocumentError,
  SelfSupersedeNotAllowedError,
} from '../../../adr-foundation/domain/aggregates/adr.js';
import { AdrId } from '../../../adr-foundation/domain/value-objects/adr-id.js';
import { AdrStatus } from '../../../adr-foundation/domain/value-objects/adr-status.js';
import { AdrBodySectionRequiredError } from '../../../adr-foundation/domain/value-objects/adr-body.js';
import {
  AdrValidationError,
} from '../../../adr-foundation/domain/value-objects/adr-frontmatter.js';
import { InvalidArchgateErrorCodeError } from '../../../adr-foundation/domain/value-objects/archgate-entry.js';
import { DuplicateArchgateEntryError } from '../../../adr-foundation/domain/value-objects/archgate-mapping.js';
import { AdrValidationService } from '../../../adr-foundation/domain/services/adr-validation-service.js';

const createAdrId = (value = '001'): AdrId => AdrId.create(value);
const createAdrStatus = (value = 'Proposed'): AdrStatus => AdrStatus.create(value);
const createValidationService = (): AdrValidationService => new AdrValidationService();

const buildArchgatePrimitives = (
  overrides?: Partial<{
    adr_id: string;
    enforced_by: Array<{ validator_id: string; error_code: string }>;
  }>,
) => ({
  adr_id: overrides?.adr_id ?? '001',
  enforced_by:
    overrides?.enforced_by ?? [{ validator_id: 'phase-gate', error_code: 'L1-001' }],
});

const buildFrontmatterPrimitives = (
  overrides?: Partial<{
    adr_id: string;
    title: string;
    status: string;
    date: string;
    superseded_by: string;
    archgate: {
      adr_id?: string;
      enforced_by: Array<{ validator_id: string; error_code: string }>;
    };
  }>,
) => ({
  adr_id: overrides?.adr_id ?? '001',
  title: overrides?.title ?? 'Package Separation',
  status: overrides?.status ?? 'Proposed',
  date: overrides?.date ?? '2026-03-13',
  superseded_by: overrides?.superseded_by,
  archgate: overrides?.archgate,
});

const buildBodyPrimitives = (
  overrides?: Partial<{
    context: string;
    decision: string;
    consequences: string;
    alternatives?: string;
  }>,
) => ({
  context: overrides?.context ?? '背景',
  decision: overrides?.decision ?? '判断',
  consequences: overrides?.consequences ?? '結果',
  alternatives: overrides?.alternatives,
});

const buildMalformedAdrDocument = (
  overrides?: Partial<{
    frontmatter: ReturnType<typeof buildFrontmatterPrimitives>;
    body: ReturnType<typeof buildBodyPrimitives>;
  }>,
) => ({
  frontmatter: overrides?.frontmatter ?? buildFrontmatterPrimitives(),
  body: overrides?.body ?? buildBodyPrimitives(),
});

const createAdrAggregate = (
  overrides?: Partial<{
    adrId: string;
    status: string;
    superseded_by: string;
    archgate: {
      adr_id?: string;
      enforced_by: Array<{ validator_id: string; error_code: string }>;
    };
  }>,
): ADR =>
  ADR.create(
    buildFrontmatterPrimitives({
      adr_id: overrides?.adrId ?? '001',
      status: overrides?.status ?? 'Proposed',
      superseded_by: overrides?.superseded_by,
      archgate: overrides?.archgate,
    }),
    buildBodyPrimitives(),
    createValidationService(),
  );

target('ADR', () => {
  target('createとreconstitute', () => {
    // UT-AF-001
    context('正常なfrontmatterとbodyを渡す場合', () => {
      it('ADR集約が生成されること', () => {
        // Arrange
        const frontmatter = buildFrontmatterPrimitives();
        const body = buildBodyPrimitives();
        const service = createValidationService();

        // Act
        const actual = ADR.create(frontmatter, body, service);

        // Assert
        expect(actual.getFrontmatter().toPrimitives()).toEqual(frontmatter);
        expect(actual.getBody().toSectionMap()).toEqual({
          Context: '背景',
          Decision: '判断',
          Consequences: '結果',
          Alternatives: undefined,
        });
      });
    });

    // UT-AF-002
    context('archgate付きfrontmatterを渡す場合', () => {
      it('archgateを保持したADR集約が生成されること', () => {
        // Arrange
        const frontmatter = buildFrontmatterPrimitives({
          archgate: buildArchgatePrimitives(),
        });
        const body = buildBodyPrimitives();
        const service = createValidationService();

        // Act
        const actual = ADR.create(frontmatter, body, service);

        // Assert
        expect(actual.getArchgate()?.toPrimitives()).toEqual({
          enforced_by: [{ validator_id: 'phase-gate', error_code: 'L1-001' }],
        });
      });
    });

    // UT-AF-003
    context('不正なfrontmatterを渡す場合', () => {
      it('妥当性エラーが発生すること', () => {
        // Arrange
        const frontmatter = buildFrontmatterPrimitives({ title: '' });
        const body = buildBodyPrimitives();
        const service = createValidationService();

        // Act
        const actual = () => ADR.create(frontmatter, body, service);

        // Assert
        expect(actual).toThrowError(AdrValidationError);
      });
    });

    // UT-AF-004
    context('必須セクションが欠けたbodyを渡す場合', () => {
      it('本文必須セクションエラーが発生すること', () => {
        // Arrange
        const frontmatter = buildFrontmatterPrimitives();
        const body = buildBodyPrimitives({ decision: '' });
        const service = createValidationService();

        // Act
        const actual = () => ADR.create(frontmatter, body, service);

        // Assert
        expect(actual).toThrowError(AdrBodySectionRequiredError);
      });
    });

    // UT-AF-005
    context('不正なerror_codeを含むarchgateを渡す場合', () => {
      it('error_code形式エラーが発生すること', () => {
        // Arrange
        const frontmatter = buildFrontmatterPrimitives({
          archgate: buildArchgatePrimitives({
            enforced_by: [{ validator_id: 'phase-gate', error_code: 'X1-001' }],
          }),
        });
        const body = buildBodyPrimitives();
        const service = createValidationService();

        // Act
        const actual = () => ADR.create(frontmatter, body, service);

        // Assert
        expect(actual).toThrowError(InvalidArchgateErrorCodeError);
      });
    });

    // UT-AF-006
    context('重複エントリを含むarchgateを渡す場合', () => {
      it('重複エラーが発生すること', () => {
        // Arrange
        const frontmatter = buildFrontmatterPrimitives({
          archgate: buildArchgatePrimitives({
            enforced_by: [
              { validator_id: 'phase-gate', error_code: 'L1-001' },
              { validator_id: 'phase-gate', error_code: 'L1-001' },
            ],
          }),
        });
        const body = buildBodyPrimitives();
        const service = createValidationService();

        // Act
        const actual = () => ADR.create(frontmatter, body, service);

        // Assert
        expect(actual).toThrowError(DuplicateArchgateEntryError);
      });
    });

    // UT-AF-007
    context('正常な永続化済み文書を再構築する場合', () => {
      it('ADR参照形式で復元できること', () => {
        // Arrange
        const document = buildMalformedAdrDocument();
        const service = createValidationService();

        // Act
        const actual = ADR.reconstitute(document, service);

        // Assert
        expect(actual.toAdrRef()).toBe('ADR-001');
        expect(actual.getFrontmatter().toPrimitives()).toEqual(document.frontmatter);
      });
    });

    // UT-AF-008
    context('不正文書を再構築する場合', () => {
      it('不正文書エラーが発生すること', () => {
        // Arrange
        const document = buildMalformedAdrDocument({
          frontmatter: buildFrontmatterPrimitives({ status: 'Invalid' }),
        });
        const service = createValidationService();

        // Act
        const actual = () => ADR.reconstitute(document, service);

        // Assert
        expect(actual).toThrowError(MalformedAdrDocumentError);
      });
    });
  });

  target('状態遷移', () => {
    // UT-AF-009
    context('Proposedを承認する場合', () => {
      it('Acceptedへ遷移した新しい集約が返ること', () => {
        // Arrange
        const sut = createAdrAggregate({ status: 'Proposed' });

        // Act
        const actual = sut.approve();

        // Assert
        expect(actual.getStatus().equals(createAdrStatus('Accepted'))).toBe(true);
        expect(sut.getStatus().equals(createAdrStatus('Proposed'))).toBe(true);
      });
    });

    // UT-AF-010, UT-AF-011, UT-AF-012
    context('承認できないステータスからapproveする場合', () => {
      it('状態遷移エラーが発生すること', () => {
        // Arrange
        const inputs = ['Accepted', 'Deprecated', 'Superseded'] as const;

        // Act
        const actual = () => {
          for (const input of inputs) {
            createAdrAggregate({
              status: input,
              superseded_by: input === 'Superseded' ? 'ADR-002' : undefined,
            }).approve();
          }
        };

        // Assert
        expect(actual).toThrowError(InvalidAdrStatusTransitionError);
      });
    });

    // UT-AF-015, UT-AF-016
    context('非推奨化できないステータスからdeprecateする場合', () => {
      it('状態遷移エラーが発生すること', () => {
        // Arrange
        const inputs = [
          { status: 'Superseded', superseded_by: 'ADR-002' },
          { status: 'Deprecated' },
        ] as const;

        // Act
        const actual = () => {
          for (const input of inputs) {
            createAdrAggregate(input).deprecate();
          }
        };

        // Assert
        expect(actual).toThrowError(InvalidAdrStatusTransitionError);
      });
    });

    // UT-AF-017
    context('Acceptedを他ADRで置き換える場合', () => {
      it('Supersededへ遷移し後継参照を持つこと', () => {
        // Arrange
        const sut = createAdrAggregate({ status: 'Accepted' });
        const nextAdrId = createAdrId('002');

        // Act
        const actual = sut.supersede(nextAdrId);

        // Assert
        expect(actual.getStatus().equals(createAdrStatus('Superseded'))).toBe(true);
        expect(actual.getFrontmatter().toPrimitives().superseded_by).toBe('ADR-002');
      });
    });

    // UT-AF-018
    context('自分自身を後継に指定する場合', () => {
      it('自己置換エラーが発生すること', () => {
        // Arrange
        const sut = createAdrAggregate({ adrId: '001', status: 'Accepted' });
        const sameAdrId = createAdrId('001');

        // Act
        const actual = () => sut.supersede(sameAdrId);

        // Assert
        expect(actual).toThrowError(SelfSupersedeNotAllowedError);
      });
    });

    // UT-AF-019, UT-AF-020, UT-AF-021
    context('置換できないステータスからsupersedeする場合', () => {
      it('状態遷移エラーが発生すること', () => {
        // Arrange
        const inputs = [
          { status: 'Proposed' },
          { status: 'Deprecated' },
          { status: 'Superseded', superseded_by: 'ADR-002' },
        ] as const;

        // Act
        const actual = () => {
          for (const input of inputs) {
            createAdrAggregate(input).supersede(createAdrId('002'));
          }
        };

        // Assert
        expect(actual).toThrowError(InvalidAdrStatusTransitionError);
      });
    });

    // UT-AF-023, UT-AF-024, UT-AF-025
    context('再提案できないステータスからreproposeする場合', () => {
      it('状態遷移エラーが発生すること', () => {
        // Arrange
        const inputs = [
          { status: 'Accepted' },
          { status: 'Proposed' },
          { status: 'Superseded', superseded_by: 'ADR-002' },
        ] as const;

        // Act
        const actual = () => {
          for (const input of inputs) {
            createAdrAggregate(input).repropose();
          }
        };

        // Assert
        expect(actual).toThrowError(InvalidAdrStatusTransitionError);
      });
    });
  });

  target('更新と参照', () => {
    // UT-AF-026
    context('本文を更新する場合', () => {
      it('新しい本文を保持した集約が返ること', () => {
        // Arrange
        const sut = createAdrAggregate();
        const newBody = buildBodyPrimitives({ decision: 'new decision' });

        // Act
        const actual = sut.updateBody(newBody);

        // Assert
        expect(actual.getBody().decision).toBe('new decision');
      });
    });

    // UT-AF-027
    context('不正な本文へ更新する場合', () => {
      it('本文必須セクションエラーが発生すること', () => {
        // Arrange
        const sut = createAdrAggregate();
        const newBody = buildBodyPrimitives({ consequences: '' });

        // Act
        const actual = () => sut.updateBody(newBody);

        // Assert
        expect(actual).toThrowError(AdrBodySectionRequiredError);
      });
    });

    // UT-AF-028
    context('archgateを正常な値へ置き換える場合', () => {
      it('新しいarchgateを保持すること', () => {
        // Arrange
        const sut = createAdrAggregate();
        const newArchgate = buildArchgatePrimitives();

        // Act
        const actual = sut.replaceArchgate(newArchgate);

        // Assert
        expect(actual.getArchgate()?.toPrimitives()).toEqual({
          enforced_by: [{ validator_id: 'phase-gate', error_code: 'L1-001' }],
        });
      });
    });

    // UT-AF-029
    context('archgateを解除する場合', () => {
      it('archgateがundefinedになること', () => {
        // Arrange
        const sut = createAdrAggregate({
          archgate: buildArchgatePrimitives(),
        });

        // Act
        const actual = sut.replaceArchgate(undefined);

        // Assert
        expect(actual.getArchgate()).toBeUndefined();
      });
    });

    // UT-AF-030
    context('不正なerror_codeを含むarchgateへ置き換える場合', () => {
      it('error_code形式エラーが発生すること', () => {
        // Arrange
        const sut = createAdrAggregate();
        const archgate = buildArchgatePrimitives({
          enforced_by: [{ validator_id: 'phase-gate', error_code: 'X1-001' }],
        });

        // Act
        const actual = () => sut.replaceArchgate(archgate);

        // Assert
        expect(actual).toThrowError(InvalidArchgateErrorCodeError);
      });
    });

    // UT-AF-031
    context('重複エントリを含むarchgateへ置き換える場合', () => {
      it('重複エラーが発生すること', () => {
        // Arrange
        const sut = createAdrAggregate();
        const archgate = buildArchgatePrimitives({
          enforced_by: [
            { validator_id: 'phase-gate', error_code: 'L1-001' },
            { validator_id: 'phase-gate', error_code: 'L1-001' },
          ],
        });

        // Act
        const actual = () => sut.replaceArchgate(archgate);

        // Assert
        expect(actual).toThrowError(DuplicateArchgateEntryError);
      });
    });

    // UT-AF-033
    context('archgate付きADRからarchgateを取得する場合', () => {
      it('ArchgateMapping実体を返すこと', () => {
        // Arrange
        const sut = createAdrAggregate({
          archgate: buildArchgatePrimitives(),
        });

        // Act
        const actual = sut.getArchgate();

        // Assert
        expect(actual).toBeDefined();
      });
    });

    // UT-AF-034
    context('archgateなしADRからarchgateを取得する場合', () => {
      it('undefinedを返すこと', () => {
        // Arrange
        const sut = createAdrAggregate();

        // Act
        const actual = sut.getArchgate();

        // Assert
        expect(actual).toBeUndefined();
      });
    });

    // UT-AF-035
    context('frontmatterを取得する場合', () => {
      it('AdrFrontmatter実体を返すこと', () => {
        // Arrange
        const sut = createAdrAggregate();

        // Act
        const actual = sut.getFrontmatter();

        // Assert
        expect(actual.title).toBe('Package Separation');
      });
    });

    // UT-AF-036
    context('bodyを取得する場合', () => {
      it('AdrBody実体を返すこと', () => {
        // Arrange
        const sut = createAdrAggregate();

        // Act
        const actual = sut.getBody();

        // Assert
        expect(actual.context).toBe('背景');
      });
    });

    // UT-AF-037
    context('ADR参照へ変換する場合', () => {
      it('ADR-001形式を返すこと', () => {
        // Arrange
        const sut = createAdrAggregate({ adrId: '001' });

        // Act
        const actual = sut.toAdrRef();

        // Assert
        expect(actual).toBe('ADR-001');
      });
    });
  });
});
