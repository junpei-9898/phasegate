// @unit installation
// @layer presentation
// @work-item-id WI-145
// @work-item-id WI-148
// @work-item-id WI-215

import { ClaudeContextMissingCheck } from "./application/checks/claude-context-missing-check.js";
import { ClaudeHookMissingCheck } from "./application/checks/claude-hook-missing-check.js";
import { ClaudeSkillsSymlinkCheck } from "./application/checks/claude-skills-symlink-check.js";
import { CodexContextMissingCheck } from "./application/checks/codex-context-missing-check.js";
import { CodexHookMissingCheck } from "./application/checks/codex-hook-missing-check.js";
import { CodexSkillsSymlinkCheck } from "./application/checks/codex-skills-symlink-check.js";
import { CiWorkflowMissingCheck } from "./application/checks/ci-workflow-missing-check.js";
import { HuskyCommitMsgMissingCheck } from "./application/checks/husky-commit-msg-missing-check.js";
import { HuskyPreCommitMissingCheck } from "./application/checks/husky-pre-commit-missing-check.js";
import { HuskyPrePushMissingCheck } from "./application/checks/husky-pre-push-missing-check.js";
import { PackageJsonDevdepMissingCheck } from "./application/checks/package-json-devdep-missing-check.js";
import { WiWorkflowDriftCheck } from "./application/checks/wi-workflow-drift-check.js";
import { RunInstallUseCase } from "./application/usecases/run-install.js";
import { RunReconcileUseCase } from "./application/usecases/run-reconcile.js";
import { RunUninstallUseCase } from "./application/usecases/run-uninstall.js";
import { RunDoctorDiagnosticsUseCase } from "./application/usecases/run-doctor-diagnostics.js";
import type { MergeStrategy } from "./domain/ports/merge-strategy.js";
import type { ReconcileStrategy } from "./domain/ports/reconcile-strategy.js";
import type { UninstallReverseStrategy } from "./domain/ports/uninstall-reverse-strategy.js";
import { FileSystemManifestRepositoryAdapter } from "./infrastructure/adapters/file-system-manifest-repository-adapter.js";
import { NodeCryptoHashAdapter } from "./infrastructure/adapters/node-crypto-hash-adapter.js";
import { NodeFsFileInspectorAdapter } from "./infrastructure/adapters/node-fs-file-inspector-adapter.js";
import { SkillDeployerModelDelegationAdapter } from "./infrastructure/adapters/skill-deployer-model-delegation-adapter.js";
import { DoctorHandler } from "./presentation/cli/doctor-handler.js";
import { InstallHandler } from "./presentation/cli/install-handler.js";
import { ReconcileHandler } from "./presentation/cli/reconcile-handler.js";
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
  const modelDelegation = new SkillDeployerModelDelegationAdapter();
  const checks = [
    new ClaudeHookMissingCheck(),
    new ClaudeContextMissingCheck(),
    new CodexHookMissingCheck(),
    new CodexContextMissingCheck(),
    new HuskyPreCommitMissingCheck(),
    new HuskyCommitMsgMissingCheck(),
    new HuskyPrePushMissingCheck(),
    new CiWorkflowMissingCheck(),
    new PackageJsonDevdepMissingCheck(),
    new ClaudeSkillsSymlinkCheck(),
    new CodexSkillsSymlinkCheck(),
    new WiWorkflowDriftCheck(),
  ];
  const runDoctorDiagnosticsUseCase = new RunDoctorDiagnosticsUseCase(checks, inspector, manifestRepository);
  const runInstallUseCase = new RunInstallUseCase(manifestRepository, hashCalculator, modelDelegation);
  const runReconcileUseCase = new RunReconcileUseCase(manifestRepository, hashCalculator, modelDelegation);
  const runUninstallUseCase = new RunUninstallUseCase(manifestRepository, hashCalculator);
  return {
    manifestRepository,
    runDoctorDiagnosticsUseCase,
    runInstallUseCase,
    runReconcileUseCase,
    runUninstallUseCase,
    doctorHandler: new DoctorHandler(runDoctorDiagnosticsUseCase),
    installHandler: new InstallHandler(runInstallUseCase),
    reconcileHandler: new ReconcileHandler(runReconcileUseCase),
    uninstallHandler: new UninstallHandler(runUninstallUseCase),
    futureInstallationStrategyPorts,
  };
}
