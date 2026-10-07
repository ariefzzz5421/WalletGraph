import { z } from "zod";
import { chainSchema } from "@/lib/chains";
export const walletInput = z.object({
  name: z.string().trim().min(1).max(80),
  address: z.string().trim().min(20).max(60),
  chain: chainSchema,
  category: z.string().trim().max(60).optional().default(""),
  entityName: z.string().trim().max(80).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  alertLevel: z.enum(["off", "all"]).default("all"),
  backfill: z.enum(["latest", "7d", "30d", "90d", "full"]).default("latest")
});
export const alertInput = z.object({
  name: z.string().trim().min(1).max(80),
  walletId: z.uuid().nullable().optional(),
  eventType: z.enum(["TRANSFER", "NFT_TRANSFER"]).nullable().optional(),
  direction: z.enum(["in", "out", "self"]).nullable().optional(),
  chain: chainSchema.nullable().optional(),
  tokenSymbol: z.string().trim().max(40).nullable().optional(),
  minUsd: z.number().nonnegative().nullable().optional()
});
