import { createHash } from "node:crypto";
import type { Chain } from "@/lib/chains";
import { BlockchainProvider, ProviderUnavailable, type NormalizedEvent, type ProviderPage } from "./types";

type Sig = { signature: string; blockTime: number | null };
type Instruction = { program?: string; parsed?: { type?: string; info?: Record<string, string | number> } };
type Tx = { blockTime: number | null; transaction?: { message?: { instructions?: Instruction[] } } } | null;

export class SolanaRpcProvider implements BlockchainProvider {
  name = "Solana RPC";
  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    const url = process.env.SOLANA_RPC_URL;
    if (!url) throw new ProviderUnavailable("Solana RPC is not configured");
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(20000), cache: "no-store" });
    if (!response.ok) throw new ProviderUnavailable(`Solana RPC returned HTTP ${response.status}`);
    const body = await response.json() as { result?: T; error?: { message?: string } };
    if (body.error || body.result === undefined) throw new ProviderUnavailable(body.error?.message ?? "Solana RPC response unavailable");
    return body.result;
  }
  async getActivity(address: string, chain: Chain, cursor?: string, since?: Date): Promise<ProviderPage> {
    if (chain !== "solana") throw new ProviderUnavailable("Unsupported provider chain");
    const signatures = await this.rpc<Sig[]>("getSignaturesForAddress", [address, { limit: 50, ...(cursor ? { before: cursor } : {}) }]);
    const transactions: Tx[] = [];
    for (let i=0;i<signatures.length;i+=5) {
      const batch=await Promise.all(signatures.slice(i,i+5).map(s=>this.rpc<Tx>("getTransaction",[s.signature,{encoding:"jsonParsed",maxSupportedTransactionVersion:0}])));
      if(batch.some(tx=>tx===null)) throw new ProviderUnavailable("Some Solana transactions were unavailable; sync will retry");
      transactions.push(...batch);
    }
    const events: NormalizedEvent[] = [];
    transactions.forEach((tx, txIndex) => {
      const sig = signatures[txIndex];
      tx?.transaction?.message?.instructions?.forEach((instruction, index) => {
        const info = instruction.parsed?.info;
        if (instruction.program !== "system" || instruction.parsed?.type !== "transfer" || !info) return;
        const from = String(info.source ?? ""); const to = String(info.destination ?? "");
        if (from !== address && to !== address) return;
        const lamports = Number(info.lamports);
        if (!Number.isSafeInteger(lamports) || lamports < 0 || !tx.blockTime) return;
        const eventIndex = `${sig.signature}:${index}`;
        events.push({ eventKey: createHash("sha256").update(`solana:${eventIndex}`).digest("hex"), chain,
          txHash: sig.signature, eventIndex, eventType: "TRANSFER", direction: from === to ? "self" : from === address ? "out" : "in",
          fromAddress: from, toAddress: to, tokenSymbol: "SOL", tokenAddress: null, amount: String(lamports / 1e9),
          usdValue: null, occurredAt: new Date(tx.blockTime * 1000).toISOString(), source: this.name, raw: instruction });
      });
    });
    const oldest = signatures.at(-1)?.blockTime;
    const reachedCutoff = oldest && since && oldest * 1000 < since.getTime();
    return { events, nextCursor: signatures.length === 50 && !reachedCutoff ? signatures.at(-1)?.signature ?? null : null, scanned: signatures.length, requestCount:1+signatures.length };
  }
}
