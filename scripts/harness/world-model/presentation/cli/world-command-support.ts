// @unit world-model
// @layer presentation
// @work-item-id WI-296

export type WorldOutputFormat = "human" | "json";
export interface WorldCommandResult {
  readonly exitCode: 0 | 1 | 2;
  readonly stdout: string;
  readonly stderr: string;
}

export const parseFormat = (
  args: readonly string[],
):
  | { readonly ok: true; readonly format: WorldOutputFormat; readonly rest: readonly string[] }
  | {
      readonly ok: false;
      readonly format: WorldOutputFormat;
      readonly message: string;
    } => {
  let format: WorldOutputFormat | undefined;
  let json = false;
  const rest: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--json") {
      json = true;
    } else if (argument === "--format") {
      const value = args[index + 1];
      if (value !== "human" && value !== "json") {
        return { ok: false, format: json ? "json" : "human", message: "--format requires human or json" };
      }
      if (format !== undefined && format !== value) {
        return { ok: false, format: json ? "json" : "human", message: "conflicting output format flags" };
      }
      format = value;
      index += 1;
    } else {
      rest.push(argument);
    }
  }
  if (json && format === "human") {
    return { ok: false, format: "human", message: "conflicting output format flags" };
  }
  return { ok: true, format: json || format === "json" ? "json" : "human", rest };
};

export const envelope = (
  command: "world:pin" | "world:derive",
  exitCode: 0 | 1 | 2,
  data: unknown,
  diagnostics: readonly unknown[],
) => ({
  schemaVersion: "phasegate-world-cli/v1",
  command,
  ok: exitCode === 0,
  exitCode,
  data,
  diagnostics,
});
