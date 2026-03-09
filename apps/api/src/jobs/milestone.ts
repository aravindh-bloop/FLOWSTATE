/**
 * Milestone trigger job (0 8 * * *)
 *
 * Daily 8am: check for clients at milestone weeks (2,4,6,8,12)
 * who haven't received their milestone assessment yet.
 */

import { query, queryOne } from '../db.js';

const MILESTONE_WEEKS = [2, 4, 6, 8, 12];
const MILESTONE_TEMPLATES: Record<number, string> = {
  2: 'INT-08',
  4: 'INT-09',
  6: 'INT-09',
  8: 'INT-09',
  12: 'INT-09',
};

export async function runMilestoneTrigger(): Promise<void> {
  console.log('[milestone] Running');

  const clients = await query<{
    id: string;
    full_name: string;
    coach_id: string;
    program_week: number;
  }>(
    `SELECT id, full_name, coach_id, program_week FROM clients
     WHERE status = 'active' AND program_week = ANY($1)`,
    [MILESTONE_WEEKS]
  );

  for (const client of clients) {
    // Check if milestone already exists for this week
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM milestones WHERE client_id = $1 AND week_number = $2',
      [client.id, client.program_week]
    );
    if (existing) continue;

    // Create empty milestone row to track that it was triggered
    await query(`
      INSERT INTO milestones (client_id, week_number)
      VALUES ($1, $2)
      ON CONFLICT (client_id, week_number) DO NOTHING
    `, [client.id, client.program_week]);

    // Queue milestone intervention
    const templateCode = MILESTONE_TEMPLATES[client.program_week];
    const template = await queryOne<{ id: string; message_template: string }>(
      'SELECT id, message_template FROM intervention_templates WHERE code = $1 AND active = true',
      [templateCode]
    );

    if (template) {
      const draftMessage = template.message_template.replace(/\{\{name\}\}/g, client.full_name);

      await query(`
        INSERT INTO interventions
          (client_id, coach_id, trigger_condition, trigger_data, template_id, draft_message, status)
        VALUES ($1, $2, 'milestone_week', $3, $4, $5, 'pending')
      `, [
        client.id,
        client.coach_id,
        JSON.stringify({ week: client.program_week }),
        template.id,
        draftMessage,
      ]);
    }

    // Insert milestone calendar event
    await query(`
      INSERT INTO calendar_events (client_id, title, type, scheduled_at, status)
      VALUES ($1, $2, 'milestone', NOW(), 'scheduled')
    `, [
      client.id,
      `Week ${client.program_week} Milestone Assessment`,
    ]);

    // Notify client
    await query(`
      INSERT INTO notifications (user_id, type, title, body, linked_entity_type, linked_entity_id)
      SELECT u.id, 'milestone', $2, $3, 'client', $4
      FROM clients c JOIN users u ON u.id = c.user_id
      WHERE c.id = $1
    `, [
      client.id,
      `Week ${client.program_week} Milestone`,
      `It's time for your Week ${client.program_week} assessment. Check your Discord channel for details.`,
      client.id,
    ]);

    console.log(`[milestone] Triggered week ${client.program_week} for ${client.full_name}`);
  }
}
