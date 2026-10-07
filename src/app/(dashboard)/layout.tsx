import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { workspaceDataStatus } from "@/lib/workspace-data";
import { Nav } from "@/components/nav";
import { DataUnavailable } from "@/components/data-unavailable";
export default async function DashboardLayout({children}:{children:React.ReactNode}) {
  const user=await currentUser(); if(!user) redirect("/login");
  const status=await workspaceDataStatus();
  return <div className="app-shell"><Nav username={user.username}/><main className="main-content">{status==="ready"?children:<DataUnavailable status={status}/>}</main></div>;
}
