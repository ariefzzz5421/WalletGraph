import type { NormalizedEvent } from "@/lib/providers/types";

export type Rule = { wallet_id: string | null; event_type: string | null; direction: string | null; chain: string | null; token_symbol: string | null; min_usd: string | null };
export function matchesRule(rule: Rule, event: NormalizedEvent, walletId: string) {
  if (rule.wallet_id && rule.wallet_id !== walletId) return false;
  if (rule.event_type && rule.event_type !== event.eventType) return false;
  if (rule.direction && rule.direction !== event.direction) return false;
  if (rule.chain && rule.chain !== event.chain) return false;
  if (rule.token_symbol && rule.token_symbol.toLowerCase() !== event.tokenSymbol?.toLowerCase()) return false;
  if (rule.min_usd !== null && (event.usdValue === null || Number(event.usdValue) < Number(rule.min_usd))) return false;
  return true;
}
export function alertEligible(occurredAt:string,trackedAt:Date,alertLevel:"all"|"off") {
  return alertLevel==="all" && new Date(occurredAt)>=trackedAt;
}
