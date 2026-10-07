import { z } from "zod";
import { db, one } from "@/lib/db";
import { apiUser, failure } from "@/lib/http";
type Ctx={params:Promise<{id:string}>};
const update=z.object({name:z.string().trim().min(2).max(100),category:z.string().trim().max(60),notes:z.string().trim().max(2000)});
export async function GET(request:Request,{params}:Ctx){try{const user=await apiUser(request);const {id}=await params;
  const entity=await one("SELECT id,name,category,notes,created_at,updated_at FROM entities WHERE id=$1 AND user_id=$2",[id,user.id]);
  return entity?Response.json({entity}):Response.json({error:"Entity not found"},{status:404});
}catch(error){return failure(error);}}
export async function PATCH(request:Request,{params}:Ctx){try{const user=await apiUser(request,true);const {id}=await params;const data=update.parse(await request.json());
  const entity=await one("UPDATE entities SET name=$3,category=$4,notes=$5,updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING id",[id,user.id,data.name,data.category,data.notes]);
  if(!entity)return Response.json({error:"Entity not found"},{status:404});
  await db().query("INSERT INTO audit_log(user_id,action,target_type,target_id) VALUES($1,'entity.update','entity',$2)",[user.id,id]);return Response.json({ok:true});
}catch(error){if(typeof error==="object"&&error!==null&&"code" in error&&error.code==="23505")return Response.json({error:"Entity name already exists"},{status:409});return failure(error);}}
export async function DELETE(request:Request,{params}:Ctx){try{const user=await apiUser(request,true);const {id}=await params;
  const entity=await one("DELETE FROM entities WHERE id=$1 AND user_id=$2 RETURNING id",[id,user.id]);
  if(!entity)return Response.json({error:"Entity not found"},{status:404});
  await db().query("INSERT INTO audit_log(user_id,action,target_type,target_id) VALUES($1,'entity.delete','entity',$2)",[user.id,id]);return Response.json({ok:true});
}catch(error){return failure(error);}}
