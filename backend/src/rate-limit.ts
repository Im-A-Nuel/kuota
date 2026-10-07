import type { MiddlewareHandler } from "hono";
import { ApiError } from "./errors";

/**
 * Fixed-window limiter kept in memory. Good enough for one API process; a second instance
 * would need a shared store.
 */
export function rateLimit({ limit, windowMs }: { limit: number; windowMs: number }): MiddlewareHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return async (c, next) => {
    const now = Date.now();
    // Behind a proxy the client address is the first x-forwarded-for entry.
    const client = c.req.header("x-forwarded-for")?.split(",")[0].trim() ?? "local";
    const entry = hits.get(client);
    if (!entry || entry.resetAt <= now) {
      hits.set(client, { count: 1, resetAt: now + windowMs });
      // Drop expired windows so the map cannot grow without bound.
      if (hits.size > 5_000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    } else if (++entry.count > limit) {
      throw new ApiError("RATE_LIMITED", "Too many requests. Try again in a minute.");
    }
    await next();
  };
}
