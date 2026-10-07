import { Database } from "lucide-react";
import type { WorkspaceDataStatus } from "@/lib/workspace-data";

export function DataUnavailable({status}:{status:Exclude<WorkspaceDataStatus,"ready">}) {
  const detail=status==="not-configured"?"The database connection has not been configured yet."
    :status==="setup-needed"?"The database is connected, but the WalletGraph schema or internal workspace record is not ready."
    :"The database is temporarily unavailable.";
  return <section className="panel data-unavailable"><span className="data-unavailable-icon"><Database size={23}/></span><span className="eyebrow">DATA SOURCE STATUS</span><h1>Dashboard access is ready</h1><p>{detail} Wallets, events, and alerts will appear here after database setup and ingestion are running.</p><div className="notice">No blockchain activity is being shown or estimated while data is unavailable.</div></section>;
}
