"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function WalletActions({id}:{id:string}) {
  const router=useRouter();const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
  async function sync(){setBusy(true);setMessage("");try{const r=await fetch(`/api/wallets/${id}/sync`,{method:"POST"});if(!r.ok)throw new Error("Could not queue sync");setMessage("Sync queued");router.refresh();}catch(e){setMessage(e instanceof Error?e.message:"Request failed");}finally{setBusy(false);}}
  async function remove(){if(!confirm("Remove this wallet and its indexed activity?"))return;setBusy(true);const r=await fetch(`/api/wallets/${id}`,{method:"DELETE"});if(r.ok){router.push("/wallets");router.refresh();}else{setMessage("Could not remove wallet");setBusy(false);}}
  return <div className="action-group"><button className="button secondary" disabled={busy} onClick={sync}>{busy?"Working…":"Sync now"}</button><button className="button danger" disabled={busy} onClick={remove}>Remove</button>{message&&<span className="field-help" role="status">{message}</span>}</div>;
}
