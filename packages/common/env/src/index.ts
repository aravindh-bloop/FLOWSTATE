/**
 * Shared environment variable types and validation for FlowState.
 * Each app reads only the vars it needs — this file documents what exists.
 */

import { z } from 'zod';

// ─── API app env ──────────────────────────────────────────────────────────────
export const apiEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTERAUTH_SECRET: z.string().min(1),
  BETTERAUTH_URL: z.string().url(),
  BOT_INTERNAL_API_TOKEN: z.string().min(1),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  COACH_EMAIL: z.string().email().optional(),
  PORT: z.coerce.number().default(8080),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

// ─── Bot app env ──────────────────────────────────────────────────────────────
export const botEnvSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1),
  DISCORD_CLIENT_CATEGORY_ID: z.string().min(1),
  DISCORD_COACH_ROLE_ID: z.string().min(1),
  BOT_INTERNAL_API_TOKEN: z.string().min(1),
  BACKEND_URL: z.string().url(),
  CLOUDFLARE_R2_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().optional(),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().optional(),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().optional(),
});

export type BotEnv = z.infer<typeof botEnvSchema>;

// ─── Portal app env ───────────────────────────────────────────────────────────
export const portalEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  BETTERAUTH_SECRET: z.string().min(1),
  BETTERAUTH_URL: z.string().url(),
});

export type PortalEnv = z.infer<typeof portalEnvSchema>;
