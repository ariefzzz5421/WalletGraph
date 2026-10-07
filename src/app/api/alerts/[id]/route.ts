import { db } from "@/lib/db";
import { apiUser, failure } from "@/lib/http";
type Ctx={params:Promise<{id:string}>};
export async function DELETE(request:Request,{params}:Ctx) {
  try {
    const user=await apiUser(request,true); const {id}=await params;
    const result=await db().query("DELETE FROM alert_rules WHERE id=$1 AND user_id=$2",[id,user.id]);
    if(!result.rowCount) return Response.json({error:"Alert not found"},{status:404});
    await db().query("INSERT INTO audit_log(user_id,action,target_type,target_id) VALUES($1,'alert.delete','alert',$2)",[user.id,id]);
    return Response.json({ok:true});
  } catch(error){return failure(error);}
}
export async function PATCH(request:Request,{params}:Ctx) {
  try {
    const user=await apiUser(request,true); const {id}=await params;
    const enabled=(await request.json() as {enabled?:unknown}).enabled;
    if(typeof enabled!=="boolean") return Response.json({error:"enabled must be boolean"},{status:400});
    const result=await db().query("UPDATE alert_rules SET enabled=$3 WHERE id=$1 AND user_id=$2",[id,user.id,enabled]);
    if(!result.rowCount) return Response.json({error:"Alert not found"},{status:404});
    return Response.json({ok:true});
  } catch(error){return failure(error);}
}
