/**
 * FlowState — Anthropic Claude Sonnet (weekly summaries)
 *
 * Used once per week per client for the Sunday night narrative generation.
 * Higher quality, used sparingly.
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface WeeklySummaryInput {
  client: {
    full_name: string;
    chronotype: string;
    primary_goal: string | null;
    program_week: number;
    target_wake_time: string;
    target_bedtime: string;
    target_caffeine_cutoff: string;
    morning_light_duration_min: number;
    target_peak_window: string;
  };
  weekStats: {
    total_checkins: number;
    missed_checkins: number;
    avg_adherence: number | null;
    avg_energy: number | null;
    avg_focus: number | null;
    avg_sleep_hours: number | null;
    interventions_sent: number;
  };
  checkIns: Array<{
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
  }>;
}

/**
 * Generate a weekly narrative summary for a client using Claude Sonnet.
 * Returns a 200-300 word coach-perspective narrative.
 */
export async function generateWeeklySummary(input: WeeklySummaryInput): Promise<string> {
  const { client, weekStats, checkIns } = input;

  const checkInSummary = checkIns
    .map((ci) =>
      `${ci.type} @ ${ci.submitted_at}: energy=${ci.energy_rating ?? '?'}/10, ` +
      `focus=${ci.focus_rating ?? '?'}/10, sleep=${ci.sleep_hours ?? '?'}h, ` +
      `exercise=${ci.exercise_completed ? 'yes' : 'no'}, ` +
      `morning light=${ci.morning_light_completed ? 'yes' : 'no'}, ` +
      `caffeine cutoff met=${ci.caffeine_cutoff_met ? 'yes' : 'no'}` +
      (ci.client_note ? `, note: "${ci.client_note}"` : '')
    )
    .join('\n');

  const prompt = `You are a high-performance coach writing a weekly summary for your client.

CLIENT PROFILE
Name: ${client.full_name}
Chronotype: ${client.chronotype}
Goal: ${client.primary_goal ?? 'general human performance'}
Programme week: ${client.program_week} of 12
This week's targets: Wake ${client.target_wake_time} | Bed ${client.target_bedtime} | Caffeine cutoff ${client.target_caffeine_cutoff} | Morning light ${client.morning_light_duration_min} min | Peak ${client.target_peak_window}

WEEK STATS
Check-ins completed: ${weekStats.total_checkins} / ${weekStats.total_checkins + weekStats.missed_checkins} scheduled
Avg adherence: ${weekStats.avg_adherence ?? 'N/A'}%
Avg energy: ${weekStats.avg_energy ?? 'N/A'}/10
Avg focus: ${weekStats.avg_focus ?? 'N/A'}/10
Avg sleep: ${weekStats.avg_sleep_hours ?? 'N/A'} hours
Interventions sent this week: ${weekStats.interventions_sent}

INDIVIDUAL CHECK-INS
${checkInSummary || 'No check-ins recorded.'}

Write a 200-300 word weekly summary narrative from the coach's perspective. Include:
1. What went well this week (specific data points)
2. What to focus on next week (specific, actionable)
3. One observation about their pattern (chronotype-aware)

Tone: direct, warm, data-informed. Do not use bullet points — write in flowing paragraphs.`;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  return content.type === 'text' ? content.text.trim() : '';
}
