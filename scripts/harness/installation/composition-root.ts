// @unit installation
// @layer presentation
// @work-item-id WI-145

import { ClaudeHookMissingCheck } from "./application/checks/claude-hook-missing-check.js";
import { ClaudeSkillsSymlinkCheck } from "./application/checks/claude-skills-symlink-check.js";
import { CodexHookMissingCheck } from "./application/checks/codex-hook-missing-check.js";
import { CodexSkillsSymlinkCheck } from "./application/checks/codex-skills-symlink-check.js";
import { CiWorkflowMissingCheck } from "./application/checks/ci-workflow-missing-check.js";
import { HuskyCommitMsgMissingCheck } from "./application/checks/husky-commit-msg-missing-check.js";
import { HuskyPreCommitMissingCheck } from "./application/checks/husky-pre-commit-missing-check.js";
import { HuskyPrePushMissingCheck } from "./application/checks/husky-pre-push-missing-check.js";
import { PackageJsonDevdepMissingCheck } from "./application/checks/package-json-devdep-missing-check.js";
import { RunInstallUseCase } from "./application/usecases/run-install.js";
import { RunUninstallUseCase } from "./application/usecases/run-uninstall.js";
import { RunDoctorDiagnosticsUseCase } from "./application/usecases/run-doctor-diagnostics.js";
import type { MergeStrategy } from "./domain/ports/merge-strategy.js";
import type { ReconcileStrategy } from "./domain/ports/reconcile-strategy.js";
import type { UninstallReverseStrategy } from "./domain/ports/uninstall-reverse-strategy.js";
import { FileSystemManifestRepositoryAdapter } from "./infrastructure/adapters/file-system-manifest-repository-adapter.js";
import { NodeCryptoHashAdapter } from "./infrastructure/adapters/node-crypto-hash-adapter.js";
import { NodeFsFileInspectorAdapter } from "./infrastructure/adapters/node-fs-file-inspector-adapter.js";
import { DoctorHandler } from "./presentation/cli/doctor-handler.js";
import { InstallHandler } from "./presentation/cli/install-handler.js";
import { UninstallHandler } from "./presentation/cli/uninstall-handler.js";

type FutureInstallationStrategyPorts = {
  readonly merge?: MergeStrategy<unknown>;
  readonly uninstall?: UninstallReverseStrategy;
  readonly reconcile?: ReconcileStrategy;
};

const futureInstallationStrategyPorts: FutureInstallationStrategyPorts = {};

export function createInstallationModule() {
  const inspector = new NodeFsFileInspectorAdapter();
  const manifestRepository = new FileSystemManifestRepositoryAdapter();
  const hashCalculator = new NodeCryptoHashAdapter();
  const checks = [
    new ClaudeHookMissingCheck(),
    new CodexHookMissingCheck(),
    new HuskyPreCommitMissingCheck(),
    new HuskyCommitMsgMissingCheck(),
    new HuskyPrePushMissingCheck(),
    new CiWorkflowMissingCheck(),
    new PackageJsonDevdepMissingCheck(),
    new ClaudeSkillsSymlinkCheck(),
    new CodexSkillsSymlinkCheck(),
  ];
  const runDoctorDiagnosticsUseCase = new RunDoctorDiagnosticsUseCase(checks, inspector, manifestRepository);
  const runInstallUseCase = new RunInstallUseCase(manifestRepository, hashCalculator);
  const runUninstallUseCase = new RunUninstallUseCase(manifestRepository, hashCalculator);
  return {
    manifestRepository,
    runDoctorDiagnosticsUseCase,
    runInstallUseCase,
    runUninstallUseCase,
    doctorHandler: new DoctorHandler(runDoctorDiagnosticsUseCase),
    installHandler: new InstallHandler(runInstallUseCase),
    uninstallHandler: new UninstallHandler(runUninstallUseCase),
    futureInstallationStrategyPorts,
  };
}
