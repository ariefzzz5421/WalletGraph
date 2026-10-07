import { db, one, rows } from "@/lib/db";
import { CHAINS, providerConfigured, type Chain } from "@/lib/chains";
import { providerFor } from "@/lib/providers";
import { ProviderUnavailable, type NormalizedEvent } from "@/lib/providers/types";
import { alertEligible, matchesRule, type Rule } from "@/lib/alerts";

type Job = { id: string; wallet_id: string; mode: "latest" | "7d" | "30d" | "90d" | "full" };
type Wallet = { id: string; user_id: string; address: string; chain: Chain; alert_level: "all"|"off"; created_at: Date; last_synced_at: Date | null };
type DbRule = Rule & { id: string };
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
function safeError(error:unknown) {
  let message=error instanceof Error?error.message:"Unknown provider error";
  for(const secret of [process.env.ALCHEMY_API_KEY,process.env.SOLANA_RPC_URL,process.env.DISCORD_BOT_TOKEN]) {
    if(secret) message=message.replaceAll(secret,"[redacted]");
  }
  return message.slice(0,300);
}

export async function enqueueDueWallets() {
  await db().query("UPDATE sync_jobs SET status='queued',run_after=now() WHERE status='running' AND started_at<now()-interval '30 minutes'");
  await db().query("UPDATE discord_deliveries SET status='failed' WHERE status='sending' AND claimed_at<now()-interval '5 minutes'");
  await db().query(`INSERT INTO sync_jobs(wallet_id,mode)
    SELECT id,'latest' FROM wallets w WHERE (last_synced_at IS NULL OR last_synced_at < now()-interval '2 minutes')
      AND NOT EXISTS (SELECT 1 FROM sync_jobs j WHERE j.wallet_id=w.id AND j.status IN ('queued','running'))
    ON CONFLICT DO NOTHING`);
}
export async function claimJob(): Promise<Job | null> {
  return one<Job>(`UPDATE sync_jobs SET status='running',started_at=now(),attempts=attempts+1
    WHERE id=(SELECT id FROM sync_jobs WHERE status='queued' AND run_after<=now() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING id,wallet_id,mode`);
}
async function saveEvent(wallet: Wallet, event: NormalizedEvent, cutoff: Date, rules: DbRule[]) {
  if (new Date(event.occurredAt) < cutoff) return false;
  const inserted = await one<{ id: string }>(`INSERT INTO wallet_events
    (user_id,wallet_id,event_key,chain,tx_hash,event_index,event_type,direction,from_address,to_address,token_symbol,token_address,amount,usd_value,occurred_at,source,raw)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    ON CONFLICT (wallet_id,event_key) DO NOTHING RETURNING id`,
    [wallet.user_id,wallet.id,event.eventKey,event.chain,event.txHash,event.eventIndex,event.eventType,event.direction,
      event.fromAddress,event.toAddress,event.tokenSymbol,event.tokenAddress,event.amount,event.usdValue,event.occurredAt,event.source,JSON.stringify(event.raw)]);
  if (!inserted) return false;
  if (!alertEligible(event.occurredAt,wallet.created_at,wallet.alert_level)) return true;
  for (const rule of rules) {
    if (matchesRule(rule,event,wallet.id)) {
      const alert = await one<{id:string}>("INSERT INTO alert_events(rule_id,event_id) VALUES($1,$2) ON CONFLICT(rule_id,event_id) DO UPDATE SET rule_id=excluded.rule_id RETURNING id", [rule.id,inserted.id]);
      if (alert) await db().query(`INSERT INTO discord_deliveries(alert_event_id,connection_id)
        SELECT $1,id FROM discord_connections WHERE user_id=$2 AND channel_id IS NOT NULL ON CONFLICT DO NOTHING`,[alert.id,wallet.user_id]);
    }
  }
  return true;
}
function cutoffFor(job: Job, wallet: Wallet): Date {
  if (job.mode === "full") return new Date(0);
  if (job.mode === "latest") return wallet.last_synced_at ? new Date(wallet.last_synced_at.getTime()-120000) : wallet.created_at;
  const days = Number(job.mode.replace("d",""));
  return new Date(Date.now()-days*86400000);
}
export async function runJob(job: Job) {
  const wallet = await one<Wallet>("SELECT id,user_id,address,chain,alert_level,created_at,last_synced_at FROM wallets WHERE id=$1", [job.wallet_id]);
  if (!wallet) return;
  const provider = providerFor(wallet.chain);
  const started = Date.now();
  let scanned = 0, requestCount=0, cursor: string | undefined;
  try {
    if (!providerConfigured(wallet.chain)) throw new ProviderUnavailable(`${wallet.chain} provider is not configured`);
    await db().query("UPDATE wallets SET sync_status='syncing',sync_error=NULL WHERE id=$1", [wallet.id]);
    const cutoff = cutoffFor(job,wallet);
    const rules = await rows<DbRule>("SELECT id,wallet_id,event_type,direction,chain,token_symbol,min_usd FROM alert_rules WHERE user_id=$1 AND enabled=true", [wallet.user_id]);
    do {
      const page = await provider.getActivity(wallet.address,wallet.chain,cursor,cutoff);
      scanned += page.scanned;
      requestCount += page.requestCount;
      for (const event of page.events) await saveEvent(wallet,event,cutoff,rules);
      await db().query("UPDATE sync_jobs SET processed=$2,started_at=now() WHERE id=$1", [job.id,scanned]);
      cursor = page.nextCursor ?? undefined;
      if (!cursor || page.scanned === 0) break;
      await sleep(250);
    } while (cursor);
    await db().query("UPDATE sync_jobs SET status='done',finished_at=now() WHERE id=$1", [job.id]);
    await db().query("UPDATE wallets SET sync_status='ready',last_synced_at=now(),updated_at=now() WHERE id=$1", [wallet.id]);
    await db().query(`INSERT INTO provider_health(provider,chain,status,latency_ms,request_count)
      VALUES($1,$2,'connected',$3,$4) ON CONFLICT(provider,chain) DO UPDATE SET status='connected',latency_ms=$3,
      request_count=provider_health.request_count+$4,last_error=NULL,last_checked_at=now()`, [provider.name,wallet.chain,Date.now()-started,requestCount]);
  } catch (error) {
    const message = safeError(error);
    const unavailable = error instanceof ProviderUnavailable;
    await db().query("UPDATE sync_jobs SET status='failed',error=$2,finished_at=now() WHERE id=$1", [job.id,message]);
    await db().query("UPDATE wallets SET sync_status=$2,sync_error=$3,last_synced_at=now() WHERE id=$1", [wallet.id,unavailable ? "unavailable" : "error",message]);
    await db().query(`INSERT INTO provider_health(provider,chain,status,error_count,last_error)
      VALUES($1,$2,$3,1,$4) ON CONFLICT(provider,chain) DO UPDATE SET status=$3,error_count=provider_health.error_count+1,
      last_error=$4,last_checked_at=now()`, [provider.name,wallet.chain,unavailable ? "unavailable" : "error",message]);
    console.error(`Sync failed for ${wallet.chain}:${wallet.address}: ${message}`);
  }
}
type Delivery = { id: string; event_type: string; direction: string; amount: string | null; token_symbol: string | null; usd_value: string | null;
  tx_hash: string; chain: Chain; occurred_at: Date; wallet_name: string; address: string; channel_id: string };
