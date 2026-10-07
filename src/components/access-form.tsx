"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AccessForm() {
  const router=useRouter();
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setError("");
    try {
      const response=await fetch("/api/access",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error??"Could not unlock the site");
      setPassword("");router.push("/overview");router.refresh();
    }catch(reason){setError(reason instanceof Error?reason.message:"Request failed");}
    finally{setBusy(false);}
  }

  return <><h2>Access WalletGraph</h2><p className="muted">Enter the site password to open the dashboard.</p><form onSubmit={submit} className="form-stack"><label>Site password<input type="password" required autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} placeholder="Enter site password"/></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="button primary full" disabled={busy}>{busy?"Checking…":"Open dashboard →"}</button></form></>;
}
