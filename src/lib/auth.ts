import "server-only";
import { cookies } from "next/headers";
import { one } from "@/lib/db";
import { hashToken } from "@/lib/security";

export type User = { id: string; username: string; role: "admin" | "member" };
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get("wg_session")?.value;
  if (!token) return null;
  return one<User>("SELECT u.id,COALESCE(u.username,u.email) AS username,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()", [hashToken(token)]);
}
export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
