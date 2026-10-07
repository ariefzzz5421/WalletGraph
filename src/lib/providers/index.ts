import { CHAINS, type Chain } from "@/lib/chains";
import { AlchemyProvider } from "./alchemy";
import { SolanaRpcProvider } from "./solana";
import type { BlockchainProvider } from "./types";
export function providerFor(chain: Chain): BlockchainProvider {
  return CHAINS[chain].type === "solana" ? new SolanaRpcProvider() : new AlchemyProvider();
}
