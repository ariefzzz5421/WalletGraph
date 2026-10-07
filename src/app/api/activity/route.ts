import { rows } from "@/lib/db";
import { apiUser, failure } from "@/lib/http";
import { chainSchema } from "@/lib/chains";
export async function GET(request: Request) {
  try {
    const user = await apiUser(request); const url = new URL(request.url);
    const page = Math.max(1,Math.min(10000,Number(url.searchParams.get("page")) || 1));
    const chain = url.searchParams.get("chain") ? chainSchema.parse(url.searchParams.get("chain")) : null;
    const type = url.searchParams.get("type")?.slice(0,30) ?? null;
    const q = url.searchParams.get("q")?.slice(0,100) ?? "";
    const events = await rows(`SELECT e.id,e.wallet_id,e.chain,e.tx_hash,e.event_type,e.direction,e.from_address,e.to_address,e.token_symbol,
      e.amount,e.usd_value,e.occurred_at,e.source,w.name AS wallet_name,w.address
      FROM wallet_events e JOIN wallets w ON w.id=e.wallet_id WHERE e.user_id=$1
      AND ($2::text IS NULL OR e.chain=$2) AND ($3::text IS NULL OR e.event_type=$3)
      AND ($4='' OR w.name ILIKE '%'||$4||'%' OR w.address ILIKE '%'||$4||'%' OR e.tx_hash ILIKE '%'||$4||'%'
        OR e.token_symbol ILIKE '%'||$4||'%' OR e.token_address ILIKE '%'||$4||'%')
      ORDER BY e.occurred_at DESC,e.id DESC LIMIT 50 OFFSET $5`,[user.id,chain,type,q,(page-1)*50]);
    return Response.json({ events,page });
  } catch (error) { return failure(error); }
}
