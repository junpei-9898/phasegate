// @unit installation
// @layer domain
// @work-item-id WI-145

export interface MergeResult<T> {
  readonly merged: T;
  readonly changed: boolean;
}

export interface MergeStrategy<T> {
  readonly fileType: "json" | "shell" | "yaml-add" | "package-json";
  merge(existing: T | null, incoming: T): MergeResult<T>;
}
