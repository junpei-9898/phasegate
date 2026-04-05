// @unit phase-dependency-model
// @layer infrastructure

import type { StoryAnnotationVerifierPort } from '../../domain/ports/story-annotation-verifier-port.js';
import { ProjectRelativePath } from '../../../traceability-model/domain/value-objects/project-relative-path.js';
import type { MarkdownDesignDocumentGateway } from '../../../traceability-model/infrastructure/gateways/markdown-design-document-gateway.js';

export interface StoryAnnotationVerifierAdapterDeps {
  readonly designDocumentGateway: Pick<
    MarkdownDesignDocumentGateway,
    'readStoryAnnotations'
  >;
}

export class StoryAnnotationVerifierAdapter
  implements StoryAnnotationVerifierPort
{
  private readonly designDocumentGateway: StoryAnnotationVerifierAdapterDeps['designDocumentGateway'];

  constructor(deps: StoryAnnotationVerifierAdapterDeps) {
    this.designDocumentGateway = deps.designDocumentGateway;
  }

  async verify(targetFilePath: string, tag: string) {
    if (tag.trim() !== '@story-id') {
      return Object.freeze({
        hasAnnotation: false,
      });
    }

    const filePath = ProjectRelativePath.create(targetFilePath);
    const annotations =
      await this.designDocumentGateway.readStoryAnnotations(filePath);

    if (annotations.length === 0) {
      return Object.freeze({
        hasAnnotation: false,
      });
    }

    return Object.freeze({
      hasAnnotation: true,
      storyId: annotations[0]?.storyId.value,
    });
  }
}
