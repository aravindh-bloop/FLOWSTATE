/**
 * Weekly summary generator (0 1 * * 0) — Sunday 1am
 *
 * For each active client: aggregate the past 7 days of check-ins,
 * call Claude Sonnet for the narrative, insert weekly_summaries row,
 * notify coach.
 */

import { query, queryOne } from '../db.js';
import { generateWeeklySummary } from '../ai/claude.js';

export async function runWeeklySummaryGenerator(): Promise<void> {
  console.log('[weekly-summary] Running');

  const clients = await query<{
    id: string;
    full_name: string;
    coach_id: string;
    program_week: number;
    chronotype: string;
    primary_goal: string | null;
    target_wake_time: string;
    target_bedtime: string;
    target_caffeine_cutoff: string;
    morning_light_duration_min: number;
    target_peak_window: string;
  }>(
    "SELECT id, full_name, coach_id, program_week, chronotype, primary_goal, target_wake_time, target_bedtime, target_caffeine_cutoff, morning_light_duration_min, target_peak_window FROM clients WHERE status = 'active'"
  );

  for (const client of clients) {
    try {
      await generateAndSaveSummary(client);
    } catch (err) {
      console.error(`[weekly-summary] Failed for ${client.full_name}:`, err);
    }
  }

  console.log(`[weekly-summary] Done — ${clients.length} clients processed`);
}

async function generateAndSaveSummary(client: {
  id: string;
  full_name: string;
  coach_id: string;
  program_week: number;
  chronotype: string;
  primary_goal: string | null;
  target_wake_time: string;
  target_bedtime: string;
  target_caffeine_cutoff: string;
  morning_light_duration_min: number;
  target_peak_window: string;
}): Promise<void> {
  // Gather past 7 days of check-ins
  const checkIns = await query<{
    type: string;
    submitted_at: string;
    adherence_score: number | null;
    energy_rating: number | null;
    focus_rating: number | null;
    sleep_hours: number | null;
    exercise_completed: boolean | null;
    morning_light_completed: boolean | null;
    caffeine_cutoff_met: boolean | null;
    client_note: string | null;
  }>(`
    SELECT type, submitted_at, adherence_score, energy_rating, focus_rating,
           sleep_hours, exercise_completed, morning_light_completed,
           caffeine_cutoff_met, client_note
    FROM check_ins
    WHERE client_id = $1 AND submitted_at > NOW() - INTERVAL '7 days'
    ORDER BY submitted_at ASC
  `, [client.id]);

  // Calculate missed check-ins: expected 14 (2/day × 7 days)
  const expectedCheckins = 14;
  const totalCheckins = checkIns.length;
  const missedCheckins = Math.max(0, expectedCheckins - totalCheckins);

  const weekStats = {
    total_checkins: totalCheckins,
    missed_checkins: missedCheckins,
    avg_adherence: avg(checkIns.map((c) => c.adherence_score)),
    avg_energy: avg(checkIns.map((c) => c.energy_rating)),
    avg_focus: avg(checkIns.map((c) => c.focus_rating)),
    avg_sleep_hours: avg(checkIns.map((c) => c.sleep_hours)),
    interventions_sent: 0, // filled below
  };

  const interventionCount = await queryOne<{ count: string }>(`
    SELECT COUNT(*)::text AS count
    FROM interventions
    WHERE client_id = $1 AND status = 'sent'
      AND sent_at > NOW() - INTERVAL '7 days'
  `, [client.id]);

  weekStats.interventions_sent = Number(interventionCount?.count ?? 0);

  // Generate Claude narrative
  const aiNarrative = await generateWeeklySummary({
    client: {
      full_name: client.full_name,
      chronotype: client.chronotype,
      primary_goal: client.primary_goal,
      program_week: client.program_week,
      target_wake_time: client.target_wake_time,
      target_bedtime: client.target_bedtime,
      target_caffeine_cutoff: client.target_caffeine_cutoff,
      morning_light_duration_min: client.morning_light_duration_min,
      target_peak_window: client.target_peak_window,
    },
    weekStats,
    checkIns,
  });

  // Upsert weekly_summaries row
  await query(`
    INSERT INTO weekly_summaries (
      client_id, week_number, total_checkins, missed_checkins,
      avg_adherence, avg_energy, avg_focus, avg_sleep_hours,
      interventions_sent, ai_narrative
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (client_id, week_number) DO UPDATE SET
      total_checkins = EXCLUDED.total_checkins,
      missed_checkins = EXCLUDED.missed_checkins,
      avg_adherence = EXCLUDED.avg_adherence,
      avg_energy = EXCLUDED.avg_energy,
      avg_focus = EXCLUDED.avg_focus,
      avg_sleep_hours = EXCLUDED.avg_sleep_hours,
      interventions_sent = EXCLUDED.interventions_sent,
      ai_narrative = EXCLUDED.ai_narrative,
      generated_at = now()
  `, [
    client.id, client.program_week,
    weekStats.total_checkins, weekStats.missed_checkins,
    weekStats.avg_adherence, weekStats.avg_energy,
    weekStats.avg_focus, weekStats.avg_sleep_hours,
    weekStats.interventions_sent, aiNarrative,
  ]);

  // Notify coach
  await query(`
    INSERT INTO notifications (user_id, type, title, body, linked_entity_type, linked_entity_id)
    SELECT $1, 'weekly_summary_ready', $2, $3, 'client', $4
  `, [
    client.coach_id,
    `Week ${client.program_week} summary ready: ${client.full_name}`,
    `AI-generated summary for week ${client.program_week} is ready for review.`,
    client.id,
  ]);

  console.log(`[weekly-summary] Generated for ${client.full_name} week ${client.program_week}`);
}

function avg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100;
}
