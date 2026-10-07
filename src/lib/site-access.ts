import "server-only";
import { cookies } from "next/headers";
import { SITE_COOKIE, validSiteSession } from "@/lib/site-session";

export const WORKSPACE_USER_ID = "7d6c4f0d-c71a-4eee-9c3f-783f8fb36477";

export async function hasSiteAccess() {
  const sessionSecret = process.env.SITE_SESSION_SECRET;
  const passwordHash = process.env.SITE_ACCESS_PASSWORD_HASH;
  if (!sessionSecret || !passwordHash) return false;
  return validSiteSession((await cookies()).get(SITE_COOKIE)?.value, `${sessionSecret}:${passwordHash}`);
}
