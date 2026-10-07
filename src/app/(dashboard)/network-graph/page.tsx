import { currentUser } from "@/lib/auth";
import { rows } from "@/lib/db";
import { NetworkGraph } from "@/components/network-graph";
import { PageHeader } from "@/components/ui";
import type { Chain } from "@/lib/chains";
export default async function GraphPage({searchParams}:{searchParams:Promise<{wallet?:string}>}){const user=(await currentUser())!;
  const wallets=await rows<{id:string;name:string;address:string;chain:Chain}>("SELECT id,name,address,chain FROM wallets WHERE user_id=$1 ORDER BY created_at DESC LIMIT 500",[user.id]);
  const params=await searchParams;
  return <><PageHeader eyebrow="INVESTIGATE / NETWORK" title="Wallet network" description="Explore direct, verified transfer links. An edge shows activity between addresses, not shared ownership."/><NetworkGraph wallets={wallets} initialWalletId={params.wallet}/><p className="data-note">Graph scope · Transfers indexed for your tracked wallets. Counterparty nodes can be explored where your indexed data contains more activity. USD filters await a verified price source.</p></>;
}
