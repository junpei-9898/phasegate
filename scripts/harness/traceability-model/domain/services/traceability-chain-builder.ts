/**
 * @layer domain
 * @unit traceability-model
 */

import type { DesignDocumentPort } from '../ports/design-document-port.js';
import type { InceptionPlanPort } from '../ports/inception-plan-port.js';
import type { MetadataReaderPort } from '../ports/metadata-reader-port.js';
import type { StoryCatalogPort } from '../ports/story-catalog-port.js';
import type { UnitDefinitionPort } from '../ports/unit-definition-port.js';
import {
  ChainLink,
  type ChainLinkType,
  type ProjectRelativePathLike,
} from '../value-objects/chain-link.js';
import type { StoryIdLike } from '../value-objects/story-reference.js';
import { TraceabilityChain } from '../value-objects/traceability-chain.js';

const PROJECT_RELATIVE_PATH_PATTERN = /^(docs|scripts|inception)\//;
const DEFAULT_STORY_CATALOG_PATH = 'docs/product/user_stories.md';

const createPath = (value: string): ProjectRelativePathLike =>
  Object.freeze({
    value,
    toString() {
      return value;
    },
    equals(other: { readonly value: string }) {
      return other.value === value;
    },
  });

const createPlaceholderPath = (value: string): ProjectRelativePathLike =>
  createPath(value);

const validateOrigin = (origin: string): ProjectRelativePathLike => {
  if (
    origin.trim().length === 0 ||
    origin.startsWith('/') ||
    origin.includes('\\') ||
    origin.includes('..') ||
    !PROJECT_RELATIVE_PATH_PATTERN.test(origin)
  ) {
    throw new ProjectRelativePathError(origin);
  }

  return createPath(origin);
};

const ensurePath = (origin: string | ProjectRelativePathLike): ProjectRelativePathLike =>
  typeof origin === 'string' ? validateOrigin(origin) : origin;

const createLink = (args: {
  readonly from: ProjectRelativePathLike;
  readonly to: ProjectRelativePathLike;
  readonly linkType: ChainLinkType;
  readonly resolved: boolean;
}): ChainLink => ChainLink.create(args);

const getConstructionRoot = async (
  port: UnitDefinitionPort,
  unitName: string,
): Promise<ProjectRelativePathLike | null> => {
  if (typeof port.findConstructionRoot === 'function') {
    return port.findConstructionRoot(unitName);
  }
  if (typeof port.resolveConstructionRoot === 'function') {
    return port.resolveConstructionRoot(unitName);
  }
  return null;
};

const getDesignDocuments = async (
  port: DesignDocumentPort,
  unitName: string,
): Promise<readonly ProjectRelativePathLike[]> => {
  if (typeof port.listByUnit === 'function') {
    return port.listByUnit(unitName);
  }
  if (typeof port.findConstructionDocuments === 'function') {
    return port.findConstructionDocuments(unitName);
  }
  return Object.freeze([]);
};

const readStoryAnnotations = async (
  port: DesignDocumentPort,
  path: ProjectRelativePathLike,
) => {
  if (typeof port.readStoryAnnotations === 'function') {
    return port.readStoryAnnotations(path);
  }
  if (typeof port.readStoryIdAnnotations === 'function') {
    return port.readStoryIdAnnotations(path);
  }
  return Object.freeze([]);
};

const hasStoryId = async (
  port: StoryCatalogPort,
  storyId: StoryIdLike,
): Promise<boolean> => {
  if (typeof port.exists === 'function') {
    return port.exists(storyId);
  }
  if (typeof port.hasStoryId === 'function') {
    return port.hasStoryId(storyId);
  }
  return false;
};

const getPlanRoot = async (
  port: InceptionPlanPort,
  unitName: string,
  storyId: StoryIdLike,
): Promise<ProjectRelativePathLike | null> => {
  if (typeof port.findPlanRoot === 'function') {
    return port.findPlanRoot(unitName, storyId);
  }
  if (typeof port.findPlanByStoryId === 'function') {
    return port.findPlanByStoryId(storyId);
  }
  return null;
};

export class ProjectRelativePathError extends Error {
  constructor(value: string) {
    super(`Invalid project relative path: ${value}`);
    this.name = 'ProjectRelativePathError';
  }
}

export class TraceabilityChainBuilder {
  private readonly metadataReaderPort: MetadataReaderPort;
  private readonly unitDefinitionPort: UnitDefinitionPort;
  private readonly designDocumentPort: DesignDocumentPort;
  private readonly storyCatalogPort: StoryCatalogPort;
  private readonly inceptionPlanPort: InceptionPlanPort;
  private readonly storyCatalogPath: ProjectRelativePathLike;

