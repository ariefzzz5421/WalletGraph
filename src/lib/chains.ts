import { z } from "zod";

export const CHAINS = {
  ethereum: { label: "Ethereum", type: "evm", rpcHost: "eth-mainnet", explorer: "https://etherscan.io/tx/" },
  base: { label: "Base", type: "evm", rpcHost: "base-mainnet", explorer: "https://basescan.org/tx/" },
  solana: { label: "Solana", type: "solana", rpcHost: null, explorer: "https://solscan.io/tx/" },
  avalanche: { label: "Avalanche", type: "evm", rpcHost: "avax-mainnet", explorer: "https://snowtrace.io/tx/" },
  arbitrum: { label: "Arbitrum", type: "evm", rpcHost: "arb-mainnet", explorer: "https://arbiscan.io/tx/" },
  optimism: { label: "Optimism", type: "evm", rpcHost: "opt-mainnet", explorer: "https://optimistic.etherscan.io/tx/" },
  polygon: { label: "Polygon", type: "evm", rpcHost: "polygon-mainnet", explorer: "https://polygonscan.com/tx/" },
  bnb: { label: "BNB Chain", type: "evm", rpcHost: "bnb-mainnet", explorer: "https://bscscan.com/tx/" }
} as const;
export type Chain = keyof typeof CHAINS;
export const chainSchema = z.enum(Object.keys(CHAINS) as [Chain, ...Chain[]]);
const evmAddress = /^0x[a-fA-F0-9]{40}$/;
const solAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export function normalizeAddress(chain: Chain, address: string) {
  const clean = address.trim();
  if (CHAINS[chain].type === "evm") {
    if (!evmAddress.test(clean)) throw new Error("INVALID_ADDRESS");
    return clean.toLowerCase();
  }
  if (!solAddress.test(clean)) throw new Error("INVALID_ADDRESS");
  return clean;
}
export function providerConfigured(chain: Chain) {
  return CHAINS[chain].type === "solana" ? Boolean(process.env.SOLANA_RPC_URL) : Boolean(process.env.ALCHEMY_API_KEY);
}
