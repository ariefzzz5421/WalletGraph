import { enqueueDueWallets, claimJob, runJob, deliverAlerts } from "../../src/lib/sync";

async function tick() {
  await enqueueDueWallets();
  let job = await claimJob();
  while (job) { await runJob(job); job = await claimJob(); }
  await deliverAlerts();
}
console.log("WalletGraph worker started");
while (true) {
  try { await tick(); } catch (error) { console.error("Worker tick failed", error); }
  await new Promise(resolve => setTimeout(resolve,15000));
}
