-- FlowState Seed Data
-- Generated from PRD v2.0.0
-- Run after schema.sql

-- ============================================================
-- SEED: program_phases (12 weeks)
-- ============================================================
INSERT INTO program_phases (
  week_number, phase_name, phase_month, month_theme,
  target_wake_time, target_bedtime, target_caffeine_cutoff,
  morning_light_duration_min, morning_exercise_time, target_peak_window,
  checkin_prompt_am, checkin_prompt_pm,
  milestone_assessment, notes
) VALUES
(1, 'Initial Assessment & Setup', 1, 'Attention Architecture',
 '07:30', '00:00', '14:00', 20, '07:00-07:30', '09:00-12:00',
 'Week 1 — Day {{program_day}}: Share your morning photo + how long you slept last night. Did you hit your 07:30 wake time?',
 'Week 1 evening: Rate your energy (1–10) and focus (1–10) today. Any blockers for tomorrow morning?',
 false, 'Baseline week — establish habits and gather assessment data.'),

(2, 'Interventions & Dashboard', 1, 'Attention Architecture',
 '07:15', '23:45', '13:00', 40, '06:45-07:15', '09:00-12:00',
 'Week 2 — Day {{program_day}}: Morning photo + actual wake time. Did you get 40 min of morning light?',
 'Week 2 evening: Energy (1–10), focus (1–10). Exercise done? Caffeine cutoff before 13:00?',
 true, 'First milestone assessment due. 7-day sleep diary submission.'),

(3, 'Optimization & Visualization', 1, 'Attention Architecture',
 '07:00', '23:30', '12:00', 40, '06:30-07:00', '08:30-12:00',
 'Week 3 — Day {{program_day}}: Photo check-in. Wake time target is 07:00 — how close did you get?',
 'Week 3 evening: Energy (1–10), focus (1–10). Morning light done? Peak window felt aligned?',
 false, NULL),

(4, 'Triggers & Schedule Building', 1, 'Attention Architecture',
 '07:00', '23:30', '12:00', 40, '06:30-07:00', '08:30-12:00',
 'Week 4 — Day {{program_day}}: Morning photo. Month 1 closing — how consistent has your morning routine been?',
 'Week 4 evening: Energy (1–10), focus (1–10). Rate this week overall (1–10). What worked?',
 true, 'Full Month 1 review — MEQ re-test + energy log due.'),

(5, 'Flow Triggers', 2, 'Flow State Engineering',
 '06:45', '23:30', '11:00', 40, '06:15-06:45', '08:00-12:00',
 'Week 5 — Day {{program_day}}: Photo + wake time. We shift to 06:45 this week — how did the earlier start feel?',
 'Week 5 evening: Energy (1–10), focus (1–10). Did you protect your 08:00–12:00 peak window?',
 false, 'Month 2 begins. Focus on flow trigger identification.'),

(6, 'Deep Work Architecture', 2, 'Flow State Engineering',
 '06:45', '23:30', '11:00', 40, '06:15-06:45', '08:00-12:00',
 'Week 6 — Day {{program_day}}: Morning photo. How many uninterrupted deep work blocks did you complete today?',
 'Week 6 evening: Energy (1–10), focus (1–10). Deep work blocks completed? Sleep quality last night?',
 true, 'Mid-programme milestone assessment.'),

(7, 'Recovery & Resilience', 2, 'Flow State Engineering',
 '06:30', '23:00', '11:00', 45, '06:00-06:30', '07:30-12:00',
 'Week 7 — Day {{program_day}}: Photo check-in. Target wake 06:30. Morning exercise completed by 06:30?',
 'Week 7 evening: Energy (1–10), focus (1–10). HRV or recovery score from wearable (if available)?',
 false, NULL),

(8, 'Consolidation', 2, 'Flow State Engineering',
 '06:30', '23:00', '11:00', 45, '06:00-06:30', '07:30-12:00',
 'Week 8 — Day {{program_day}}: Morning photo. Month 2 closing — peak window shifting earlier?',
 'Week 8 evening: Energy (1–10), focus (1–10). Rate this month overall. What has changed most?',
 true, 'Month 2 full review — wearable data, deep work log submission.'),

(9, 'Identity Anchoring', 3, 'Identity & Integration',
 '06:30', '23:00', '11:00', 45, '06:00-06:30', '07:30-11:30',
 'Week 9 — Day {{program_day}}: Photo. How automatic does your morning routine feel now? Rate 1–10.',
 'Week 9 evening: Energy (1–10), focus (1–10). Any identity shifts this week — who are you becoming?',
 false, 'Month 3 begins. Focus on habit identity anchoring.'),

