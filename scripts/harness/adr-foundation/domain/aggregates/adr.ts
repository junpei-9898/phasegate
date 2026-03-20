/**
 * @layer domain
 * @unit adr-foundation
 */
import { AdrValidationService } from '../services/adr-validation-service.js';
import { AdrBody, type AdrBodyProps } from '../value-objects/adr-body.js';
import {
  AdrFrontmatter,
  InvalidAdrStatusTransitionError,
  type AdrFrontmatterProps,
} from '../value-objects/adr-frontmatter.js';
import { AdrId } from '../value-objects/adr-id.js';
import { AdrStatus } from '../value-objects/adr-status.js';
import {
  ArchgateMapping,
  type ArchgateMappingProps,
} from '../value-objects/archgate-mapping.js';
import { SupersededByRef } from '../value-objects/superseded-by-ref.js';

export { InvalidAdrStatusTransitionError } from '../value-objects/adr-frontmatter.js';

export class MalformedAdrDocumentError extends Error {
  constructor(cause: unknown) {
    const message = cause instanceof Error ? cause.message : 'Unknown ADR document error';
    super(`ADR文書を再構築できません: ${message}`);
    this.name = 'MalformedAdrDocumentError';
  }
}

export class SelfSupersedeNotAllowedError extends Error {
  constructor(adrRef: string) {
    super(`自分自身を superseded_by に指定できません: ${adrRef}`);
    this.name = 'SelfSupersedeNotAllowedError';
  }
}

type AdrDocument = Readonly<{
  frontmatter: AdrFrontmatter | AdrFrontmatterProps;
  body: AdrBody | AdrBodyProps;
}>;

export class ADR {
  readonly id: AdrId;
  private readonly frontmatter: AdrFrontmatter;
  private readonly body: AdrBody;
  private readonly validationService: AdrValidationService;

  private constructor(
    frontmatter: AdrFrontmatter,
    body: AdrBody,
    validationService: AdrValidationService,
  ) {
    this.id = frontmatter.adrId;
    this.frontmatter = frontmatter;
    this.body = body;
    this.validationService = validationService;
    Object.freeze(this);
  }

  static create(
    frontmatter: AdrFrontmatter | AdrFrontmatterProps,
    body: AdrBody | AdrBodyProps,
    validationService: AdrValidationService,
  ): ADR {
    const resolvedFrontmatter =
      frontmatter instanceof AdrFrontmatter ? frontmatter : AdrFrontmatter.create(frontmatter);
    const resolvedBody = body instanceof AdrBody ? body : AdrBody.create(body);

    validationService.validateFrontmatter(resolvedFrontmatter);
    validationService.validateBody(resolvedBody);

    return new ADR(resolvedFrontmatter, resolvedBody, validationService);
  }

  static reconstitute(
    document: AdrDocument,
    validationService: AdrValidationService,
  ): ADR;
  static reconstitute(
    frontmatter: AdrFrontmatter | AdrFrontmatterProps,
    body: AdrBody | AdrBodyProps,
    validationService: AdrValidationService,
  ): ADR;
  static reconstitute(
    frontmatterOrDocument: AdrDocument | AdrFrontmatter | AdrFrontmatterProps,
    bodyOrService: AdrValidationService | AdrBody | AdrBodyProps,
    maybeValidationService?: AdrValidationService,
  ): ADR {
    try {
      if (maybeValidationService) {
        return ADR.create(
          frontmatterOrDocument as AdrFrontmatter | AdrFrontmatterProps,
          bodyOrService as AdrBody | AdrBodyProps,
          maybeValidationService,
        );
      }

      const document = frontmatterOrDocument as AdrDocument;
      return ADR.create(document.frontmatter, document.body, bodyOrService as AdrValidationService);
    } catch (error) {
      throw new MalformedAdrDocumentError(error);
    }
  }

  approve(): ADR {
    return this.withFrontmatter(this.frontmatter.transitionStatus(AdrStatus.accepted()));
  }

  deprecate(): ADR {
    const nextFrontmatter = this.frontmatter
      .transitionStatus(AdrStatus.deprecated())
      .withSupersededBy(undefined);

    return this.withFrontmatter(nextFrontmatter);
  }

  supersede(newAdrId: AdrId): ADR {
    if (this.id.equals(newAdrId)) {
      throw new SelfSupersedeNotAllowedError(this.id.toAdrRef());
    }

    const nextFrontmatter = this.frontmatter
      .withSupersededBy(SupersededByRef.create(newAdrId))
      .transitionStatus(AdrStatus.superseded());

    return this.withFrontmatter(nextFrontmatter);
  }

  repropose(): ADR {
    const nextFrontmatter = this.frontmatter
      .transitionStatus(AdrStatus.proposed())
      .withSupersededBy(undefined);

    return this.withFrontmatter(nextFrontmatter);
  }

  updateBody(newBody: AdrBody | AdrBodyProps): ADR {
    this.validationService.validateBody(newBody);
    const body = newBody instanceof AdrBody ? newBody : AdrBody.create(newBody);
    return new ADR(this.frontmatter, body, this.validationService);
  }

  replaceArchgate(mapping?: ArchgateMapping | ArchgateMappingProps): ADR {
    if (!mapping) {
      return this.withFrontmatter(this.frontmatter.withArchgate(undefined));
    }

    this.validationService.validateArchgate(mapping);
    const nextMapping = mapping instanceof ArchgateMapping ? mapping : ArchgateMapping.create(mapping);
    return this.withFrontmatter(this.frontmatter.withArchgate(nextMapping));
  }

  getStatus(): AdrStatus {
    return this.frontmatter.status;
  }

  getArchgate(): ArchgateMapping | undefined {
    return this.frontmatter.archgate;
  }

  getFrontmatter(): AdrFrontmatter {
    return this.frontmatter;
  }

  getBody(): AdrBody {
    return this.body;
  }

  toAdrRef(): string {
    return this.id.toAdrRef();
  }

  private withFrontmatter(frontmatter: AdrFrontmatter): ADR {
    this.validationService.validateFrontmatter(frontmatter);
    return new ADR(frontmatter, this.body, this.validationService);
  }
}
