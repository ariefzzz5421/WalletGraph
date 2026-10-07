import { currentUser } from "@/lib/auth";
import { rows } from "@/lib/db";
import { AlertForm, RuleActions } from "@/components/alert-form";
import { EmptyState, PageHeader, Time } from "@/components/ui";
type Rule={id:string;name:string;wallet_name:string|null;event_type:string|null;direction:string|null;chain:string|null;token_symbol:string|null;min_usd:string|null;enabled:boolean;created_at:Date};
export default async function AlertsPage(){const user=(await currentUser())!;
  const [rules,wallets,connection]=await Promise.all([
    rows<Rule>(`SELECT ar.id,ar.name,ar.event_type,ar.direction,ar.chain,ar.token_symbol,ar.min_usd,ar.enabled,ar.created_at,w.name AS wallet_name
      FROM alert_rules ar LEFT JOIN wallets w ON w.id=ar.wallet_id WHERE ar.user_id=$1 ORDER BY ar.created_at DESC LIMIT 100`,[user.id]),
    rows<{id:string;name:string;chain:string}>("SELECT id,name,chain FROM wallets WHERE user_id=$1 ORDER BY name LIMIT 200",[user.id]),
    rows("SELECT id FROM discord_connections WHERE user_id=$1 AND channel_id IS NOT NULL LIMIT 1",[user.id])
  ]);
  return <><PageHeader eyebrow="AUTOMATE / ALERTS" title="Alert rules" description="Route confirmed wallet events to your Discord server with conditions you control."/>{!connection.length&&<div className="notice">Discord is not connected yet. Rules can be saved now; delivery begins after you connect a server in Discord settings.</div>}<div className="wallets-layout"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">ACTIVE LOGIC</span><h2>Your rules</h2></div><span className="count-pill">{rules.length}</span></div>{rules.length?<div className="rule-list">{rules.map(r=><div className="rule-row" key={r.id}><div className="rule-top"><strong>{r.name}</strong><span className={`status-badge ${r.enabled?"status-ready":"status-pending"}`}>{r.enabled?"Active":"Paused"}</span></div><p>{[r.wallet_name??"Any wallet",r.event_type??"Any event",r.direction??"Any direction",r.chain??"Any chain",r.token_symbol??"Any token",r.min_usd!==null?`≥ $${r.min_usd}`:null].filter(Boolean).join(" · ")}</p><div className="rule-bottom"><span><Time value={r.created_at}/></span><RuleActions id={r.id} enabled={r.enabled}/></div></div>)}</div>:<EmptyState title="No alert rules" body="Add a rule to define which verified events should reach Discord."/>}</section><section className="panel form-panel"><div className="panel-heading"><div><span className="eyebrow">NEW AUTOMATION</span><h2>Create a rule</h2></div></div><AlertForm wallets={wallets}/></section></div></>;
}
