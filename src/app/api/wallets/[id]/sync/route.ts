import { db, one } from "@/lib/db";
import { apiUser, failure } from "@/lib/http";
type Ctx={params:Promise<{id:string}>};
export async function POST(request:Request,{params}:Ctx) {
  try {
    const user=await apiUser(request,true); const {id}=await params;
    const wallet=await one("SELECT id FROM wallets WHERE id=$1 AND user_id=$2",[id,user.id]);
    if(!wallet) return Response.json({error:"Wallet not found"},{status:404});
    await db().query("INSERT INTO sync_jobs(wallet_id,mode) VALUES($1,'latest') ON CONFLICT DO NOTHING",[id]);
    return Response.json({ok:true});
  } catch(error){return failure(error);}
}
