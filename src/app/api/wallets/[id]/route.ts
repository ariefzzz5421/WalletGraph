import { z } from "zod";
import { db, one } from "@/lib/db";
import { apiUser, failure } from "@/lib/http";

const updateInput = z.object({ name:z.string().trim().min(1).max(80), category:z.string().trim().max(60), entityName:z.string().trim().max(80),
  notes:z.string().trim().max(2000), priority:z.enum(["low","normal","high"]), alertLevel:z.enum(["off","all"]), tags:z.array(z.string().trim().min(1).max(40)).max(30) });
type Ctx = { params: Promise<{ id:string }> };
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const user = await apiUser(request,true); const { id } = await params; const input = updateInput.parse(await request.json());
    const client = await db().connect();
    try {
      await client.query("BEGIN");
      const result = await client.query("UPDATE wallets SET name=$3,category=$4,entity_name=$5,notes=$6,priority=$7,alert_level=$8,updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING id",
        [id,user.id,input.name,input.category,input.entityName,input.notes,input.priority,input.alertLevel]);
      if (!result.rowCount) { await client.query("ROLLBACK"); return Response.json({ error:"Wallet not found" },{ status:404 }); }
      await client.query("DELETE FROM wallet_tags WHERE wallet_id=$1",[id]);
      for (const name of new Set(input.tags)) {
        const tag = await client.query<{ id:string }>("INSERT INTO tags(user_id,name) VALUES($1,$2) ON CONFLICT(user_id,name) DO UPDATE SET name=excluded.name RETURNING id",[user.id,name]);
        await client.query("INSERT INTO wallet_tags(wallet_id,tag_id) VALUES($1,$2)",[id,tag.rows[0].id]);
      }
      await client.query("INSERT INTO audit_log(user_id,action,target_type,target_id) VALUES($1,'wallet.update','wallet',$2)",[user.id,id]);
      await client.query("COMMIT"); return Response.json({ ok:true });
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  } catch (error) { return failure(error); }
}
export async function DELETE(request: Request, { params }: Ctx) {
  try {
    const user = await apiUser(request,true); const { id } = await params;
    const wallet = await one<{ id:string }>("DELETE FROM wallets WHERE id=$1 AND user_id=$2 RETURNING id",[id,user.id]);
    if (!wallet) return Response.json({ error:"Wallet not found" },{ status:404 });
    await db().query("INSERT INTO audit_log(user_id,action,target_type,target_id) VALUES($1,'wallet.delete','wallet',$2)",[user.id,id]);
    return Response.json({ ok:true });
  } catch (error) { return failure(error); }
}
