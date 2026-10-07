import { db, one, rows } from "@/lib/db";
import { apiUser, failure } from "@/lib/http";
import { alertInput } from "@/lib/validation";
export async function GET(request:Request) {
  try {
    const user=await apiUser(request);
    const rules=await rows(`SELECT ar.id,ar.name,ar.wallet_id,ar.event_type,ar.direction,ar.chain,ar.token_symbol,ar.min_usd,ar.enabled,ar.created_at,
      w.name AS wallet_name FROM alert_rules ar LEFT JOIN wallets w ON w.id=ar.wallet_id WHERE ar.user_id=$1 ORDER BY ar.created_at DESC LIMIT 100`,[user.id]);
    return Response.json({rules});
  } catch(error){return failure(error);}
}
export async function POST(request:Request) {
  try {
    const user=await apiUser(request,true); const input=alertInput.parse(await request.json());
    if(input.walletId) {
      const wallet=await one("SELECT id FROM wallets WHERE id=$1 AND user_id=$2",[input.walletId,user.id]);
      if(!wallet) return Response.json({error:"Wallet not found"},{status:404});
    }
    const rule=await one<{id:string}>(`INSERT INTO alert_rules(user_id,name,wallet_id,event_type,direction,chain,token_symbol,min_usd)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,[user.id,input.name,input.walletId??null,input.eventType??null,input.direction??null,input.chain??null,input.tokenSymbol||null,input.minUsd??null]);
    await db().query("INSERT INTO audit_log(user_id,action,target_type,target_id) VALUES($1,'alert.create','alert',$2)",[user.id,rule?.id]);
    return Response.json({id:rule?.id},{status:201});
  } catch(error){return failure(error);}
}
