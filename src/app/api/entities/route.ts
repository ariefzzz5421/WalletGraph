import { z } from "zod";
import { db, one, rows } from "@/lib/db";
import { apiUser, failure } from "@/lib/http";
const input=z.object({name:z.string().trim().min(2).max(100),category:z.string().trim().max(60).default(""),notes:z.string().trim().max(2000).default("")});
export async function GET(request:Request){
  try{const user=await apiUser(request);const page=Math.max(1,Math.min(10000,Number(new URL(request.url).searchParams.get("page"))||1));
    const entities=await rows(`SELECT e.id,e.name,e.category,e.notes,e.created_at,count(ew.wallet_id)::int AS wallet_count
      FROM entities e LEFT JOIN entity_wallets ew ON ew.entity_id=e.id WHERE e.user_id=$1 GROUP BY e.id ORDER BY e.created_at DESC LIMIT 30 OFFSET $2`,[user.id,(page-1)*30]);
    return Response.json({entities,page});
  }catch(error){return failure(error);}
}
export async function POST(request:Request){
  try{const user=await apiUser(request,true);const data=input.parse(await request.json());
    const entity=await one<{id:string}>("INSERT INTO entities(user_id,name,category,notes) VALUES($1,$2,$3,$4) RETURNING id",[user.id,data.name,data.category,data.notes]);
    await db().query("INSERT INTO audit_log(user_id,action,target_type,target_id) VALUES($1,'entity.create','entity',$2)",[user.id,entity?.id]);
    return Response.json({id:entity?.id},{status:201});
  }catch(error){if(typeof error==="object"&&error!==null&&"code" in error&&error.code==="23505")return Response.json({error:"Entity name already exists"},{status:409});return failure(error);}
}
