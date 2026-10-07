import { Client, GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { db, one, rows } from "../../src/lib/db";
import { CHAINS, normalizeAddress, type Chain } from "../../src/lib/chains";
import { hashToken } from "../../src/lib/security";

if (!process.env.DISCORD_BOT_TOKEN) throw new Error("DISCORD_BOT_TOKEN is required");
const client = new Client({ intents:[GatewayIntentBits.Guilds] });
const chainChoices = Object.entries(CHAINS).map(([value,chain]) => ({name:chain.label,value}));
const commands = [
  new SlashCommandBuilder().setName("connect").setDescription("Link this server to WalletGraph")
    .addStringOption(o=>o.setName("code").setDescription("Pairing code from dashboard").setRequired(true)),
  new SlashCommandBuilder().setName("wallet").setDescription("Tracked wallet intelligence")
    .addSubcommand(s=>s.setName("info").setDescription("Show a tracked wallet").addStringOption(o=>o.setName("address").setDescription("Wallet address").setRequired(true)))
    .addSubcommand(s=>s.setName("activity").setDescription("Recent verified activity").addStringOption(o=>o.setName("address").setDescription("Wallet address").setRequired(true)))
    .addSubcommand(s=>s.setName("tags").setDescription("Wallet labels").addStringOption(o=>o.setName("address").setDescription("Wallet address").setRequired(true)))
    .addSubcommand(s=>s.setName("track").setDescription("Track a wallet").addStringOption(o=>o.setName("address").setDescription("Wallet address").setRequired(true))
      .addStringOption(o=>o.setName("chain").setDescription("Network").setRequired(true).addChoices(...chainChoices))
      .addStringOption(o=>o.setName("name").setDescription("Wallet name").setRequired(true)))
    .addSubcommand(s=>s.setName("remove").setDescription("Stop tracking a wallet").addStringOption(o=>o.setName("address").setDescription("Wallet address").setRequired(true))),
  new SlashCommandBuilder().setName("alerts").setDescription("WalletGraph alert rules")
    .addSubcommand(s=>s.setName("list").setDescription("List alert rules"))
];

client.once("ready", async () => {
  await client.application?.commands.set(commands.map(c=>c.toJSON()));
  console.log(`WalletGraph bot ready as ${client.user?.tag}`);
});
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand() || !interaction.guildId) return;
  await interaction.deferReply({ flags:64 });
  try {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply("Manage Server permission is required for wallet intelligence and connection commands."); return;
    }
    if (interaction.commandName === "connect") {
      const code = interaction.options.getString("code",true);
      const link = await one<{id:string}>("SELECT id FROM discord_connections WHERE pairing_hash=$1 AND pairing_expires_at>now() AND guild_id IS NULL",[hashToken(code)]);
      if (!link) { await interaction.editReply("Pairing code expired or invalid. Generate a new one in the dashboard."); return; }
      await db().query(`UPDATE discord_connections SET guild_id=$2,guild_name=$3,channel_id=$4,channel_name=$5,connected_at=now(),
        pairing_hash=NULL,pairing_expires_at=NULL WHERE id=$1 AND guild_id IS NULL`,[link.id,interaction.guildId,interaction.guild?.name??"Discord server",interaction.channelId,
        interaction.channel && "name" in interaction.channel ? interaction.channel.name : "alerts"]);
      await db().query("INSERT INTO audit_log(user_id,action,target_type,target_id) SELECT user_id,'discord.connect','guild',$2 FROM discord_connections WHERE id=$1",[link.id,interaction.guildId]);
      await interaction.editReply("Connected. WalletGraph alerts will arrive in this channel."); return;
    }
    const link = await one<{user_id:string}>("SELECT user_id FROM discord_connections WHERE guild_id=$1",[interaction.guildId]);
    if (!link) { await interaction.editReply("Connect this server from the WalletGraph dashboard first."); return; }
    if (interaction.commandName === "alerts") {
      const rules = await rows<{name:string;enabled:boolean}>("SELECT name,enabled FROM alert_rules WHERE user_id=$1 ORDER BY created_at DESC LIMIT 15",[link.user_id]);
      await interaction.editReply(rules.length ? rules.map(r=>`${r.enabled?"●":"○"} ${r.name}`).join("\n") : "No alert rules yet. Create one in the dashboard."); return;
    }
    if (interaction.commandName !== "wallet") return;
    const sub = interaction.options.getSubcommand();
    const rawAddress = interaction.options.getString("address",true).trim();
    if (sub === "track") {
      const chain = interaction.options.getString("chain",true) as Chain;
      const address = normalizeAddress(chain,rawAddress);
      const name = interaction.options.getString("name",true).trim().slice(0,80);
      if (!name) { await interaction.editReply("A wallet name is required."); return; }
      const wallet = await one<{id:string}>(`INSERT INTO wallets(user_id,chain,chain_type,address,name)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,chain,address) DO NOTHING RETURNING id`,[link.user_id,chain,CHAINS[chain].type,address,name]);
      if (!wallet) { await interaction.editReply("That wallet is already tracked on this chain."); return; }
      await db().query("INSERT INTO sync_jobs(wallet_id,mode) VALUES($1,'latest')",[wallet.id]);
      await db().query("INSERT INTO audit_log(user_id,action,target_type,target_id) VALUES($1,'wallet.create','wallet',$2)",[link.user_id,wallet.id]);
      await interaction.editReply(`Tracking ${name} on ${CHAINS[chain].label}. Sync is queued.`); return;
    }
    const wallets = await rows<{id:string;name:string;address:string;chain:Chain;sync_status:string}>("SELECT id,name,address,chain,sync_status FROM wallets WHERE user_id=$1 AND address=$2 LIMIT 10",[link.user_id,rawAddress.startsWith("0x")?rawAddress.toLowerCase():rawAddress]);
    if (!wallets.length) { await interaction.editReply("Wallet is not in this account's watchlist."); return; }
    if (wallets.length>1) { await interaction.editReply("Address exists on multiple chains. Use the dashboard to select the network."); return; }
    const wallet=wallets[0];
    if (sub === "remove") {
      await db().query("DELETE FROM wallets WHERE id=$1 AND user_id=$2",[wallet.id,link.user_id]);
      await db().query("INSERT INTO audit_log(user_id,action,target_type,target_id) VALUES($1,'wallet.delete','wallet',$2)",[link.user_id,wallet.id]);
      await interaction.editReply(`Stopped tracking ${wallet.name}.`); return;
    }
    if (sub === "tags") {
      const tags=await rows<{name:string}>("SELECT t.name FROM tags t JOIN wallet_tags wt ON wt.tag_id=t.id WHERE wt.wallet_id=$1 ORDER BY t.name",[wallet.id]);
      await interaction.editReply(tags.length?`${wallet.name}: ${tags.map(t=>t.name).join(", ")}`:`${wallet.name} has no custom tags.`); return;
    }
    if (sub === "activity") {
      const events=await rows<{event_type:string;direction:string;amount:string|null;token_symbol:string|null;tx_hash:string}>("SELECT event_type,direction,amount,token_symbol,tx_hash FROM wallet_events WHERE wallet_id=$1 ORDER BY occurred_at DESC LIMIT 5",[wallet.id]);
      await interaction.editReply(events.length?events.map(e=>`${e.direction.toUpperCase()} ${e.event_type}: ${e.amount??"?"} ${e.token_symbol??"unknown token"} · ${e.tx_hash.slice(0,12)}…`).join("\n"):"No verified activity indexed yet."); return;
    }
    const count=await one<{count:string}>("SELECT count(*)::text AS count FROM wallet_events WHERE wallet_id=$1",[wallet.id]);
    await interaction.editReply(`**${wallet.name}**\n${CHAINS[wallet.chain].label} · ${wallet.address}\nIndexed events: ${count?.count??"0"}\nSync: ${wallet.sync_status}\nPortfolio value: Unknown`);
  } catch(error) {
    console.error("Discord command failed",error);
    await interaction.editReply(error instanceof Error && error.message === "INVALID_ADDRESS" ? "Invalid address for that chain." : "Command failed. Try again shortly.");
  }
});
client.login(process.env.DISCORD_BOT_TOKEN);
