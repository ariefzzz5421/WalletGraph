import type { Chain } from "@/lib/chains";

export type NormalizedEvent = {
  eventKey: string;
  chain: Chain;
  txHash: string;
  eventIndex: string;
  eventType: "TRANSFER" | "NFT_TRANSFER";
  direction: "in" | "out" | "self" | "unknown";
  fromAddress: string | null;
  toAddress: string | null;
  tokenSymbol: string | null;
  tokenAddress: string | null;
  amount: string | null;
  usdValue: string | null;
  occurredAt: string;
  source: string;
  raw: unknown;
};
export type ProviderPage = { events: NormalizedEvent[]; nextCursor: string | null; scanned: number; requestCount: number };
export interface BlockchainProvider {
  name: string;
  getActivity(address: string, chain: Chain, cursor?: string, since?: Date): Promise<ProviderPage>;
}
export class ProviderUnavailable extends Error {
  constructor(message = "Provider temporarily unavailable") { super(message); }
}
