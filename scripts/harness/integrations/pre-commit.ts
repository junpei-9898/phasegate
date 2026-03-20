/**
 * Harness Engineering - Pre-commit Integration
 *
 * Reads harness config, determines which validators to run,
 * and executes enabled checks against staged files.
 *
 * Called from .husky/pre-commit.
 * Exit code 0 = pass, non-zero = block commit.
 */

import { execSync } from "node:child_process";
import { loadConfig, isHarnessEnabled } from "../core/config-loader.js";
import { isExcludedPath } from "../core/metadata-parser.js";
import type { HarnessError } from "../core/error-reporter.js";
import { createError, formatForHuman } from "../core/error-reporter.js";

// ─── ANSI Helpers ───

const GREEN = "\x1b[32m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

// ─── Staged File Detection ───

function getStagedFiles(): string[] {
  try {
    const output = execSync("git diff --cached --name-only --diff-filter=ACM", {
      encoding: "utf-8",
    });
    return output
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
  } catch {
    return [];
  }
}

// ─── Dynamic Validator Loading ───

type ValidatorFn = (files: string[], config: import("../core/config-schema.js").HarnessConfig) => Array<{
  rule: string;
  severity: "error" | "warning";
  file: string;
  message: string;
  suggestion?: string;
}>;

interface ValidatorEntry {
  name: string;
  harnessKey: keyof import("../core/config-schema.js").HarnessesConfig;
  category: import("../core/error-reporter.js").HarnessError["category"];
  importPath: string;
  exportName: string;
}

const VALIDATOR_REGISTRY: ValidatorEntry[] = [
  { name: "phase-gate", harnessKey: "phaseGate", category: "phase_gate", importPath: "../validators/phase-gate.js", exportName: "runPhaseGateCheck" },
  { name: "architecture", harnessKey: "architecture", category: "architecture", importPath: "../validators/architecture.js", exportName: "runArchitectureCheck" },
  { name: "dependency", harnessKey: "dependency", category: "dependency", importPath: "../validators/dependency.js", exportName: "runDependencyCheck" },
  { name: "test-quality", harnessKey: "testQuality", category: "quality", importPath: "../validators/test-quality.js", exportName: "runTestQualityCheck" },
  { name: "security", harnessKey: "security", category: "security", importPath: "../validators/security.js", exportName: "runSecurityCheck" },
  { name: "performance", harnessKey: "performance", category: "performance", importPath: "../validators/performance.js", exportName: "runPerformanceCheck" },
  { name: "consistency", harnessKey: "consistency", category: "consistency", importPath: "../validators/consistency.js", exportName: "runConsistencyCheck" },
  { name: "metadata", harnessKey: "metadata", category: "quality", importPath: "../validators/metadata.js", exportName: "runMetadataCheck" },
];

async function loadValidator(entry: ValidatorEntry): Promise<ValidatorFn | null> {
  try {
    const mod = await import(entry.importPath);
    return mod[entry.exportName] ?? null;
  } catch {
    // Validator not yet implemented, skip gracefully
    return null;
  }
}

// ─── Convert Validator Errors to HarnessErrors ───

function toHarnessErrors(
  validatorErrors: Array<{ rule: string; severity: "error" | "warning"; file: string; message: string; suggestion?: string }>,
  entry: ValidatorEntry,
): HarnessError[] {
  return validatorErrors.map((err) =>
    createError({
      code: `HARNESS-${err.rule.toUpperCase().replace(/[^A-Z0-9]/g, "-")}`,
      severity: err.severity,
      category: entry.category,
      location: { file: err.file },
      message: {
        short: err.message,
        detailed: err.message,
        agentInstruction: err.suggestion ?? "",
      },
      metadata: { timestamp: new Date().toISOString(), validator: entry.name, layer: "L2" },
    }),
  );
}

// ─── Main ───

async function main(): Promise<void> {
  const config = loadConfig();

  // Check if L2 (pre-commit) layer is enabled
  if (!config.layers.L2_precommit.enabled) {
    console.log(`${DIM}[harness] L2 Pre-commit layer is disabled. Skipping.${RESET}`);
    return;
  }

  // Get staged .ts files, filtering excluded paths
  const allStaged = getStagedFiles();
  const tsFiles = allStaged
    .filter((f) => f.endsWith(".ts"))
    .filter((f) => !isExcludedPath(f, config));

  if (tsFiles.length === 0) {
    console.log(`${DIM}[harness] No relevant TypeScript files staged. Skipping.${RESET}`);
    return;
  }

  console.log(`${BOLD}[harness]${RESET} Pre-commit check (${tsFiles.length} file(s))`);

  const allErrors: HarnessError[] = [];

  // Load and run enabled validators in order
  for (const entry of VALIDATOR_REGISTRY) {
    if (!isHarnessEnabled(config, entry.harnessKey, "L2_precommit")) {
      continue;
    }

    const runValidator = await loadValidator(entry);
    if (!runValidator) {
      continue;
    }

    console.log(`  ${DIM}Running ${entry.name}...${RESET}`);
    const errors = runValidator(tsFiles, config);
    allErrors.push(...toHarnessErrors(errors, entry));
  }

  // Report results
  const errorCount = allErrors.filter((e) => e.severity === "error").length;

  if (allErrors.length > 0) {
    console.log();
    console.log(formatForHuman(allErrors, config));
  }

  if (errorCount > 0) {
    console.log(`\n${RED}${BOLD}[harness] Commit blocked.${RESET}`);
    process.exit(1);
  }

  console.log(`${GREEN}[harness]${RESET} All checks passed.`);
}

main().catch((err) => {
  console.error(`${RED}[harness] Unexpected error:${RESET}`, err);
  process.exit(1);
});
