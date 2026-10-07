import { rows } from "@/lib/db";
import { apiUser, failure } from "@/lib/http";
import { CHAINS, providerConfigured, type Chain } from "@/lib/chains";
export async function GET(request:Request) {
  try {
    await apiUser(request);
    const health=await rows<{provider:string;chain:string;status:string;latency_ms:number|null;request_count:string;error_count:string;last_checked_at:Date;last_error:string|null}>("SELECT provider,chain,status,latency_ms,request_count,error_count,last_checked_at,last_error FROM provider_health");
    return Response.json({sources:Object.entries(CHAINS).map(([chain,info])=>({chain,label:info.label,provider:info.type==="solana"?"Solana RPC":"Alchemy Transfers",
      configured:providerConfigured(chain as Chain),health:health.find(h=>h.chain===chain)??null}))});
  } catch(error){return failure(error);}
}
