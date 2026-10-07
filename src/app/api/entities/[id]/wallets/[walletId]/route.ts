import { db } from "@/lib/db";
import { apiUser, failure } from "@/lib/http";
type Ctx={params:Promise<{id:string;walletId:string}>};
export async function DELETE(request:Request,{params}:Ctx){
  try{const user=await apiUser(request,true);const {id,walletId}=await params;
    const result=await db().query("DELETE FROM entity_wallets WHERE entity_id=$1 AND wallet_id=$2 AND user_id=$3",[id,walletId,user.id]);
    if(!result.rowCount)return Response.json({error:"Membership not found"},{status:404});
    await db().query("INSERT INTO audit_log(user_id,action,target_type,target_id) VALUES($1,'entity.wallet.remove','wallet',$2)",[user.id,walletId]);
    return Response.json({ok:true});
  }catch(error){return failure(error);}
}
