/**
 * Phase transition job (0 0 * * *)
 *
 * Runs at midnight daily. Recalculates program_week for every active client.
 * If the week changed: updates protocol targets from program_phases, queues
 * a phase transition intervention (INT-05), inserts a calendar event.
 */

import { query, queryOne } from '../db.js';

export async function runPhaseTransitionCheck(): Promise<void> {
  console.log('[phase-transition] Running');

  const clients = await query<{
    id: string;
    full_name: string;
    coach_id: string;
    program_start_date: string;
    program_week: number;
    discord_channel_id: string | null;
  }>(
    "SELECT id, full_name, coach_id, program_start_date, program_week, discord_channel_id FROM clients WHERE status = 'active'"
  );

  for (const client of clients) {
    const start = new Date(client.program_start_date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const newWeek = Math.min(12, Math.ceil((diffDays + 1) / 7));
    const newDay = (diffDays % 7) + 1;

    if (newWeek === client.program_week) continue; // no change

    const phase = await queryOne<{
      phase_name: string;
      month_theme: string;
      target_wake_time: string;
      target_bedtime: string;
      target_caffeine_cutoff: string;
      morning_light_duration_min: number;
      morning_exercise_time: string;
      target_peak_window: string;
    }>('SELECT * FROM program_phases WHERE week_number = $1', [newWeek]);

    if (!phase) continue;

    // Update client protocol targets
    await query(`
      UPDATE clients SET
        program_week = $1,
        program_day = $2,
        target_wake_time = $3,
        target_bedtime = $4,
        target_caffeine_cutoff = $5,
        morning_light_duration_min = $6,
        morning_exercise_time = $7,
        target_peak_window = $8,
        updated_at = now()
      WHERE id = $9
    `, [
      newWeek, newDay,
      phase.target_wake_time, phase.target_bedtime, phase.target_caffeine_cutoff,
      phase.morning_light_duration_min, phase.morning_exercise_time, phase.target_peak_window,
      client.id,
    ]);

    // Queue INT-05 phase transition intervention
    const template = await queryOne<{ id: string; message_template: string }>(
      "SELECT id, message_template FROM intervention_templates WHERE code = 'INT-05' AND active = true"
    );

    if (template) {
      const draftMessage = template.message_template
        .replace(/\{\{name\}\}/g, client.full_name)
        .replace(/\{\{week\}\}/g, String(newWeek))
        .replace(/\{\{wake_time\}\}/g, phase.target_wake_time)
        .replace(/\{\{caffeine_cutoff\}\}/g, phase.target_caffeine_cutoff);

      await query(`
        INSERT INTO interventions
          (client_id, coach_id, trigger_condition, trigger_data, template_id, draft_message, status)
        VALUES ($1, $2, 'phase_transition', $3, $4, $5, 'pending')
      `, [
        client.id,
        client.coach_id,
        JSON.stringify({ new_week: newWeek, phase_name: phase.phase_name }),
        template.id,
        draftMessage,
      ]);
    }

    // Insert phase transition calendar event
    await query(`
      INSERT INTO calendar_events (client_id, title, type, scheduled_at, status)
      VALUES ($1, $2, 'phase_transition', NOW(), 'scheduled')
    `, [
      client.id,
      `Week ${newWeek} — ${phase.phase_name} (${phase.month_theme})`,
    ]);

    // Notify coach
    await query(`
      INSERT INTO notifications (user_id, type, title, body, linked_entity_type, linked_entity_id)
      VALUES ($1, 'phase_transition', $2, $3, 'client', $4)
    `, [
      client.coach_id,
      `${client.full_name} → Week ${newWeek}`,
      `${client.full_name} has entered Week ${newWeek}: ${phase.phase_name}. A phase transition intervention has been drafted.`,
      client.id,
    ]);

    console.log(`[phase-transition] ${client.full_name} advanced to Week ${newWeek}`);
  }
}
