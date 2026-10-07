import { z } from "zod";
import { apiUser, failure } from "@/lib/http";
import { chainSchema, normalizeAddress } from "@/lib/chains";
import { loadGraph } from "@/lib/relationships";
const query=z.object({chain:chainSchema,address:z.string().min(20).max(60),hops:z.coerce.number().int().min(1).max(3).default(1),
  minCount:z.coerce.number().int().min(1).max(100).default(1),days:z.enum(["7","30","90","all"]).default("30"),
  eventType:z.enum(["TRANSFER","NFT_TRANSFER"]).nullable().default(null),limit:z.coerce.number().int().min(10).max(600).default(350)});
export async function GET(request:Request){
  try{const user=await apiUser(request);const params=new URL(request.url).searchParams;
    const input=query.parse({chain:params.get("chain"),address:params.get("address"),hops:params.get("hops")??undefined,minCount:params.get("minCount")??undefined,
      days:params.get("days")??undefined,eventType:params.get("eventType")||null,limit:params.get("limit")??undefined});
    const address=normalizeAddress(input.chain,input.address);
    const graph=await loadGraph({userId:user.id,chain:input.chain,seedAddress:address,hops:input.hops as 1|2|3,minCount:input.minCount,
      days:input.days==="all"?null:Number(input.days),eventType:input.eventType,limit:input.limit});
    return Response.json(graph);
  }catch(error){if(error instanceof Error&&error.message==="INVALID_ADDRESS")return Response.json({error:"Invalid address for selected chain"},{status:400});return failure(error);}
}
