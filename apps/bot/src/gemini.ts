/**
 * FlowState Bot — Gemini Flash vision analysis.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ClientRecord } from './api.js';

const apiKey = process.env.GEMINI_API_KEY ?? '';
const genai = new GoogleGenerativeAI(apiKey);
const MODEL = 'gemini-1.5-flash';

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
 * Analyze a check-in photo using Gemini Flash Vision in JSON mode.
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
  const model = genai.getGenerativeModel({ 
    model: MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
    }
  });

  const prompt = buildPrompt(client, checkInType);

  console.log(`[gemini] Analyzing ${checkInType} photo for ${client.full_name} (${MODEL})`);

  try {
    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: imageBuffer.toString('base64'),
        },
      },
    ]);

    const response = await result.response;
    const text = response.text().trim();
    return parseAnalysis(text);
  } catch (err: any) {
    console.error('[gemini] Analysis request failed:', err.message);
    return fallbackResult("I've received your check-in photo! I couldn't process the image details this time, but I've logged it for your coach to review.");
  }
}

function buildPrompt(client: ClientRecord, checkInType: string): string {
  const targets = [
    `Wake: ${client.target_wake_time}`,
    `Light: ${client.morning_light_duration_min}min`,
    `Exercise: ${client.morning_exercise_time}`,
    `Caffeine Cutoff: ${client.target_caffeine_cutoff}`,
    `Peak Window: ${client.target_peak_window}`
  ].join(' | ');

  return `You are a world-class performance coach for FlowState AI. 
Analyze this ${checkInType} check-in photo and provide structured coaching feedback.

Client Information:
- Name: ${client.full_name}
- Program: Week ${client.program_week} / Day ${client.program_day}
- Phase: ${client.phase_name} (Theme: ${client.month_theme})
- Chronotype: ${client.chronotype ?? 'Unknown'}
- Today's Targets: ${targets}
- Recent Adherence: ${client.rolling_7d_adherence}%
- Missing Days Streak: ${client.consecutive_missed_checkins}

TASK:
1. Examine the photo for evidence of targets hit (e.g., wake time on a watch, morning light/outdoors, exercise/gym, caffeine-free alternatives).
2. Rate adherence (0-100) based on how well they hit the ${checkInType} targets.
3. Write a supportive, direct, and concise narrative.

Return ONLY a JSON object:
{
  "narrative": "string (max 100 words, direct but encouraging coach-to-client tone)",
  "adherence_score": number (0-100) or null,
  "exercise_completed": boolean or null,
  "morning_light_completed": boolean or null,
  "caffeine_cutoff_met": boolean or null,
  "wake_time_actual": "string (HH:MM format) or null",
  "sleep_hours": number or null,
  "energy_rating": number (1-10) or null,
  "focus_rating": number (1-10) or null
}

IMPORTANT: Ensure all numeric values are numbers, not strings. All booleans must be true/false/null.`;
}

function parseAnalysis(text: string): AnalysisResult {
  try {
    const parsed = JSON.parse(text);
    
    const maybeNum = (val: any): number | null => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const n = parseFloat(val);
        return isNaN(n) ? null : n;
      }
      return null;
    };

    const maybeBool = (val: any): boolean | null => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'true') return true;
        if (val.toLowerCase() === 'false') return false;
      }
      return null;
    };

    return {
      narrative: typeof parsed.narrative === 'string' ? parsed.narrative : 'Check-in processed successfully.',
      adherence_score: maybeNum(parsed.adherence_score),
      exercise_completed: maybeBool(parsed.exercise_completed),
      morning_light_completed: maybeBool(parsed.morning_light_completed),
      caffeine_cutoff_met: maybeBool(parsed.caffeine_cutoff_met),
      wake_time_actual: typeof parsed.wake_time_actual === 'string' ? parsed.wake_time_actual : null,
      sleep_hours: maybeNum(parsed.sleep_hours),
      energy_rating: maybeNum(parsed.energy_rating),
      focus_rating: maybeNum(parsed.focus_rating),
    };
  } catch (err) {
    console.error('[gemini] JSON Parse failed for text:', text.slice(0, 100));
    return fallbackResult("I've received your check-in! The analysis had a technical hiccup, but your progress is logged.");
  }
}

function fallbackResult(narrative: string): AnalysisResult {
  return {
    narrative,
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
