import "server-only";
import { cache } from "react";
import { one } from "@/lib/db";
import { WORKSPACE_USER_ID } from "@/lib/site-access";

export type WorkspaceDataStatus = "ready" | "not-configured" | "setup-needed" | "unavailable";

export const workspaceDataStatus = cache(async ():Promise<WorkspaceDataStatus> => {
  if(!process.env.DATABASE_URL)return "not-configured";
  try {
    const row=await one<{available:boolean}>("SELECT EXISTS(SELECT 1 FROM users WHERE id=$1) AS available",[WORKSPACE_USER_ID]);
    return row?.available?"ready":"setup-needed";
  }catch(error){
    console.error("Workspace database check failed",error instanceof Error?error.message:"unknown error");
    return "unavailable";
  }
});
