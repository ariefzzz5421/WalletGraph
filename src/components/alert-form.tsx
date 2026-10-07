"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CHAINS } from "@/lib/chains";
type Wallet={id:string;name:string;chain:string};
export function AlertForm({wallets}:{wallets:Wallet[]}){
  const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");const form=new FormData(event.currentTarget);
    const min=form.get("minUsd");const payload={name:form.get("name"),walletId:form.get("walletId")||null,eventType:form.get("eventType")||null,direction:form.get("direction")||null,
      chain:form.get("chain")||null,tokenSymbol:form.get("tokenSymbol")||null,minUsd:min?Number(min):null};
    try{const response=await fetch("/api/alerts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok)throw new Error(data.error??"Could not create alert");(event.target as HTMLFormElement).reset();router.refresh();}
    catch(e){setError(e instanceof Error?e.message:"Request failed");}finally{setBusy(false);}
  }
  return <form onSubmit={submit} className="form-stack"><label>Rule name<input name="name" required maxLength={80} placeholder="Large incoming transfers"/></label><div className="form-row"><label>Wallet<select name="walletId"><option value="">Any tracked wallet</option>{wallets.map(w=><option key={w.id} value={w.id}>{w.name} · {w.chain}</option>)}</select></label><label>Event<select name="eventType"><option value="">Any verified event</option><option value="TRANSFER">Transfer</option><option value="NFT_TRANSFER">NFT transfer</option></select></label></div><div className="form-row"><label>Direction<select name="direction"><option value="">Any direction</option><option value="in">Incoming</option><option value="out">Outgoing</option><option value="self">Self</option></select></label><label>Chain<select name="chain"><option value="">Any chain</option>{Object.entries(CHAINS).map(([id,c])=><option key={id} value={id}>{c.label}</option>)}</select></label></div><div className="form-row"><label>Token symbol<input name="tokenSymbol" placeholder="Optional e.g. ETH"/></label><label>Minimum USD <span className="optional">requires verified price</span><input name="minUsd" type="number" min="0" step="0.01" placeholder="Optional"/></label></div><p className="field-help">USD thresholds never fire on events without a verified USD value. The current transfer provider does not supply prices.</p>{error&&<p className="form-error" role="alert">{error}</p>}<button className="button primary full" disabled={busy}>{busy?"Creating…":"Create alert rule →"}</button></form>;
}
export function RuleActions({id,enabled}:{id:string;enabled:boolean}){
  const router=useRouter();const [busy,setBusy]=useState(false);
  async function act(method:"PATCH"|"DELETE") {setBusy(true);const response=await fetch(`/api/alerts/${id}`,{method,headers:{"content-type":"application/json"},...(method==="PATCH"?{body:JSON.stringify({enabled:!enabled})}:{})});setBusy(false);if(response.ok)router.refresh();}
  return <div className="action-group"><button className="text-button" disabled={busy} onClick={()=>act("PATCH")}>{enabled?"Pause":"Resume"}</button><button className="text-button destructive" disabled={busy} onClick={()=>act("DELETE")}>Delete</button></div>;
}
