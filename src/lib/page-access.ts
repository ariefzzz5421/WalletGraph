import "server-only";
import { currentUser } from "@/lib/auth";
import { workspaceDataStatus } from "@/lib/workspace-data";

export async function readyWorkspaceUser() {
  const user = await currentUser();
  if (!user) return null;
  return await workspaceDataStatus() === "ready" ? user : null;
}
