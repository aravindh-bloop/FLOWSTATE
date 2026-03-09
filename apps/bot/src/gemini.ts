/**
 * FlowState Bot — Gemini Flash 2.0 vision analysis.
 *
 * Called after a client sends a check-in photo.
 * Returns structured feedback from the AI analysis prompt (PRD §discord_bot.ai_analysis_prompt).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ClientRecord } from './api.js';

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
const MODEL = 'gemini-2.0-flash';

export interface AnalysisResult {
  narrative: string;
  adherence_score: number | null;
  exercise_completed: boolean | null;
  morning_light_completed: boolean | null;
  caffeine_cutoff_met: boolean | null;
  wake_time_actual: string | null;
  sleep_hours: number | null;
  energy_rating: number | null;
  focus_rating: number | null;
}

/**
 * Analyse a check-in photo using Gemini Flash Vision.
 *
 * @param imageBuffer  Raw photo buffer downloaded from Discord
 * @param mimeType     e.g. 'image/jpeg'
 * @param client       Client record (used to build the prompt)
 * @param checkInType  'morning' | 'evening' | 'wearable'
 */
export async function analyseCheckInPhoto(
  imageBuffer: Buffer,
  mimeType: string,
  client: ClientRecord,
  checkInType: 'morning' | 'evening' | 'wearable'
): Promise<AnalysisResult> {
  const model = genai.getGenerativeModel({ model: MODEL });

  const prompt = buildPrompt(client, checkInType);

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType,
        data: imageBuffer.toString('base64'),
      },
    },
  ]);

  const text = result.response.text().trim();
  return parseAnalysis(text);
}

function buildPrompt(client: ClientRecord, checkInType: string): string {
  return `You are a performance coach assistant for FlowState.

Client context:
- Name: ${client.full_name}
- Week: ${client.program_week} of 12, Day: ${client.program_day}
- Phase: ${client.phase_name} (${client.month_theme})
- Chronotype: ${client.chronotype}
- Today's targets: Wake ${client.target_wake_time} | Light ${client.morning_light_duration_min}min | Exercise ${client.morning_exercise_time} | Caffeine cutoff ${client.target_caffeine_cutoff} | Peak window ${client.target_peak_window}
- 7-day adherence: ${client.rolling_7d_adherence}%
- Consecutive missed check-ins before this: ${client.consecutive_missed_checkins}

Analyse this ${checkInType} check-in photo. Respond in this EXACT JSON format:
{
  "narrative": "<max 120 words, direct coach tone, reference actual targets, be specific and encouraging>",
  "adherence_score": <0-100 or null>,
  "exercise_completed": <true/false/null>,
  "morning_light_completed": <true/false/null>,
  "caffeine_cutoff_met": <true/false/null>,
  "wake_time_actual": "<HH:MM or null>",
  "sleep_hours": <number or null>,
  "energy_rating": <1-10 or null>,
  "focus_rating": <1-10 or null>
}

Only output the JSON. No extra text.`;
}

function parseAnalysis(text: string): AnalysisResult {
  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(cleaned) as Partial<AnalysisResult>;
    return {
      narrative: parsed.narrative ?? 'Check-in received.',
      adherence_score: parsed.adherence_score ?? null,
      exercise_completed: parsed.exercise_completed ?? null,
      morning_light_completed: parsed.morning_light_completed ?? null,
      caffeine_cutoff_met: parsed.caffeine_cutoff_met ?? null,
      wake_time_actual: parsed.wake_time_actual ?? null,
      sleep_hours: parsed.sleep_hours ?? null,
      energy_rating: parsed.energy_rating ?? null,
      focus_rating: parsed.focus_rating ?? null,
    };
  } catch {
    // Fallback: return the raw text as narrative, nulls for all scores
    return {
      narrative: text.slice(0, 500),
      adherence_score: null,
      exercise_completed: null,
      morning_light_completed: null,
      caffeine_cutoff_met: null,
      wake_time_actual: null,
      sleep_hours: null,
      energy_rating: null,
      focus_rating: null,
    };
  }
}
