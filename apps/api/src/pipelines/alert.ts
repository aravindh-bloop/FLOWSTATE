/**
 * FlowState — Alert Pipeline
 *
 * Called after every check-in POST and missed-checkin event.
 * Recalculates rolling_7d_adherence, evaluates alert thresholds,
 * and creates intervention drafts via Groq if needed.
 */

import { query, queryOne } from '../db.js';
import { personaliseIntervention } from '../ai/groq.js';

interface Client {
  id: string;
  full_name: string;
  coach_id: string;
  rolling_7d_adherence: number;
  consecutive_missed_checkins: number;
  program_week: number;
  chronotype: string;
  primary_goal: string | null;
  target_wake_time: string;
  target_caffeine_cutoff: string;
}

interface Template {
  id: string;
  code: string;
  trigger_condition: string;
  message_template: string;
}

export async function runAlertPipeline(clientId: string): Promise<void> {
  const client = await queryOne<Client>(
    'SELECT * FROM clients WHERE id = $1',
    [clientId]
  );
  if (!client) return;

  // ── Recalculate rolling 7d adherence ────────────────────────────────────────
  const adherenceResult = await queryOne<{ avg: string | null }>(`
    SELECT ROUND(AVG(adherence_score)::numeric, 2) AS avg
    FROM check_ins
    WHERE client_id = $1
      AND submitted_at > NOW() - INTERVAL '7 days'
      AND adherence_score IS NOT NULL
  `, [clientId]);

  const newAdherence = parseFloat(adherenceResult?.avg ?? '0');
  await query(
    'UPDATE clients SET rolling_7d_adherence = $1, updated_at = now() WHERE id = $2',
    [newAdherence, clientId]
  );

  // ── Check for sleep declining ─────────────────────────────────────────────
  const sleepTrend = await queryOne<{ avg_sleep: string | null }>(`
    SELECT ROUND(AVG(sleep_hours)::numeric, 2) AS avg_sleep
    FROM check_ins
    WHERE client_id = $1
      AND submitted_at > NOW() - INTERVAL '3 days'
      AND sleep_hours IS NOT NULL
  `, [clientId]);
  const avgSleep3d = parseFloat(sleepTrend?.avg_sleep ?? '7');
  const sleepDeclining = avgSleep3d < 6;

  // ── Check for 7-day high-adherence streak ─────────────────────────────────
  const streakResult = await queryOne<{ count: string }>(`
    SELECT COUNT(*)::text AS count
    FROM check_ins
    WHERE client_id = $1
      AND submitted_at > NOW() - INTERVAL '7 days'
      AND adherence_score >= 90
  `, [clientId]);
  const highAdherenceStreak = Number(streakResult?.count ?? 0) >= 7;

  // ── Determine which alert to fire ─────────────────────────────────────────
  type TriggerCondition =
    | 'low_adherence'
    | 'missed_checkins_2'
    | 'missed_checkins_3plus'
    | 'sleep_declining'
    | 'high_adherence_streak';

  const missed = client.consecutive_missed_checkins;

  let triggerCondition: TriggerCondition | null = null;
  let templateCode: string | null = null;

  if (missed >= 3) {
    triggerCondition = 'missed_checkins_3plus';
    templateCode = 'INT-03';
  } else if (missed === 2) {
    triggerCondition = 'missed_checkins_2';
    templateCode = 'INT-02';
  } else if (newAdherence < 80 && newAdherence > 0) {
    triggerCondition = 'low_adherence';
    // INT-07 if peak window not shifting is harder to detect — use INT-04 (adherence drop)
    templateCode = 'INT-04';
  } else if (sleepDeclining) {
    triggerCondition = 'sleep_declining';
    templateCode = 'INT-06';
  } else if (highAdherenceStreak) {
    triggerCondition = 'high_adherence_streak';
    templateCode = 'INT-10';
  }

  if (!triggerCondition || !templateCode) return;

  // ── Check if a pending intervention already exists ────────────────────────
  const existingPending = await queryOne<{ id: string }>(`
    SELECT id FROM interventions
    WHERE client_id = $1
      AND trigger_condition = $2
      AND status IN ('pending', 'approved')
    LIMIT 1
  `, [clientId, triggerCondition]);

  if (existingPending) return; // don't double-create

  // ── Fetch template ────────────────────────────────────────────────────────
  const template = await queryOne<Template>(
    'SELECT * FROM intervention_templates WHERE code = $1 AND active = true',
    [templateCode]
  );
  if (!template) return;

  // ── Build variable substitution map ──────────────────────────────────────
  const variables: Record<string, string | number> = {
    name: client.full_name,
    adherence: Math.round(newAdherence),
    days: missed,
    weakness: newAdherence < 80 ? 'morning exercise adherence' : 'check-in consistency',
    avg_score: avgSleep3d.toFixed(1),
    weeks: client.program_week,
    current_peak: '09:00',
    target_peak: '08:00',
    minutes: 30,
  };

  // ── Personalise via Groq ──────────────────────────────────────────────────
  let draftMessage: string;
  try {
    draftMessage = await personaliseIntervention(
      template.message_template,
      variables,
      {
        name: client.full_name,
        adherence: newAdherence,
        consecutive_missed: missed,
        program_week: client.program_week,
        chronotype: client.chronotype,
        primary_goal: client.primary_goal,
        target_wake_time: client.target_wake_time,
        target_caffeine_cutoff: client.target_caffeine_cutoff,
        rolling_7d_adherence: newAdherence,
      }
    );
  } catch (err) {
    console.error('[alert-pipeline] Groq personalisation failed, using raw template', err);
    draftMessage = template.message_template.replace(/\{\{name\}\}/g, client.full_name);
  }

  // ── Create intervention + notify coach ────────────────────────────────────
  const triggerData = { adherence: newAdherence, missed, avg_sleep: avgSleep3d };

  const [intervention] = await query<{ id: string }>(`
    INSERT INTO interventions
      (client_id, coach_id, trigger_condition, trigger_data, template_id, draft_message, status)
    VALUES ($1, $2, $3, $4, $5, $6, 'pending')
    RETURNING id
  `, [
    clientId,
    client.coach_id,
    triggerCondition,
    JSON.stringify(triggerData),
    template.id,
    draftMessage,
  ]);

  await query('UPDATE clients SET intervention_flag = true WHERE id = $1', [clientId]);

  await query(`
    INSERT INTO notifications (user_id, type, title, body, linked_entity_type, linked_entity_id)
    VALUES ($1, 'coach_alert', $2, $3, 'intervention', $4)
  `, [
    client.coach_id,
    `Intervention needed: ${client.full_name}`,
    `Triggered by ${triggerCondition.replace(/_/g, ' ')}. Review and approve the draft in the Intervention Queue.`,
    intervention.id,
  ]);
}
