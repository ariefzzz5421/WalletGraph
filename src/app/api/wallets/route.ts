import { db, rows } from "@/lib/db";
import { apiUser, failure } from "@/lib/http";
import { CHAINS, normalizeAddress } from "@/lib/chains";
import { walletInput } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const user = await apiUser(request);
    const url = new URL(request.url);
    const search = url.searchParams.get("q")?.slice(0,100) ?? "";
    const page = Math.max(1,Math.min(10000,Number(url.searchParams.get("page")) || 1));
    const wallets = await rows(`SELECT w.id,w.name,w.address,w.chain,w.category,w.entity_name,w.priority,w.alert_level,w.sync_status,w.sync_error,w.last_synced_at,w.created_at,
      COALESCE(array_agg(t.name ORDER BY t.name) FILTER(WHERE t.id IS NOT NULL),'{}') AS tags
      FROM wallets w LEFT JOIN wallet_tags wt ON wt.wallet_id=w.id LEFT JOIN tags t ON t.id=wt.tag_id
      WHERE w.user_id=$1 AND ($2='' OR w.name ILIKE '%'||$2||'%' OR w.address ILIKE '%'||$2||'%')
      GROUP BY w.id ORDER BY w.created_at DESC LIMIT 30 OFFSET $3`,[user.id,search,(page-1)*30]);
    return Response.json({ wallets,page });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const user = await apiUser(request,true);
    const input = walletInput.parse(await request.json());
    const address = normalizeAddress(input.chain,input.address);
    const client = await db().connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{ id:string }>(`INSERT INTO wallets(user_id,chain,chain_type,address,name,category,entity_name,notes,priority,alert_level)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,[user.id,input.chain,CHAINS[input.chain].type,address,input.name,input.category,input.entityName,input.notes,input.priority,input.alertLevel]);
      const walletId = result.rows[0].id;
      for (const name of new Set(input.tags.map(t => t.trim()).filter(Boolean))) {
        const tag = await client.query<{ id:string }>("INSERT INTO tags(user_id,name) VALUES($1,$2) ON CONFLICT(user_id,name) DO UPDATE SET name=excluded.name RETURNING id",[user.id,name]);
        await client.query("INSERT INTO wallet_tags(wallet_id,tag_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[walletId,tag.rows[0].id]);
      }
      await client.query("INSERT INTO sync_jobs(wallet_id,mode) VALUES($1,$2)",[walletId,input.backfill]);
      await client.query("INSERT INTO audit_log(user_id,action,target_type,target_id) VALUES($1,'wallet.create','wallet',$2)",[user.id,walletId]);
      await client.query("COMMIT");
      return Response.json({ id:walletId },{ status:201 });
    } catch (error) {
      await client.query("ROLLBACK");
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") throw new Error("CONFLICT");
      throw error;
    } finally { client.release(); }
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_ADDRESS") return Response.json({ error:"Invalid address for selected chain" },{ status:400 });
    return failure(error);
  }
}
