import Link from "next/link";
import { readyWorkspaceUser } from "@/lib/page-access";
import { rows } from "@/lib/db";
import { CHAINS, type Chain } from "@/lib/chains";
import { Address, ChainBadge, EmptyState, PageHeader } from "@/components/ui";
type WalletResult={id:string;name:string;address:string;chain:Chain};
type EntityResult={id:string;name:string;category:string|null};
type TagResult={id:string;name:string;wallet_count:number};
type TokenResult={token_address:string;token_symbol:string|null;chain:Chain;event_count:number};
export default async function SearchPage({searchParams}:{searchParams:Promise<{q?:string}>}){
  const user=await readyWorkspaceUser();if(!user)return null;const q=(await searchParams).q?.trim().slice(0,80)??"";
  const [wallets,entities,tags,tokens]=q.length>=2?await Promise.all([
    rows<WalletResult>("SELECT id,name,address,chain FROM wallets WHERE user_id=$1 AND (name ILIKE '%'||$2||'%' OR address ILIKE '%'||$2||'%') ORDER BY name LIMIT 20",[user.id,q]),
    rows<EntityResult>("SELECT id,name,category FROM entities WHERE user_id=$1 AND name ILIKE '%'||$2||'%' ORDER BY name LIMIT 20",[user.id,q]),
    rows<TagResult>(`SELECT t.id,t.name,count(wt.wallet_id)::int AS wallet_count FROM tags t LEFT JOIN wallet_tags wt ON wt.tag_id=t.id
      WHERE t.user_id=$1 AND t.name ILIKE '%'||$2||'%' GROUP BY t.id ORDER BY t.name LIMIT 20`,[user.id,q]),
    rows<TokenResult>(`SELECT chain,token_address,max(token_symbol) AS token_symbol,count(*)::int AS event_count FROM wallet_events
      WHERE user_id=$1 AND token_address IS NOT NULL AND (token_address ILIKE '%'||$2||'%' OR token_symbol ILIKE '%'||$2||'%')
      GROUP BY chain,token_address ORDER BY event_count DESC LIMIT 20`,[user.id,q])
  ]):[[],[],[],[]];
  const total=wallets.length+entities.length+tags.length+tokens.length;
  return <><PageHeader eyebrow="FIND / SEARCH" title="Search intelligence" description="Find your wallets, entity groupings, custom tags, and observed token contracts."/><section className="panel"><form action="/search" className="search-form global-search"><input name="q" defaultValue={q} placeholder="Address, wallet, entity, tag, or token" aria-label="Search intelligence" autoFocus/><button className="button primary">Search →</button></form>{q.length<2?<EmptyState title="Start with a name or address" body="Enter at least two characters. Search is limited to your private workspace and indexed contracts."/>:total===0?<EmptyState title="No matching intelligence" body="Try another name, address, or token symbol. Untracked contracts are not searched on-chain."/>:<div className="search-results">{wallets.length>0&&<section><h2>Wallets <span>{wallets.length}</span></h2>{wallets.map(w=><Link prefetch={false} href={`/wallets/${w.id}`} className="search-result" key={w.id}><span className="search-type">WALLET</span><strong>{w.name}</strong><span><Address value={w.address}/> · <ChainBadge chain={w.chain}/></span><span className="result-arrow">↗</span></Link>)}</section>}{entities.length>0&&<section><h2>Entities <span>{entities.length}</span></h2>{entities.map(e=><Link prefetch={false} href={`/entities/${e.id}`} className="search-result" key={e.id}><span className="search-type">ENTITY</span><strong>{e.name}</strong><span>{e.category||"Manual grouping"}</span><span className="result-arrow">↗</span></Link>)}</section>}{tags.length>0&&<section><h2>Tags <span>{tags.length}</span></h2>{tags.map(t=><Link prefetch={false} href={`/wallets?tag=${encodeURIComponent(t.name)}`} className="search-result" key={t.id}><span className="search-type">TAG</span><strong>{t.name}</strong><span>{t.wallet_count} wallets</span><span className="result-arrow">↗</span></Link>)}</section>}{tokens.length>0&&<section><h2>Observed contracts <span>{tokens.length}</span></h2>{tokens.map(t=><Link prefetch={false} href={`/activity?q=${encodeURIComponent(t.token_address)}`} className="search-result" key={`${t.chain}:${t.token_address}`}><span className="search-type">TOKEN</span><strong>{t.token_symbol||"Unknown symbol"}</strong><span><Address value={t.token_address}/> · {CHAINS[t.chain].label} · {t.event_count} indexed events</span><span className="result-arrow">↗</span></Link>)}</section>}</div>}</section><p className="data-note">Search scope · Only your tracked wallet records and contracts seen in indexed events. Token names, market prices, and ownership are not inferred.</p></>;
}
