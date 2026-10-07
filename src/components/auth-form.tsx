"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AuthForm() {
  const router=useRouter(); const [mode,setMode]=useState<"login"|"register">("login"); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [registrationCode,setRegistrationCode]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(event:React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response=await fetch(`/api/auth/${mode}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password,...(mode==="register"?{registrationCode}:{})})});
      const data=await response.json(); if(!response.ok) throw new Error(data.error??"Could not sign in");
      router.push("/overview"); router.refresh();
    } catch(error) { setError(error instanceof Error?error.message:"Request failed"); } finally { setBusy(false); }
  }
  return <><div className="auth-switch"><button className={mode==="login"?"active":""} onClick={()=>{setMode("login");setError("");}}>Sign in</button><button className={mode==="register"?"active":""} onClick={()=>{setMode("register");setError("");}}>Create account</button></div><h2>{mode==="login"?"Welcome back":"Create your workspace"}</h2><p className="muted">{mode==="login"?"Access your private intelligence workspace.":"Registration requires the private code configured by the operator."}</p><form onSubmit={submit} className="form-stack"><label>Email address<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com"/></label><label>Password<input type="password" required minLength={mode==="register"?12:undefined} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==="login"?"current-password":"new-password"} placeholder={mode==="register"?"12 characters minimum":"Enter your password"}/></label>{mode==="register"&&<label>Registration code<input type="password" required value={registrationCode} onChange={e=>setRegistrationCode(e.target.value)} autoComplete="off" placeholder="Private invite code"/></label>}{error&&<p className="form-error" role="alert">{error}</p>}<button className="button primary full" disabled={busy}>{busy?"Please wait…":mode==="login"?"Sign in →":"Create account →"}</button></form></>;
}
