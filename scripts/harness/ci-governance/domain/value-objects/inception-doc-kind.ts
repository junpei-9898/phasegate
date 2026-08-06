// @unit ci-governance
// @layer domain
// @work-item-id WI-368

/**
 * scaffold 可能な inception / product 文書の種別。
 *
 * `DesignPhase` と同型だが **unit 軸を持たない**。`DesignPhase` は `--unit` 必須を
 * 前提とする書き込み先解決を持つため、`_shared` 配下や product 直下の文書を
 * 混ぜると「unit 必須なのに unit を使わない phase」という不整合な不変条件になる。
 *
 * 収録範囲は L2 の Level-1 フェーズゲートを塞ぐ文書に限定する（GitHub issue #42）。
 * `user_stories.md` / `user_story_mapping.md` / `units/*.md` は段階投入のため未収録。
 */
export const INCEPTION_DOC_KINDS = [
  "product-overview-plan",
  "product-overview",
  "story-writer-plan",
  "story-mapping-plan",
  "unit-design-plan",
] as const;

export type InceptionDocKindValue = (typeof INCEPTION_DOC_KINDS)[number];

/** 書き込み先解決に使う、解決済みドキュメントルート */
export interface InceptionDocRoots {
  /** `paths.inceptionDocs`（既定 `docs/inception`） */
  readonly inceptionDocsRoot: string;
  /** `paths.designDocs`（既定 `docs/product/construction`） */
  readonly designDocsRoot: string;
}

export const DEFAULT_INCEPTION_DOC_ROOTS: InceptionDocRoots = Object.freeze({
  inceptionDocsRoot: "docs/inception",
  designDocsRoot: "docs/product/construction",
});

/** `docs/product/construction` -> `docs/product`（phase node の `{designDocsRoot}/..` と同一規則） */
function productRootOf(designDocsRoot: string): string {
  const normalized = designDocsRoot.replace(/\\/g, "/").replace(/\/+$/, "");
  const lastSlash = normalized.lastIndexOf("/");
  return lastSlash <= 0 ? "." : normalized.slice(0, lastSlash);
}

export class InceptionDocKind {
  private constructor(readonly value: InceptionDocKindValue) {
    Object.freeze(this);
  }

  static create(input: string): InceptionDocKind {
    if (!InceptionDocKind.isValid(input)) {
      throw new Error(`未知の doc-kind: "${input}"。許容値: ${INCEPTION_DOC_KINDS.join(", ")}`);
    }
    return new InceptionDocKind(input);
  }

  static isValid(input: string): input is InceptionDocKindValue {
    return (INCEPTION_DOC_KINDS as readonly string[]).includes(input);
  }

  equals(other: InceptionDocKind): boolean {
    return this.value === other.value;
  }

  /** この kind に対応するテンプレートファイル名（`templates/` 配下） */
  get templateFileName(): string {
    switch (this.value) {
      case "product-overview-plan":
        return "product_overview_plan.template.md";
      case "product-overview":
        return "product_overview.template.md";
      case "story-writer-plan":
        return "story_writer_plan.template.md";
      case "story-mapping-plan":
        return "story_mapping_plan.template.md";
      case "unit-design-plan":
        return "unit_design_plan.template.md";
    }
  }

  /** この kind が生成する文書のファイル名 */
  get docFileName(): string {
    switch (this.value) {
      case "product-overview-plan":
        return "product_overview_plan.md";
      case "product-overview":
        return "product_overview.md";
      case "story-writer-plan":
        return "story_writer_plan.md";
      case "story-mapping-plan":
        return "story_mapping_plan.md";
      case "unit-design-plan":
        return "unit_design_plan.md";
    }
  }

  /**
   * プロジェクトルートからの相対パス（POSIX 区切り）。
   * `_shared/*_plan.md` は `{inceptionDocsRoot}/_shared/` 直下、
   * `product_overview.md` は `dirname({designDocsRoot})` 直下に置く。
   */
  relativeTargetPath(roots: InceptionDocRoots = DEFAULT_INCEPTION_DOC_ROOTS): string {
    if (this.value === "product-overview") {
      return `${productRootOf(roots.designDocsRoot)}/${this.docFileName}`;
    }
    const inceptionRoot = roots.inceptionDocsRoot.replace(/\\/g, "/").replace(/\/+$/, "");
    return `${inceptionRoot}/_shared/${this.docFileName}`;
  }
}
