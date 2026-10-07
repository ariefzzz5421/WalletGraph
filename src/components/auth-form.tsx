"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AuthForm({registrationOpen}:{registrationOpen:boolean}) {
  const router=useRouter();
  const [mode,setMode]=useState<"login"|"register">(registrationOpen?"register":"login");
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(event:React.FormEvent) {
    event.preventDefault();setBusy(true);setError("");
    try {
      const response=await fetch(`/api/auth/${mode}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username,password})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error??"Could not sign in");
      router.push("/overview");router.refresh();
    }catch(reason){setError(reason instanceof Error?reason.message:"Request failed");}
    finally{setBusy(false);}
  }

  return <>
    {registrationOpen&&<div className="auth-switch"><button type="button" className={mode==="login"?"active":""} onClick={()=>{setMode("login");setError("");}}>Sign in</button><button type="button" className={mode==="register"?"active":""} onClick={()=>{setMode("register");setError("");}}>Create account</button></div>}
    <h2>{mode==="login"?"Welcome back":"Create your workspace"}</h2>
    <p className="muted">{mode==="login"?"Sign in with your username and password.":"Set up the first account with a username and password. Sign-up closes after this account is created."}</p>
    <form onSubmit={submit} className="form-stack">
      <label>Username<input type="text" required minLength={3} maxLength={mode==="register"?30:254} pattern={mode==="register"?"[A-Za-z][A-Za-z0-9_]{2,29}":undefined} title={mode==="register"?"3–30 characters; start with a letter, then use letters, numbers, or underscores":undefined} value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Your username"/></label>
      <label>Password<input type="password" required minLength={mode==="register"?12:undefined} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==="login"?"current-password":"new-password"} placeholder={mode==="register"?"12 characters minimum":"Enter your password"}/></label>
      {mode==="register"&&<p className="field-help">Username: 3–30 letters, numbers, or underscores. Start with a letter. Password: at least 12 characters. Keep it safe; email recovery is not configured.</p>}
      {error&&<p className="form-error" role="alert">{error}</p>}
      <button className="button primary full" disabled={busy}>{busy?"Please wait…":mode==="login"?"Sign in →":"Create account →"}</button>
    </form>
  </>;
}
