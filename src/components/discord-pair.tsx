"use client";
import { useState } from "react";
export function DiscordPair({configured}:{configured:boolean}){
  const [code,setCode]=useState("");const [invite,setInvite]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  async function generate(){setBusy(true);setError("");try{const response=await fetch("/api/discord/pair",{method:"POST"});const data=await response.json();if(!response.ok)throw new Error(data.error??"Could not create code");setCode(data.code);setInvite(data.invite);}catch(e){setError(e instanceof Error?e.message:"Request failed");}finally{setBusy(false);}}
  return <><button className="button primary" onClick={generate} disabled={!configured||busy}>{busy?"Generating…":"Generate pairing code"}</button>{!configured&&<p className="field-help">Set DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID on the server, then start the bot service.</p>}{error&&<p className="form-error" role="alert">{error}</p>}{code&&<div className="pair-code"><span>ONE-TIME CODE · EXPIRES IN 10 MINUTES</span><strong>{code}</strong><p>1. <a className="text-link" href={invite} target="_blank" rel="noopener noreferrer">Invite the bot to your server ↗</a></p><p>2. In the channel for alerts, run <code>/connect code:{code}</code> with Manage Server permission.</p></div>}</>;
}
