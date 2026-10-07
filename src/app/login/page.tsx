import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { AuthForm } from "@/components/auth-form";
export default async function LoginPage() {
  if(await currentUser()) redirect("/overview");
  const registration=await one<{open:boolean}>("SELECT NOT EXISTS(SELECT 1 FROM users) AS open");
  return <main className="auth-screen"><section className="auth-brand"><div className="brand-mark large">WG<span>↗</span></div><p className="eyebrow">ON-CHAIN INTELLIGENCE PLATFORM</p><h1>Follow the wallet.<br/><em>Find the signal.</em></h1><p>Build a private watchlist, inspect verified transfers, and send meaningful alerts to your Discord server.</p><div className="auth-grid"><span>01 / TRACK</span><span>02 / VERIFY</span><span>03 / ALERT</span></div></section><section className="auth-card"><div className="panel-topline"><span>SECURE ACCESS</span><span>WALLETGRAPH / 01</span></div><AuthForm registrationOpen={registration?.open??false}/><p className="fine-print">Your watchlist is private to your account. WalletGraph does not request wallet connections or private keys.</p></section></main>;
}