(10, 'System Review', 3, 'Identity & Integration',
 '06:30', '23:00', '11:00', 45, '06:00-06:30', '07:30-11:30',
 'Week 10 — Day {{program_day}}: Morning photo. Review your full system — what still needs tightening?',
 'Week 10 evening: Energy (1–10), focus (1–10). What protocols will you carry forward after Day 90?',
 false, NULL),

(11, 'Autonomy Handoff', 3, 'Identity & Integration',
 '06:30', '22:45', '11:00', 45, '06:00-06:30', '07:00-11:00',
 'Week 11 — Day {{program_day}}: Final phase photo check-in. How are you managing your own schedule now?',
 'Week 11 evening: Energy (1–10), focus (1–10). What does your post-programme system look like?',
 false, 'Transition to self-managed routine. Coach moves to observer role.'),

(12, 'Day 90 Final Review', 3, 'Identity & Integration',
 '06:30', '22:45', '11:00', 45, '06:00-06:30', '07:00-11:00',
 'Week 12 — Final week photo. Day 90 is here — morning routine feeling locked in?',
 'Week 12 evening: Final ratings — energy (1–10), focus (1–10). What are your three biggest wins from this programme?',
 true, 'Day 90 final assessment. Complete MEQ, full energy log, and progress report.')

ON CONFLICT (week_number) DO NOTHING;


-- ============================================================
-- SEED: intervention_templates (10 core templates)
-- ============================================================
INSERT INTO intervention_templates (
  code, trigger_condition, name, message_template, variables, active
) VALUES
('INT-01', 'low_adherence', 'Morning Exercise Slipping',
 'Hey {{name}}, I noticed morning exercise has been tough this week ({{adherence}}% adherence). Let''s talk about what''s getting in the way — is it energy, timing, or motivation?',
 '["name", "adherence"]', true),

('INT-02', 'missed_checkins_2', '2 Missed Check-Ins',
 'Hey {{name}}, just checking in — missed your last two check-ins. Everything okay? Drop a quick reply when you get a chance.',
 '["name"]', true),

('INT-03', 'missed_checkins_3plus', '3+ Missed Check-Ins',
 '{{name}}, it''s been {{days}} days since your last check-in. I want to make sure you''re supported — reply here or let me know if you need to pause.',
 '["name", "days"]', true),

('INT-04', 'low_adherence', 'Weekly Adherence Drop',
 'Weekly check — you''re at {{adherence}}% this week. The data shows {{weakness}} is the main gap. Here''s a simplified protocol for the next 3 days...',
 '["adherence", "weakness"]', true),

('INT-05', 'phase_transition', 'Phase Transition',
 'You''re entering Week {{week}} — here''s what changes: wake time moves to {{wake_time}}, caffeine cutoff tightens to {{caffeine_cutoff}}. Your new morning routine card has been updated.',
 '["week", "wake_time", "caffeine_cutoff"]', true),

('INT-06', 'sleep_declining', 'Sleep Quality Declining',
 'Your sleep scores have been {{avg_score}} the past few days. A couple of things to check: post-exercise temperature, screen time after 9pm, and your caffeine cutoff.',
 '["avg_score"]', true),

('INT-07', 'low_adherence', 'Peak Window Not Shifting',
 'After {{weeks}} weeks, your peak is still around {{current_peak}} rather than {{target_peak}}. Let''s review morning light adherence — that''s usually the lever.',
 '["weeks", "current_peak", "target_peak"]', true),

('INT-08', 'milestone_week', 'Week 2 Milestone',
 'Week 2 check — time to submit your 7-day sleep diary and energy log. Head to your portal to complete the assessment.',
 '[]', true),

('INT-09', 'milestone_week', 'Week 4 Full Review',
 'Week 4 review — you''ve been on protocol for a month. Let''s measure the shift. Please complete the MEQ re-test + energy log in your portal.',
 '[]', true),

('INT-10', 'high_adherence_streak', '7-Day Streak',
 'Excellent — 7-day adherence at {{adherence}}%. Your data shows peak window moving earlier by {{minutes}} minutes. Keep this up through the weekend.',
 '["adherence", "minutes"]', true)

ON CONFLICT (code) DO NOTHING;
