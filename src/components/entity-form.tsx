"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function EntityForm(){const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");const form=new FormData(event.currentTarget);
    try{const response=await fetch("/api/entities",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:form.get("name"),category:form.get("category"),notes:form.get("notes")})});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"Could not create entity");router.push(`/entities/${data.id}`);router.refresh();
    }catch(reason){setError(reason instanceof Error?reason.message:"Request failed");}finally{setBusy(false);}}
  return <form className="form-stack" onSubmit={submit}><label>Entity name<input name="name" required minLength={2} maxLength={100} placeholder="e.g. Research watchlist"/></label><label>Category<input name="category" maxLength={60} placeholder="Fund / DAO / Team / Custom"/></label><label>Notes<textarea name="notes" rows={4} maxLength={2000} placeholder="Evidence and context for this grouping"/></label><p className="field-help">Entities are manual groupings. A name does not verify common ownership of the member wallets.</p>{error&&<p className="form-error" role="alert">{error}</p>}<button className="button primary full" disabled={busy}>{busy?"Creating…":"Create entity →"}</button></form>;
}
