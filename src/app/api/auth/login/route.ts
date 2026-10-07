import { NextResponse } from "next/server";
import { z } from "zod";
import { db, one } from "@/lib/db";
import { failure } from "@/lib/http";
import { hashToken, newToken, sameOrigin, verifyPassword } from "@/lib/security";

const input = z.object({ email: z.email().transform(x => x.toLowerCase()), password: z.string() });
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new Error("FORBIDDEN");
    const { email,password } = input.parse(await request.json());
    const bucket = hashToken(`login:${email}`);
    const attempts = await one<{ attempts: number }>(`INSERT INTO auth_attempts(key,attempts) VALUES($1,1)
      ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_attempts.window_start<now()-interval '15 minutes' THEN 1 ELSE auth_attempts.attempts+1 END,
      window_start=CASE WHEN auth_attempts.window_start<now()-interval '15 minutes' THEN now() ELSE auth_attempts.window_start END RETURNING attempts`,[bucket]);
    if ((attempts?.attempts ?? 0) > 10) return Response.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
    const user = await one<{ id: string; password_hash: string }>("SELECT id,password_hash FROM users WHERE email=$1",[email]);
    if (!user || !await verifyPassword(password,user.password_hash)) return Response.json({ error: "Invalid email or password" }, { status: 401 });
    await db().query("DELETE FROM auth_attempts WHERE key=$1",[bucket]);
    const token = newToken();
    await db().query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 days')",[hashToken(token),user.id]);
    const response = NextResponse.json({ ok:true });
    response.cookies.set("wg_session",token,{ httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"lax", path:"/", maxAge:60*60*24*30 });
    return response;
  } catch (error) { return failure(error); }
}
