// @unit world-model
// @layer application
// @work-item-id WI-306

import type { WorldSnapshotRootDto } from "../dto/world-snapshot-root-dto.js";
import type { BuildSnapshotContract } from "../usecases/build-snapshot-use-case.js";

/** World domain型を公開せずcurrent corpusRootだけを返すpublic read facade。 */
export class WorldSnapshotRootFacade {
  constructor(private readonly buildSnapshot: BuildSnapshotContract) {}

  async read(): Promise<WorldSnapshotRootDto> {
    const snapshot = await this.buildSnapshot.execute();
    return {
      schemaVersion: "phasegate-world-snapshot-root/v1",
      worldSnapshotRoot: snapshot.corpusRoot.toString(),
    };
  }
}
