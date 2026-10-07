import { rows } from "@/lib/db";
import type { Chain } from "@/lib/chains";

export type GraphNode={id:string;address:string;chain:Chain;label:string;kind:"tracked"|"counterparty";walletId:string|null;depth:number};
export type GraphEdge={id:string;source:string;target:string;eventType:"TRANSFER"|"NFT_TRANSFER";count:number;firstSeen:string;lastSeen:string;evidence:string[]};
type EdgeRow={from_address:string;to_address:string;event_type:"TRANSFER"|"NFT_TRANSFER";tx_count:number;first_seen:Date;last_seen:Date;evidence:string[];sampled_count:number};
type TrackedRow={id:string;address:string;name:string};
export type GraphOptions={userId:string;chain:Chain;seedAddress:string;hops:1|2|3;minCount:number;days:number|null;eventType:"TRANSFER"|"NFT_TRANSFER"|null;limit:number};

export async function loadGraph(options:GraphOptions) {
  const {userId,chain,seedAddress,hops,minCount,days,eventType,limit}=options;
  const fromExpression=chain==="solana"?"from_address":"lower(from_address)";
  const toExpression=chain==="solana"?"to_address":"lower(to_address)";
  const since=days===null?new Date(0):new Date(Date.now()-days*86400000);
  const edgeMap=new Map<string,GraphEdge>();
  const depth=new Map<string,number>([[seedAddress,0]]);
  const expanded=new Set<string>();
  let frontier=[seedAddress];let sampled=false;
  for(let hop=0;hop<hops&&frontier.length&&edgeMap.size<limit;hop++){
    const active=frontier.filter(a=>!expanded.has(a));
    if(!active.length) break;
    active.forEach(a=>expanded.add(a));
    const batchLimit=Math.min(250,limit-edgeMap.size);
    const found=await rows<EdgeRow>(`WITH recent AS (
      SELECT event_key,${fromExpression} AS from_address,${toExpression} AS to_address,event_type,tx_hash,occurred_at FROM wallet_events
      WHERE user_id=$1 AND chain=$2 AND occurred_at>=$3
        AND (${fromExpression}=ANY($4::text[]) OR ${toExpression}=ANY($4::text[]))
        AND event_type IN ('TRANSFER','NFT_TRANSFER')
        AND ($5::text IS NULL OR event_type=$5)
        AND from_address IS NOT NULL AND to_address IS NOT NULL
      ORDER BY occurred_at DESC LIMIT 5000
    ), dedup AS (
      SELECT DISTINCT ON (event_key) event_key,from_address,to_address,event_type,tx_hash,occurred_at
      FROM recent ORDER BY event_key,occurred_at DESC
    )
    SELECT from_address,to_address,event_type,count(*)::int AS tx_count,
      min(occurred_at) AS first_seen,max(occurred_at) AS last_seen,
      (array_agg(tx_hash ORDER BY occurred_at DESC))[1:3] AS evidence,
      (SELECT count(*)::int FROM recent) AS sampled_count
    FROM dedup GROUP BY from_address,to_address,event_type
    HAVING count(*) >= $6 ORDER BY tx_count DESC,last_seen DESC LIMIT $7`,
      [userId,chain,since,active,eventType,minCount,batchLimit]);
    if(found.some(row=>row.sampled_count>=5000))sampled=true;
    const next:string[]=[];
    for(const row of found){
      const source=`${chain}:${row.from_address}`;const target=`${chain}:${row.to_address}`;
      const id=`${source}>${target}:${row.event_type}`;
      if(!edgeMap.has(id))edgeMap.set(id,{id,source,target,eventType:row.event_type,count:row.tx_count,
        firstSeen:row.first_seen.toISOString(),lastSeen:row.last_seen.toISOString(),evidence:row.evidence});
      for(const address of [row.from_address,row.to_address]) if(!depth.has(address)){depth.set(address,hop+1);next.push(address);}
    }
    frontier=next;
  }
  const addresses=[...depth.keys()];
  const tracked=await rows<TrackedRow>("SELECT id,address,name FROM wallets WHERE user_id=$1 AND chain=$2 AND address=ANY($3::text[])",[userId,chain,addresses]);
  const trackedMap=new Map(tracked.map(w=>[w.address,w]));
  const nodes:GraphNode[]=addresses.map(address=>{const wallet=trackedMap.get(address);return {id:`${chain}:${address}`,address,chain,
    label:wallet?.name??`${address.slice(0,6)}…${address.slice(-4)}`,kind:wallet?"tracked":"counterparty",walletId:wallet?.id??null,depth:depth.get(address)??0};});
  return {nodes,edges:[...edgeMap.values()],sampled,coverage:"Indexed activity for your tracked wallets only. Edges prove transactions, not common ownership."};
}
