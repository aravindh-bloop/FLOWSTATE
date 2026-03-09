/**
 * FlowState — Cron job registry.
 *
 * All jobs run inside the Railway backend process using node-cron.
 * Import this module once from src/index.ts to register all jobs.
 */

import cron from 'node-cron';
import { runCheckinReminders } from './reminders.js';
import { runMissedCheckinDetector } from './missed.js';
import { runPhaseTransitionCheck } from './phase-transition.js';
import { runWeeklySummaryGenerator } from './weekly-summary.js';
import { runMilestoneTrigger } from './milestone.js';
import { runCalendarHydrator } from './calendar-hydrate.js';

export function registerCronJobs(): void {
  console.log('[cron] Registering all jobs');

  // Every 15 min — AM check-in reminders
  cron.schedule('*/15 * * * *', async () => {
    await runCheckinReminders('morning').catch(console.error);
  });

  // Every 15 min — PM check-in reminders
  cron.schedule('*/15 * * * *', async () => {
    await runCheckinReminders('evening').catch(console.error);
  });

  // Every hour — missed check-in detector
  cron.schedule('0 * * * *', async () => {
    await runMissedCheckinDetector().catch(console.error);
  });

  // Midnight daily — phase transition check
  cron.schedule('0 0 * * *', async () => {
    await runPhaseTransitionCheck().catch(console.error);
  });

  // Sunday 1am — weekly summary generator
  cron.schedule('0 1 * * 0', async () => {
    await runWeeklySummaryGenerator().catch(console.error);
  });

  // Daily 8am — milestone trigger
  cron.schedule('0 8 * * *', async () => {
    await runMilestoneTrigger().catch(console.error);
  });

  // Monday midnight — calendar hydration
  cron.schedule('0 0 * * 1', async () => {
    await runCalendarHydrator().catch(console.error);
  });

  console.log('[cron] All jobs registered');
}
