/**
 * @layer infrastructure
 * @unit adr-foundation
 */
import type { SeedAdrDefinition } from '../../application/dto/seed-adr-definition.js';

export const INITIAL_ADR_DEFINITIONS: readonly SeedAdrDefinition[] = [
  {
    title: 'Package separation',
    status: 'Accepted',
    date: '2026-03-13',
    body: {
      context:
        'The harness codebase has grown beyond a single-package structure. Build times increase and cross-cutting changes create unnecessary coupling.',
      decision:
        'Separate the repository into discrete packages aligned with bounded contexts, each with its own build and test lifecycle.',
      consequences:
        'Packages can evolve independently. CI must orchestrate multi-package builds. Shared kernel contracts must be explicitly published.',
    },
  },
  {
    title: 'Full migration from ESLint to Biome',
    status: 'Accepted',
    date: '2026-03-13',
    body: {
      context:
        'The project currently uses ESLint for linting. Biome offers faster execution and unified formatting with linting in a single tool.',
      decision:
        'Migrate all linting and formatting from ESLint and Prettier to Biome as the sole toolchain.',
      consequences:
        'Tooling becomes simpler and faster. Custom ESLint rules must be re-implemented as Biome plugins or GritQL patterns.',
      alternatives:
        'Keep dual toolchain with ESLint for rules not yet supported by Biome.',
    },
  },
  {
    title: 'Quality harness owns K1-K13',
    status: 'Accepted',
    date: '2026-03-13',
    body: {
      context:
        'Quality indicators K1 through K13 are defined across multiple documents with no single owner enforcing them.',
      decision:
        'The quality harness unit owns the enforcement of all K1-K13 indicators, providing validators and gates for each.',
      consequences:
        'A single unit is accountable for quality enforcement. Other units must integrate through the harness contract rather than implementing ad-hoc checks.',
    },
  },
  {
    title: 'FUSE Hooks Engine is out of v1 scope',
    status: 'Proposed',
    date: '2026-03-13',
    body: {
      context:
        'The FUSE Hooks Engine provides extensible event-driven hooks but adds significant complexity to the initial delivery.',
      decision:
        'Defer the FUSE Hooks Engine to a post-v1 phase. The v1 harness will use direct invocation patterns.',
      consequences:
        'Reduced initial scope and risk. Hook-based extensibility will require a migration path when introduced later.',
      alternatives:
        'Include a minimal hooks engine in v1 with limited extensibility.',
    },
  },
  {
    title: 'HarnessError requires fix_example',
    status: 'Accepted',
    date: '2026-03-13',
    body: {
      context:
        'Developers receiving harness errors often lack actionable guidance on how to resolve violations.',
      decision:
        'Every HarnessError definition must include a fix_example field demonstrating the corrective action.',
      consequences:
        'Error definitions are more verbose but significantly more useful. All existing error definitions must be updated to include examples.',
    },
  },
  {
    title: 'Strict quick mode eligibility',
    status: 'Accepted',
    date: '2026-03-13',
    body: {
      context:
        'Quick mode bypasses expensive validators but must not compromise quality gates for critical changes.',
      decision:
        'Define strict eligibility criteria for quick mode based on file change scope and affected layers.',
      consequences:
        'Quick mode runs faster for eligible changes. Complex cross-layer changes always run the full validator stack.',
      alternatives:
        'Allow developers to manually opt into quick mode regardless of change scope.',
    },
  },
  {
    title: 'Separate config files',
    status: 'Accepted',
    date: '2026-03-13',
    body: {
      context:
        'A single monolithic configuration file makes it difficult to manage unit-specific settings and increases merge conflicts.',
      decision:
        'Split configuration into separate files per concern: harness.config.json for core settings, with unit-specific overrides.',
      consequences:
        'Configuration is modular and easier to maintain. The config loader must implement a merge strategy for layered configs.',
    },
  },
  {
    title: 'Nyquist integration for truths and artifacts',
    status: 'Proposed',
    date: '2026-03-13',
    body: {
      context:
        'Nyquist provides a truth-source registry and artifact tracking system that could centralize harness state management.',
      decision:
        'Integrate with Nyquist for truth registration and artifact lifecycle tracking.',
      consequences:
        'Harness gains a centralized truth source. A dependency on Nyquist availability is introduced.',
      alternatives:
        'Build a standalone truth registry within the harness codebase.',
    },
  },
  {
    title: 'Artifact-driven state derivation',
    status: 'Accepted',
    date: '2026-03-13',
    body: {
      context:
        'Harness state is currently computed on-the-fly, leading to inconsistent results across different invocation points.',
      decision:
        'Derive harness state exclusively from persisted artifacts, making state deterministic and reproducible.',
      consequences:
        'State becomes auditable and cacheable. All state-changing operations must produce artifacts as their primary output.',
    },
  },
  {
    title: 'Validator stack detection',
    status: 'Accepted',
    date: '2026-03-13',
    body: {
      context:
        'Validators are registered individually, but their execution order and dependencies are not explicitly managed.',
      decision:
        'Implement automatic validator stack detection that resolves execution order based on declared dependencies and layer constraints.',
      consequences:
        'Validator execution order is deterministic and verifiable. Circular dependencies are detected at registration time.',
    },
  },
  {
    title: 'Temporary 4-layer definition with return path to 5-layer',
    status: 'Proposed',
    date: '2026-03-13',
    body: {
      context:
        'The target architecture defines 5 layers, but the current codebase structure and team familiarity support only 4 layers.',
      decision:
        'Adopt a temporary 4-layer definition (domain, application, infrastructure, presentation) with a documented return path to the 5-layer target.',
      consequences:
        'Initial implementation is simpler. The migration plan to 5 layers must be maintained and reviewed periodically.',
      alternatives:
        'Adopt the full 5-layer structure from the start despite the complexity cost.',
    },
  },
] as const;
