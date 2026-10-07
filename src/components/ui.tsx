import Link from "next/link";
import { CHAINS, type Chain } from "@/lib/chains";
export function PageHeader({eyebrow,title,description,action}:{eyebrow:string;title:string;description:string;action?:React.ReactNode}) {
  return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{action&&<div className="header-action">{action}</div>}</header>;
}
export function EmptyState({title,body,href,label}:{title:string;body:string;href?:string;label?:string}) {
  return <div className="empty-state"><span className="empty-icon">◇</span><h3>{title}</h3><p>{body}</p>{href&&label&&<Link href={href} className="button secondary">{label} →</Link>}</div>;
}
export function Address({value}:{value:string}) { return <span className="mono address" title={value}>{value.slice(0,7)}…{value.slice(-5)}</span>; }
export function ChainBadge({chain}:{chain:Chain}) { return <span className="chain-badge">{CHAINS[chain]?.label??chain}</span>; }
export function StatusBadge({status}:{status:string}) { return <span className={`status-badge status-${status}`}>{status}</span>; }
export function Time({value}:{value:string|Date}) { return <time dateTime={new Date(value).toISOString()} title={new Date(value).toLocaleString()}>{new Date(value).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</time>; }
export function formatAmount(value:string|null, symbol:string|null) { if(value===null)return "Amount unknown";const n=Number(value);return `${Number.isFinite(n)?new Intl.NumberFormat("en-US",{maximumFractionDigits:6}).format(n):value} ${symbol??"tokens"}`; }
