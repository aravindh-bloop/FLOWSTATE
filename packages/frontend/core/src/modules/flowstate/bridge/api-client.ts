/**
 * FlowState — Backend API client.
 *
 * Thin adapter that routes all FlowState data reads/writes
 * to our Hono backend instead of Affine's own backend.
 * The Discord bot, cron jobs, and AI calls all live on that backend.
 *
 * All requests automatically include the BetterAuth JWT stored in localStorage.
 */

import { getStoredToken } from '../auth/session';

const API_URL = (import.meta as unknown as { env: Record<string, string> }).env
  .NEXT_PUBLIC_API_URL ?? '';

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `API error ${res.status}: ${path}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  me: () => apiFetch<{ id: string; email: string; name: string; role: string }>('/api/auth/me'),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  coach: () => apiFetch('/api/dashboard/coach'),
  client: () => apiFetch('/api/dashboard/client'),
};

// ─── Clients ──────────────────────────────────────────────────────────────────

export const clientsApi = {
  list: () => apiFetch('/api/clients'),

  get: (id: string) => apiFetch(`/api/clients/${id}`),

  onboard: (data: unknown) =>
    apiFetch('/api/clients/onboard', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: unknown) =>
    apiFetch(`/api/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  setStatus: (id: string, status: string) =>
    apiFetch(`/api/clients/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// ─── Check-ins ────────────────────────────────────────────────────────────────

export const checkInsApi = {
  list: (clientId: string, page = 1, limit = 20) =>
    apiFetch(`/api/clients/${clientId}/checkins?page=${page}&limit=${limit}`),

  stats: (clientId: string) =>
    apiFetch(`/api/clients/${clientId}/checkins/stats`),
};

// ─── Calendar ─────────────────────────────────────────────────────────────────

export const calendarApi = {
  list: (clientId: string) =>
    apiFetch(`/api/clients/${clientId}/calendar`),

  reschedule: (eventId: string, scheduledAt: string) =>
    apiFetch(`/api/calendar/${eventId}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify({ scheduled_at: scheduledAt }),
    }),
};

// ─── Interventions ────────────────────────────────────────────────────────────

export const interventionsApi = {
  listAll: () => apiFetch('/api/interventions'),

  listForClient: (clientId: string) =>
    apiFetch(`/api/clients/${clientId}/interventions`),

  createManual: (data: unknown) =>
    apiFetch('/api/interventions/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  approve: (id: string) =>
    apiFetch(`/api/interventions/${id}/approve`, { method: 'PATCH' }),

  edit: (id: string, finalMessage: string) =>
    apiFetch(`/api/interventions/${id}/edit`, {
      method: 'PATCH',
      body: JSON.stringify({ final_message: finalMessage }),
    }),

  dismiss: (id: string) =>
    apiFetch(`/api/interventions/${id}/dismiss`, { method: 'PATCH' }),
};

// ─── Templates ────────────────────────────────────────────────────────────────

export const templatesApi = {
  list: () => apiFetch('/api/templates'),

  create: (data: unknown) =>
    apiFetch('/api/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: unknown) =>
    apiFetch(`/api/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    apiFetch(`/api/templates/${id}`, { method: 'DELETE' }),
};

// ─── Weekly summaries ─────────────────────────────────────────────────────────

export const summariesApi = {
  listForClient: (clientId: string) =>
    apiFetch(`/api/clients/${clientId}/summaries`),

  addNotes: (summaryId: string, notes: string) =>
    apiFetch(`/api/summaries/${summaryId}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ coach_notes: notes }),
    }),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationsApi = {
  list: () => apiFetch('/api/notifications'),

  markRead: (id: string) =>
    apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: () =>
    apiFetch('/api/notifications/read-all', { method: 'POST' }),
};

// ─── Registrations ────────────────────────────────────────────────────────────

export const registrationsApi = {
  create: (data: unknown) =>
    apiFetch('/api/registrations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (status?: string) =>
    apiFetch(`/api/registrations${status ? `?status=${status}` : ''}`),

  get: (id: string) => apiFetch(`/api/registrations/${id}`),

  approve: (id: string, programStartDate?: string) =>
    apiFetch(`/api/registrations/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify(programStartDate ? { program_start_date: programStartDate } : {}),
    }),

  reject: (id: string, reason?: string) =>
    apiFetch(`/api/registrations/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify(reason ? { reason } : {}),
    }),
};
