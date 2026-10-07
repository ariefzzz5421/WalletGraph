import { z } from "zod";
import { db, one } from "@/lib/db";
import { apiUser, failure } from "@/lib/http";
type Ctx={params:Promise<{id:string}>};
export async function POST(request:Request,{params}:Ctx){
  try{const user=await apiUser(request,true);const {id}=await params;const {walletId}=z.object({walletId:z.uuid()}).parse(await request.json());
    const entity=await one("SELECT id FROM entities WHERE id=$1 AND user_id=$2",[id,user.id]);
    const wallet=await one("SELECT id FROM wallets WHERE id=$1 AND user_id=$2",[walletId,user.id]);
    if(!entity||!wallet)return Response.json({error:"Entity or wallet not found"},{status:404});
    await db().query("INSERT INTO entity_wallets(user_id,entity_id,wallet_id) VALUES($1,$2,$3)",[user.id,id,walletId]);
    await db().query("INSERT INTO audit_log(user_id,action,target_type,target_id) VALUES($1,'entity.wallet.add','wallet',$2)",[user.id,walletId]);
    return Response.json({ok:true},{status:201});
  }catch(error){if(typeof error==="object"&&error!==null&&"code" in error&&error.code==="23505")return Response.json({error:"Wallet is already assigned to an entity"},{status:409});return failure(error);}
}
