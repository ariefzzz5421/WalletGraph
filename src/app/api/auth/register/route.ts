import { NextResponse } from "next/server";
import { z } from "zod";
import { db, one } from "@/lib/db";
import { failure } from "@/lib/http";
import { equalSecret, hashPassword, hashToken, newToken, sameOrigin } from "@/lib/security";

const input = z.object({ email: z.email().max(254).transform(x => x.toLowerCase()), password: z.string().min(12).max(128), registrationCode:z.string().min(1) });
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new Error("FORBIDDEN");
    if (!process.env.REGISTRATION_CODE || process.env.REGISTRATION_CODE.length < 20) return Response.json({error:"Registration is not configured"},{status:503});
    const { email,password,registrationCode } = input.parse(await request.json());
    const bucket = hashToken(`register:${request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"}`);
    const attempts = await one<{ attempts: number }>(`INSERT INTO auth_attempts(key,attempts) VALUES($1,1)
      ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_attempts.window_start<now()-interval '1 hour' THEN 1 ELSE auth_attempts.attempts+1 END,
      window_start=CASE WHEN auth_attempts.window_start<now()-interval '1 hour' THEN now() ELSE auth_attempts.window_start END RETURNING attempts`, [bucket]);
    if ((attempts?.attempts ?? 0) > 10) return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    if (!equalSecret(registrationCode,process.env.REGISTRATION_CODE)) return Response.json({error:"Invalid registration code"},{status:403});
    const passwordHash=await hashPassword(password);
    const client=await db().connect();
    let user:{id:string}|undefined;
    try{
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(731042)");
      const count=await client.query<{count:string}>("SELECT count(*)::text AS count FROM users");
      const created=await client.query<{id:string}>("INSERT INTO users(email,password_hash,role) VALUES($1,$2,$3) RETURNING id",[email,passwordHash,count.rows[0].count==="0"?"admin":"member"]);
      user=created.rows[0];
      await client.query("COMMIT");
    }catch(error){await client.query("ROLLBACK");if(typeof error==="object"&&error!==null&&"code" in error&&error.code==="23505")throw new Error("CONFLICT");throw error;}finally{client.release();}
    if (!user) throw new Error("Could not create account");
    const token = newToken();
    await db().query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 days')",[hashToken(token),user.id]);
    await db().query("INSERT INTO audit_log(user_id,action,target_type,target_id) VALUES($1,'register','user',$1)",[user.id]);
    const response = NextResponse.json({ ok: true });
    response.cookies.set("wg_session",token,{ httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"lax", path:"/", maxAge:60*60*24*30 });
    return response;
  } catch (error) { return failure(error); }
}
