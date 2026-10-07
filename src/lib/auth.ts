import "server-only";
import { hasSiteAccess, WORKSPACE_USER_ID } from "@/lib/site-access";

export type User = { id: string; username: string; role: "admin" | "member" };
export async function currentUser(): Promise<User | null> {
  if (!await hasSiteAccess()) return null;
  return { id: WORKSPACE_USER_ID, username: "Site workspace", role: "admin" };
}
export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
