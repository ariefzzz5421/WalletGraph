import { NextResponse } from "next/server";
import { failure } from "@/lib/http";
import { sameOrigin } from "@/lib/security";
import { SITE_COOKIE } from "@/lib/site-session";

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new Error("FORBIDDEN");
    const response = NextResponse.json({ ok: true });
    response.cookies.delete(SITE_COOKIE);
    response.cookies.delete("wg_session");
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return failure(error);
  }
}
