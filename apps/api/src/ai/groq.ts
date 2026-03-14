/**
 * FlowState — Groq AI (llama-3.3-70b)
 *
 * Used to personalise intervention draft messages with client-specific data.
 * Near-free, fast — used for every auto-generated intervention draft.
 */

import Groq from 'groq-sdk';

// @ts-ignore
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface ClientContext {
  name: string;
  adherence: number;
  consecutive_missed: number;
  program_week: number;
  chronotype: string;
  primary_goal: string | null;
  target_wake_time: string;
  target_caffeine_cutoff: string;
  rolling_7d_adherence: number;
}

/**
 * Personalise an intervention template message using Groq.
 *
 * @param template  The raw message_template string from intervention_templates
 * @param variables Key-value pairs extracted from client context
 * @param client    Client context for deeper personalisation
 */
export async function personaliseIntervention(
  template: string,
  variables: Record<string, string | number>,
  client: ClientContext
): Promise<string> {
  // Simple variable substitution first
  let message = template;
  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
  }

  // Replace remaining {{name}} placeholder
  message = message.replace(/\{\{name\}\}/g, client.name);

  const prompt = `You are a human performance coach assistant for FlowState.
Personalise the following intervention message for a specific client. Keep the core message and tone, but make it feel personal and specific to their situation.

Client context:
- Name: ${client.name}
- Chronotype: ${client.chronotype}
- Program week: ${client.program_week} of 12
- Goal: ${client.primary_goal ?? 'general performance'}
- 7-day adherence: ${client.rolling_7d_adherence}%
- Consecutive missed check-ins: ${client.consecutive_missed}
- Target wake time: ${client.target_wake_time}
- Caffeine cutoff: ${client.target_caffeine_cutoff}

Draft message:
${message}

Rules:
- Keep it under 120 words
- Sound like a real coach, not a bot
- Reference their actual data (wake time, adherence %) where natural
- Do NOT add sign-offs or signatures
- Output ONLY the final message text`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 200,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content?.trim() ?? message;
}