export async function deliverAlerts() {
  if (!process.env.DISCORD_BOT_TOKEN) return;
  const pending = await rows<Delivery>(`SELECT d.id,e.event_type,e.direction,e.amount,e.token_symbol,e.usd_value,e.tx_hash,e.chain,e.occurred_at,
    w.name AS wallet_name,w.address,dc.channel_id FROM discord_deliveries d
    JOIN alert_events ae ON ae.id=d.alert_event_id JOIN wallet_events e ON e.id=ae.event_id JOIN wallets w ON w.id=e.wallet_id
    JOIN discord_connections dc ON dc.id=d.connection_id AND dc.channel_id IS NOT NULL
    WHERE d.status IN ('pending','failed') AND d.attempts<5 ORDER BY d.created_at LIMIT 20`);
  for (const item of pending) {
    const claimed = await one<{ id: string }>("UPDATE discord_deliveries SET status='sending',claimed_at=now(),attempts=attempts+1 WHERE id=$1 AND status IN ('pending','failed') AND attempts<5 RETURNING id", [item.id]);
    if (!claimed) continue;
    const value = item.amount ? `${item.amount} ${item.token_symbol ?? "tokens"}` : (item.token_symbol ?? "Unknown amount");
    const content = `**${item.event_type.replace("_"," ")} · ${item.direction.toUpperCase()}**\n**${item.wallet_name}** · ${CHAINS[item.chain].label}\n${value}${item.usd_value ? ` · $${item.usd_value}` : " · USD value unverified"}\n${item.address}\n${CHAINS[item.chain].explorer}${item.tx_hash}`;
    try {
      const response = await fetch(`https://discord.com/api/v10/channels/${item.channel_id}/messages`, {
        method: "POST", headers: { authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "content-type": "application/json" },
        body: JSON.stringify({ content, allowed_mentions: { parse: [] } }), signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error(`Discord HTTP ${response.status}`);
      await db().query("UPDATE discord_deliveries SET status='sent',sent_at=now(),error=NULL WHERE id=$1", [item.id]);
    } catch (error) {
      await db().query("UPDATE discord_deliveries SET status='failed',error=$2 WHERE id=$1", [item.id,error instanceof Error ? error.message : "Delivery failed"]);
    }
  }
}
