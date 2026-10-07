import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { rows } from "@/lib/db";
import { WalletForm } from "@/components/wallet-form";
import { Address, ChainBadge, EmptyState, PageHeader, StatusBadge, Time } from "@/components/ui";
import type { Chain } from "@/lib/chains";
type WalletRow={id:string;name:string;address:string;chain:Chain;category:string|null;priority:string;sync_status:string;created_at:Date;tags:string[]};
export default async function WalletsPage({searchParams}:{searchParams:Promise<{q?:string;page?:string}>}){
  const user=(await currentUser())!;const params=await searchParams;const q=params.q?.slice(0,100)??"";const page=Math.max(1,Math.min(10000,Number(params.page)||1));
  const wallets=await rows<WalletRow>(`SELECT w.id,w.name,w.address,w.chain,w.category,w.priority,w.sync_status,w.created_at,
    COALESCE(array_agg(t.name ORDER BY t.name) FILTER(WHERE t.id IS NOT NULL),'{}') AS tags
    FROM wallets w LEFT JOIN wallet_tags wt ON wt.wallet_id=w.id LEFT JOIN tags t ON t.id=wt.tag_id
    WHERE w.user_id=$1 AND ($2='' OR w.name ILIKE '%'||$2||'%' OR w.address ILIKE '%'||$2||'%')
    GROUP BY w.id ORDER BY w.created_at DESC LIMIT 30 OFFSET $3`,[user.id,q,(page-1)*30]);
  return <><PageHeader eyebrow="MONITOR / WALLETS" title="Wallet watchlist" description="Track addresses across eight networks and add your own intelligence context."/><div className="wallets-layout"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">YOUR COVERAGE</span><h2>Tracked wallets</h2></div><span className="count-pill">{wallets.length}{page>1?" on page":""}</span></div><form className="search-form"><input name="q" defaultValue={q} placeholder="Search name or address" aria-label="Search wallets"/><button className="button secondary">Search</button></form>{wallets.length?<div className="wallet-list">{wallets.map(w=><Link href={`/wallets/${w.id}`} className="wallet-list-row" key={w.id}><span className="wallet-avatar">{w.name.slice(0,2).toUpperCase()}</span><span className="row-primary"><strong>{w.name}</strong><span><Address value={w.address}/> · <ChainBadge chain={w.chain}/></span><span className="tag-line">{w.tags.map(t=><span className="tag" key={t}>{t}</span>)}{w.category&&<span className="tag subdued">{w.category}</span>}</span></span><span className="wallet-row-meta"><StatusBadge status={w.sync_status}/><Time value={w.created_at}/></span></Link>)}</div>:<EmptyState title={q?"No matching wallets":"Watchlist is empty"} body={q?"Try another name or address.":"Add an address to start watching verified on-chain activity."}/>}<div className="pagination">{page>1&&<Link href={`/wallets?${new URLSearchParams({q,page:String(page-1)})}`} className="button secondary">← Previous</Link>}{wallets.length===30&&<Link href={`/wallets?${new URLSearchParams({q,page:String(page+1)})}`} className="button secondary">Next →</Link>}</div></section><section className="panel form-panel" id="add-wallet"><div className="panel-heading"><div><span className="eyebrow">NEW SUBJECT</span><h2>Add a wallet</h2></div><span className="panel-index">01 / 01</span></div><WalletForm/></section></div></>;
}
