# WI-181 Domain Model

@work-item-id WI-181

## Contract

| Concept | Responsibility |
|---|---|
| Runtime dependency contract | Every dependency imported by packaged command paths is declared in `package.json.dependencies`. |
| Cascade file system port | `FileSystemPort.glob(pattern)` provides file discovery for cascade update targets. |
| Packaged downstream project | A project that installs the npm tarball and does not have this repository checkout or dev/transitive dependencies. |

## Invariants

- If a packaged runtime source imports `tinyglobby`, `package.json.dependencies.tinyglobby` must exist.
- `skill:apply-cascade-update --dry-run` may update zero files, but it must not fail because the package cannot resolve glob support.
