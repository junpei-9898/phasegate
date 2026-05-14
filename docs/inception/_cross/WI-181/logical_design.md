# WI-181 Logical Design

@work-item-id WI-181

## Scope

Packaged `skill:apply-cascade-update` must resolve every runtime import from the published tarball install. The immediate failing dependency is `tinyglobby`, imported by the skill-quality composition root for `FileSystemPort.glob`.

## Design

- Keep the existing `NodeFileSystemAdapter.glob` implementation because it already delegates glob semantics to `tinyglobby`.
- Treat `tinyglobby` as a runtime dependency in `package.json`, not as an implicit dev/transitive dependency.
- Add a packaging contract test that scans the packaged runtime import and asserts the dependency declaration remains present.

## Verification

- `npx phasegate skill:apply-cascade-update --story WI-XXX --dry-run` from an installed tarball exits without missing dependency errors.
- `package-runtime-contract.test.ts` covers the import/dependency contract.
