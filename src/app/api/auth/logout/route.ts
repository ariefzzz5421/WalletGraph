import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { failure } from "@/lib/http";
import { hashToken, sameOrigin } from "@/lib/security";
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new Error("FORBIDDEN");
    const token = (await cookies()).get("wg_session")?.value;
    if (token) await db().query("DELETE FROM sessions WHERE token_hash=$1",[hashToken(token)]);
    const response = NextResponse.json({ ok:true });
    response.cookies.delete("wg_session");
    return response;
  } catch (error) { return failure(error); }
}
