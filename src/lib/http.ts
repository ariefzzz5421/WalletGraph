import { ZodError } from "zod";
import { currentUser, type User } from "@/lib/auth";
import { sameOrigin } from "@/lib/security";
import { one } from "@/lib/db";

export function failure(error: unknown) {
  if (error instanceof ZodError) return Response.json({ error: "Invalid input", details: error.flatten() }, { status: 400 });
  if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "Sign in required" }, { status: 401 });
  if (error instanceof Error && error.message === "FORBIDDEN") return Response.json({ error: "Forbidden" }, { status: 403 });
  if (error instanceof Error && error.message === "CONFLICT") return Response.json({ error: "Already exists" }, { status: 409 });
  if (error instanceof Error && error.message === "RATE_LIMITED") return Response.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 });
  console.error(error);
  return Response.json({ error: "Request failed" }, { status: 500 });
}
export async function apiUser(request: Request, mutation = false): Promise<User> {
  if (mutation && !sameOrigin(request)) throw new Error("FORBIDDEN");
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  const rate = await one<{requests:number}>(`INSERT INTO api_rate_limits(user_id,requests) VALUES($1,1)
    ON CONFLICT(user_id) DO UPDATE SET requests=CASE WHEN api_rate_limits.window_start<now()-interval '1 minute' THEN 1 ELSE api_rate_limits.requests+1 END,
    window_start=CASE WHEN api_rate_limits.window_start<now()-interval '1 minute' THEN now() ELSE api_rate_limits.window_start END RETURNING requests`,[user.id]);
  if ((rate?.requests??0)>120) throw new Error("RATE_LIMITED");
  return user;
}
