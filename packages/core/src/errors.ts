/** Error codes follow docs/SCHEMA.md so the backend can return them unchanged. */
export type LaunchErrorCode = "INVALID_PARAMS" | "CURVE_ABOVE_CEILING";

export class LaunchConfigError extends Error {
  constructor(
    public readonly code: LaunchErrorCode,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "LaunchConfigError";
  }
}
