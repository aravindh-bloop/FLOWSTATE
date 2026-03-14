/**
 * FlowState Bot — Backend API client.
 *
 * All calls go through this module with the BOT_INTERNAL_API_TOKEN
 * in the X-Bot-Token header. Never exposes BetterAuth JWTs.
 */

const API_URL = process.env.BACKEND_URL ?? 'http://localhost:8080';
const BOT_TOKEN = process.env.BOT_INTERNAL_API_TOKEN;

async function botFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!BOT_TOKEN) throw new Error('BOT_INTERNAL_API_TOKEN is not set');

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Bot-Token': BOT_TOKEN,
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status} ${path}: ${body}`);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ─── Client lookup ────────────────────────────────────────────────────────────

export interface ClientRecord {
  id: string;
  full_name: string;
  discord_channel_id: string;
  discord_user_id: string | null;
  program_week: number;
  program_day: number;
  chronotype: string;
  target_wake_time: string;
  target_bedtime: string;
  target_caffeine_cutoff: string;
  morning_light_duration_min: number;
  morning_exercise_time: string;
  target_peak_window: string;
  rolling_7d_adherence: number;
  consecutive_missed_checkins: number;
  phase_name: string;
  month_theme: string;
}

export function getClientByChannel(channelId: string) {
  return botFetch<ClientRecord>(`/api/bot/client-by-channel/${channelId}`);
}

// ─── Check-in submission ──────────────────────────────────────────────────────

export interface CheckInPayload {
  client_id: string;
  discord_message_id: string;
  type: 'morning' | 'evening' | 'wearable';
  photo_url?: string;
  client_note?: string;
  ai_analysis?: string;
  ai_model_used?: string;
  adherence_score?: number;
  exercise_completed?: boolean;
  morning_light_completed?: boolean;
  caffeine_cutoff_met?: boolean;
  wake_time_actual?: string;
  sleep_hours?: number;
  energy_rating?: number;
  focus_rating?: number;
  wearable_hrv?: number;
  wearable_recovery_score?: number;
  wearable_sleep_score?: number;
  program_week: number;
  program_day: number;
}

export function submitCheckIn(payload: CheckInPayload) {
  return botFetch<{ checkinId: string; streak: number }>('/api/bot/checkin', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── Missed check-in ──────────────────────────────────────────────────────────

export function reportMissedCheckIn(clientId: string, type: 'morning' | 'evening') {
  return botFetch<void>('/api/bot/missed-checkin', {
    method: 'POST',
    body: JSON.stringify({ client_id: clientId, type }),
  });
}

// ─── Pending deliveries ───────────────────────────────────────────────────────

export interface PendingDelivery {
  id: string;
  client_id: string;
  final_message: string;
  discord_channel_id: string;
}

export function getPendingDeliveries() {
  return botFetch<PendingDelivery[]>('/api/bot/pending-deliveries');
}

export function confirmDelivery(interventionId: string, discordMessageId: string) {
  return botFetch<void>(`/api/bot/delivered/${interventionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ discord_message_id: discordMessageId }),
  });
}

// ─── Coach slash command helpers ──────────────────────────────────────────────

export function getClientStatus(clientId: string) {
  return botFetch<{
    id: string;
    full_name: string;
    discord_channel_id: string | null;
    rolling_7d_adherence: number;
    last_checkin_at: string | null;
    consecutive_missed_checkins: number;
    status: string;
  }>(`/api/bot/client/${clientId}`);
}

export function pauseClient(clientId: string) {
  return botFetch<void>(`/api/bot/client/${clientId}/pause`, {
    method: 'PATCH',
  });
}

export function getWeeklySummary(clientId: string) {
  return botFetch<Array<{ week_number: number; ai_narrative: string; avg_adherence: number }>>(
    `/api/bot/client/${clientId}/summaries`
  );
}

// ─── Verification code ────────────────────────────────────────────────────────

export function verifyClient(discordUserId: string, discordUsername: string, verificationCode: string) {
  return botFetch<{
    success: boolean;
    client_id?: string;
    full_name?: string;
    error?: string;
    discord_channel_id?: string;
  }>('/api/bot/verify', {
    method: 'POST',
    body: JSON.stringify({
      discord_user_id: discordUserId,
      discord_username: discordUsername,
      verification_code: verificationCode
    }),
  });
}
