import { createHash } from "node:crypto";
import { CHAINS, type Chain } from "@/lib/chains";
import { BlockchainProvider, ProviderUnavailable, type NormalizedEvent, type ProviderPage } from "./types";

type Transfer = {
  uniqueId?: string; hash: string; from: string; to: string | null; value: number | null; asset: string | null;
  category: string; blockNum: string; metadata?: { blockTimestamp?: string }; rawContract?: { address?: string | null };
  tokenId?: string | null;
};
type Result = { result?: { transfers?: Transfer[]; pageKey?: string }; error?: { message?: string } };

export class AlchemyProvider implements BlockchainProvider {
  name = "Alchemy Transfers";
  async getActivity(address: string, chain: Chain, cursor?: string, since?: Date): Promise<ProviderPage> {
    const chainConfig = CHAINS[chain];
    if (chainConfig.type !== "evm" || !chainConfig.rpcHost) throw new ProviderUnavailable("Unsupported provider chain");
    const key = process.env.ALCHEMY_API_KEY;
    if (!key) throw new ProviderUnavailable("Alchemy API key is not configured");
    const state: { in?: string; out?: string } = cursor ? JSON.parse(cursor) : {};
    const directions = ["in", "out"] as const;
    const results = await Promise.all(directions.map(async direction => {
      if (state[direction] === "done") return { direction, transfers: [] as Transfer[], next: "done" };
      const params = {
        fromBlock: "0x0", toBlock: "latest", [direction === "in" ? "toAddress" : "fromAddress"]: address,
        category: ["external",...(chain === "ethereum" || chain === "base" || chain === "polygon" ? ["internal"] : []),"erc20", "erc721", "erc1155"],
        withMetadata: true, excludeZeroValue: true, maxCount: "0x64", order: "desc",
        ...(state[direction] ? { pageKey: state[direction] } : {})
      };
      const response = await fetch(`https://${chainConfig.rpcHost}.g.alchemy.com/v2/${key}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "alchemy_getAssetTransfers", params: [params] }),
        signal: AbortSignal.timeout(20000), cache: "no-store"
      });
      if (!response.ok) throw new ProviderUnavailable(`Alchemy returned HTTP ${response.status}`);
      const data = await response.json() as Result;
      if (data.error || !data.result?.transfers) throw new ProviderUnavailable(data.error?.message ?? "Alchemy response unavailable");
      const oldest = data.result.transfers.at(-1)?.metadata?.blockTimestamp;
      const reachedCutoff = oldest && since && new Date(oldest) < since;
      return { direction, transfers: data.result.transfers, next: reachedCutoff ? "done" : data.result.pageKey ?? "done" };
    }));
    const next = Object.fromEntries(results.map(r => [r.direction, r.next]));
    const events: NormalizedEvent[] = results.flatMap(({ direction, transfers }) => transfers.flatMap((t, index) => {
      if (!t.hash || !t.metadata?.blockTimestamp) return [];
      const eventIndex = t.uniqueId ?? `${t.hash}:${t.category}:${t.from}:${t.to}:${t.tokenId ?? ""}:${index}`;
      const eventKey = createHash("sha256").update(`${chain}:${eventIndex}`).digest("hex");
      const isNft = t.category === "erc721" || t.category === "erc1155";
      const actualDirection = t.from.toLowerCase() === address.toLowerCase() && t.to?.toLowerCase() === address.toLowerCase() ? "self" : direction;
      return [{
        eventKey, chain, txHash: t.hash, eventIndex, eventType: isNft ? "NFT_TRANSFER" as const : "TRANSFER" as const,
        direction: actualDirection, fromAddress: t.from.toLowerCase(), toAddress: t.to?.toLowerCase() ?? null,
        tokenSymbol: isNft ? (t.asset ?? "NFT") : t.asset,
        tokenAddress: t.rawContract?.address ?? null,
        amount: t.value == null || !Number.isFinite(t.value) ? null : String(t.value),
        usdValue: null, occurredAt: t.metadata.blockTimestamp, source: this.name, raw: t
      }];
    }));
    return { events, nextCursor: next.in === "done" && next.out === "done" ? null : JSON.stringify(next), scanned: results.reduce((sum, r) => sum + r.transfers.length, 0),
      requestCount: directions.filter(direction=>state[direction]!=="done").length };
  }
}