  constructor(deps: {
    readonly metadataReaderPort: MetadataReaderPort;
    readonly unitDefinitionPort: UnitDefinitionPort;
    readonly designDocumentPort: DesignDocumentPort;
    readonly storyCatalogPort: StoryCatalogPort;
    readonly inceptionPlanPort: InceptionPlanPort;
    readonly storyCatalogPath?: string;
  }) {
    this.metadataReaderPort = deps.metadataReaderPort;
    this.unitDefinitionPort = deps.unitDefinitionPort;
    this.designDocumentPort = deps.designDocumentPort;
    this.storyCatalogPort = deps.storyCatalogPort;
    this.inceptionPlanPort = deps.inceptionPlanPort;
    this.storyCatalogPath = createPath(
      deps.storyCatalogPath ?? DEFAULT_STORY_CATALOG_PATH,
    );
  }

  async build(origin: string | ProjectRelativePathLike): Promise<TraceabilityChain> {
    const normalizedOrigin = ensurePath(origin);
    const implementationLinks: ChainLink[] = [];
    const unitToDesignLinks: ChainLink[] = [];
    const designToStoryLinks: ChainLink[] = [];
    const storyToPlanLinks: ChainLink[] = [];
    const tags = await this.metadataReaderPort.readImplementationTags(normalizedOrigin);
    const unitTag = tags.find((tag) => tag.type === '@unit');

    if (!unitTag) {
      implementationLinks.push(
        createLink({
          from: normalizedOrigin,
          to: createPlaceholderPath('docs/product/construction/__unresolved__'),
          linkType: 'implementation-to-unit',
          resolved: false,
        }),
      );

      return TraceabilityChain.create(
        Object.freeze({
          origin: normalizedOrigin,
          links: implementationLinks,
        }),
      );
    }

    const constructionRoot =
      (await getConstructionRoot(this.unitDefinitionPort, unitTag.value)) ??
      createPlaceholderPath(`docs/product/construction/${unitTag.value}`);

    implementationLinks.push(
      createLink({
        from: normalizedOrigin,
        to: constructionRoot,
        linkType: 'implementation-to-unit',
        resolved: await getConstructionRoot(this.unitDefinitionPort, unitTag.value).then(
          (value) => value !== null,
        ),
      }),
    );

    const designDocuments = await getDesignDocuments(
      this.designDocumentPort,
      unitTag.value,
    );

    if (designDocuments.length === 0) {
      unitToDesignLinks.push(
        createLink({
          from: constructionRoot,
          to: createPlaceholderPath(`${constructionRoot.value}/domain_model.md`),
          linkType: 'unit-to-design',
          resolved: false,
        }),
      );

      return TraceabilityChain.create(
        Object.freeze({
          origin: normalizedOrigin,
          links: [...implementationLinks, ...unitToDesignLinks],
        }),
      );
    }

    for (const designDocument of designDocuments) {
      unitToDesignLinks.push(
        createLink({
          from: constructionRoot,
          to: designDocument,
          linkType: 'unit-to-design',
          resolved: true,
        }),
      );

      const annotations = await readStoryAnnotations(
        this.designDocumentPort,
        designDocument,
      );

      if (annotations.length === 0) {
        designToStoryLinks.push(
          createLink({
            from: designDocument,
            to: this.storyCatalogPath,
            linkType: 'design-to-story',
            resolved: false,
          }),
        );
        continue;
      }

      for (const annotation of annotations) {
        const storyResolved = await hasStoryId(this.storyCatalogPort, annotation.storyId);
        designToStoryLinks.push(
          createLink({
            from: designDocument,
            to: this.storyCatalogPath,
            linkType: 'design-to-story',
            resolved: storyResolved,
          }),
        );

        if (!storyResolved) {
          continue;
        }

        const planRoot = await getPlanRoot(
          this.inceptionPlanPort,
          unitTag.value,
          annotation.storyId,
        );
        storyToPlanLinks.push(
          createLink({
            from: this.storyCatalogPath,
            to:
              planRoot ??
              createPlaceholderPath(
                `inception/${unitTag.value}/${annotation.storyId.value}/__missing__.md`,
              ),
            linkType: 'story-to-plan',
            resolved: planRoot !== null,
          }),
        );
      }
    }

    return TraceabilityChain.create(
      Object.freeze({
        origin: normalizedOrigin,
        links: [
          ...implementationLinks,
          ...unitToDesignLinks,
          ...designToStoryLinks,
          ...storyToPlanLinks,
        ],
      }),
    );
  }
}
