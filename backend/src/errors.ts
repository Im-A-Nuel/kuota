/** Error codes from docs/SCHEMA.md, with the HTTP status each one maps to. */
export type ApiErrorCode =
  | "INVALID_PARAMS"
  | "CURVE_ABOVE_CEILING"
  | "RPC_ERROR"
  | "TX_NOT_FOUND"
  | "MISMATCH"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "NOT_CONFIGURED";

export const STATUS: Record<ApiErrorCode, 400 | 404 | 409 | 429 | 502 | 503> = {
  INVALID_PARAMS: 400,
  CURVE_ABOVE_CEILING: 400,
  RPC_ERROR: 502,
  TX_NOT_FOUND: 404,
  MISMATCH: 409,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  NOT_CONFIGURED: 503,
};

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}
