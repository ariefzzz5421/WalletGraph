import { db } from "@/lib/db";
import { apiUser, failure } from "@/lib/http";
import { hashToken, newToken } from "@/lib/security";
export async function POST(request:Request) {
  try {
    const user=await apiUser(request,true);
    if(!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_CLIENT_ID) return Response.json({error:"Discord bot is not configured"},{status:503});
    const code=newToken().slice(0,12);
    await db().query("DELETE FROM discord_connections WHERE user_id=$1 AND guild_id IS NULL",[user.id]);
    await db().query(`INSERT INTO discord_connections(user_id,pairing_hash,pairing_expires_at)
      VALUES($1,$2,now()+interval '10 minutes')`,[user.id,hashToken(code)]);
    const invite=`https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(process.env.DISCORD_CLIENT_ID)}&scope=bot%20applications.commands&permissions=3072`;
    return Response.json({code,invite,expiresIn:600});
  } catch(error){return failure(error);}
}
