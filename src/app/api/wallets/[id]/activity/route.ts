import { one, rows } from "@/lib/db";
import { apiUser, failure } from "@/lib/http";
type Ctx = { params:Promise<{ id:string }> };
export async function GET(request:Request,{ params }:Ctx) {
  try {
    const user=await apiUser(request); const { id }=await params;
    const wallet=await one("SELECT id FROM wallets WHERE id=$1 AND user_id=$2",[id,user.id]);
    if(!wallet) return Response.json({error:"Wallet not found"},{status:404});
    const page=Math.max(1,Math.min(10000,Number(new URL(request.url).searchParams.get("page"))||1));
    const events=await rows("SELECT id,chain,tx_hash,event_type,direction,from_address,to_address,token_symbol,token_address,amount,usd_value,occurred_at,source FROM wallet_events WHERE wallet_id=$1 ORDER BY occurred_at DESC,id DESC LIMIT 50 OFFSET $2",[id,(page-1)*50]);
    return Response.json({events,page});
  } catch(error) { return failure(error); }
}
