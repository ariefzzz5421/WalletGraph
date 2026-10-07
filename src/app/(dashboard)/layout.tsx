import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { Nav } from "@/components/nav";
export default async function DashboardLayout({children}:{children:React.ReactNode}) {
  const user=await currentUser(); if(!user) redirect("/login");
  return <div className="app-shell"><Nav email={user.email}/><main className="main-content">{children}</main></div>;
}
