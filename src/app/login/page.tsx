import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AccessForm } from "@/components/access-form";
export default async function LoginPage() {
  if(await currentUser()) redirect("/overview");
  return <main className="auth-screen"><section className="auth-brand"><div className="brand-mark large">WG<span>↗</span></div><p className="eyebrow">ON-CHAIN INTELLIGENCE PLATFORM</p><h1>Follow the wallet.<br/><em>Find the signal.</em></h1><p>Build a private watchlist, inspect verified transfers, and send meaningful alerts to your Discord server.</p><div className="auth-grid"><span>01 / TRACK</span><span>02 / VERIFY</span><span>03 / ALERT</span></div></section><section className="auth-card"><div className="panel-topline"><span>SITE ACCESS</span><span>WALLETGRAPH / 01</span></div><AccessForm/><p className="fine-print">No account is required. Blockchain data stays unavailable until a database and data source are configured.</p></section></main>;
}
