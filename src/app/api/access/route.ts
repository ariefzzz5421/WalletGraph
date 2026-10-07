import { NextResponse } from "next/server";
import { z } from "zod";
import { hashToken, sameOrigin, verifyPassword } from "@/lib/security";
import { failure } from "@/lib/http";
import { makeSiteSession, SITE_COOKIE, SITE_COOKIE_AGE } from "@/lib/site-session";

const input = z.object({ password: z.string().min(1).max(128) });
const attempts = new Map<string,{count:number;started:number}>();
const windowMs = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new Error("FORBIDDEN");
    const passwordHash = process.env.SITE_ACCESS_PASSWORD_HASH;
    const sessionSecret = process.env.SITE_SESSION_SECRET;
    if (!passwordHash || !sessionSecret || sessionSecret.length < 32) return Response.json({error:"Site access is not configured"},{status:503});
    const {password}=input.parse(await request.json());
    const ip=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const bucket=hashToken(`site-access:${ip}`);
    const now=Date.now();
    const prior=attempts.get(bucket);
    const state=prior&&now-prior.started<windowMs?prior:{count:0,started:now};
    if(state.count>=8)return Response.json({error:"Too many attempts. Try again in 15 minutes."},{status:429});
    state.count+=1;
    if(attempts.size>10000)attempts.clear();
    attempts.set(bucket,state);
    if(!await verifyPassword(password,passwordHash))return Response.json({error:"Incorrect site password"},{status:401});
    attempts.delete(bucket);
    const response=NextResponse.json({ok:true});
    response.cookies.set(SITE_COOKIE,makeSiteSession(`${sessionSecret}:${passwordHash}`,now),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:SITE_COOKIE_AGE});
    response.headers.set("Cache-Control","no-store");
    return response;
  }catch(error){return failure(error);}
}
