-- FlowState Database Schema
-- Generated from PRD v2.0.0
-- PostgreSQL (NeonDB serverless)

-- ============================================================
-- TABLE: users
-- BetterAuth-managed. One row per user.
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                text UNIQUE NOT NULL,
  name                 text NOT NULL,
  role                 text NOT NULL CHECK (role IN ('coach', 'client')),
  must_change_password boolean DEFAULT false,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- ============================================================
-- TABLE: intervention_templates
-- 25 reusable intervention message templates.
-- No FK dependencies — created before interventions.
-- ============================================================
CREATE TABLE IF NOT EXISTS intervention_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text UNIQUE NOT NULL,
  trigger_condition text NOT NULL,
  name             text NOT NULL,
  message_template text NOT NULL,
  variables        jsonb DEFAULT '[]',
  active           boolean DEFAULT true,
  use_count        integer DEFAULT 0,
  created_at       timestamptz DEFAULT now()
);

-- ============================================================
-- TABLE: program_phases
-- Master weekly protocol targets for all 12 weeks.
-- Seeded once, shared across all clients.
-- ============================================================
CREATE TABLE IF NOT EXISTS program_phases (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number               integer UNIQUE NOT NULL,
  phase_name                text NOT NULL,
  phase_month               integer NOT NULL CHECK (phase_month IN (1, 2, 3)),
  month_theme               text NOT NULL,
  target_wake_time          time NOT NULL,
  target_bedtime            time NOT NULL,
  target_caffeine_cutoff    time NOT NULL,
  morning_light_duration_min integer NOT NULL,
  morning_exercise_time     text NOT NULL,
  target_peak_window        text NOT NULL,
  checkin_prompt_am         text NOT NULL,
  checkin_prompt_pm         text NOT NULL,
  milestone_assessment      boolean DEFAULT false,
  notes                     text
);

-- ============================================================
-- TABLE: registrations
-- Landing page form submissions. Coach approves → provision pipeline.
-- ============================================================
CREATE TABLE IF NOT EXISTS registrations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name            text NOT NULL,
  email                text NOT NULL,
  phone                text,
  discord_user_id      text,
  preferred_start_date date,
  key_changes          text,
  short_term_goals     text,
  long_term_goals      text,
  goal_motivation      text,
  bottlenecks          text,
  checkin_time_am      text,
  current_wake_time    text,
  peak_mental_time     text,
  wearable_device      text,
  status               text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by          uuid REFERENCES users(id),
  reviewed_at          timestamptz,
  created_at           timestamptz DEFAULT now()
);

-- ============================================================
-- TABLE: clients
-- Extended profile for client users.
-- Single source of truth for all automation.
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid REFERENCES users(id) ON DELETE CASCADE,
  coach_id                    uuid REFERENCES users(id) NOT NULL,
  full_name                   text NOT NULL,
  discord_user_id             text UNIQUE,
  discord_username            text,
  discord_channel_id          text UNIQUE,
  discord_verification_code   text,
  affine_workspace_id         text UNIQUE,
  program_start_date          date NOT NULL,
  program_end_date            date GENERATED ALWAYS AS (program_start_date + INTERVAL '90 days') STORED,
  program_week                integer DEFAULT 1,
  program_day                 integer DEFAULT 1,
  status                      text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed')),
  chronotype                  text CHECK (chronotype IN ('Morning', 'Intermediate', 'Evening')),
  meq_score                   integer CHECK (meq_score BETWEEN 16 AND 86),
  primary_goal                text,
  signature_focus_areas       jsonb DEFAULT '[]',
  onboarding_responses        jsonb DEFAULT '{}',
  target_wake_time            time DEFAULT '07:30',
  target_bedtime              time DEFAULT '23:30',
  target_caffeine_cutoff      time DEFAULT '14:00',
  morning_light_duration_min  integer DEFAULT 20,
  morning_exercise_time       text DEFAULT '07:00-07:30',
  target_peak_window          text DEFAULT '09:00-12:00',
  checkin_time_am             time DEFAULT '06:30',
  checkin_time_pm             time DEFAULT '20:00',
  rolling_7d_adherence        numeric(5,2) DEFAULT 0,
  consecutive_missed_checkins integer DEFAULT 0,
  streak_count               integer DEFAULT 0,
  streak_count                integer DEFAULT 0,
  last_checkin_at             timestamptz,
  intervention_flag           boolean DEFAULT false,
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now()
);

-- ============================================================
-- TABLE: check_ins
-- Every check-in submitted via Discord. One row per event.
-- ============================================================
CREATE TABLE IF NOT EXISTS check_ins (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                uuid REFERENCES clients(id) ON DELETE CASCADE,
  discord_message_id       text UNIQUE,
  type                     text NOT NULL CHECK (type IN ('morning', 'evening', 'wearable')),
  submitted_at             timestamptz NOT NULL DEFAULT now(),
  photo_url                text,
  client_note              text,
  ai_analysis              text,
  ai_model_used            text,
  adherence_score          numeric(5,2),
  exercise_completed       boolean,
  morning_light_completed  boolean,
  caffeine_cutoff_met      boolean,
  wake_time_actual         time,
  sleep_hours              numeric(4,2),
  energy_rating            integer CHECK (energy_rating BETWEEN 1 AND 10),
  focus_rating             integer CHECK (focus_rating BETWEEN 1 AND 10),
  wearable_hrv             numeric(6,2),
  wearable_recovery_score  integer,
  wearable_sleep_score     integer,
  program_week             integer NOT NULL,
  program_day              integer NOT NULL,
  created_at               timestamptz DEFAULT now()
);

-- ============================================================
-- TABLE: interventions
-- System auto-creates, coach reviews, bot delivers.
-- ============================================================
CREATE TABLE IF NOT EXISTS interventions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid REFERENCES clients(id) ON DELETE CASCADE,
  coach_id          uuid REFERENCES users(id),
  trigger_condition text NOT NULL CHECK (trigger_condition IN (
    'low_adherence',
    'missed_checkins_2',
    'missed_checkins_3plus',
    'phase_transition',
    'milestone_week',
    'sleep_declining',
    'high_adherence_streak',
    'manual'
  )),
  trigger_data      jsonb NOT NULL DEFAULT '{}',
  template_id       uuid REFERENCES intervention_templates(id),
  draft_message     text NOT NULL,
  final_message     text,
  status            text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'modified', 'sent', 'dismissed')),
  delivered_via     text DEFAULT 'discord',
  discord_message_id text,
  client_response   text,
  outcome_notes     text,
  created_at        timestamptz DEFAULT now(),
  approved_at       timestamptz,
  sent_at           timestamptz
);

-- ============================================================
-- TABLE: calendar_events
-- Per-client calendar. Auto-populated by cron jobs.
-- ============================================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id              uuid REFERENCES clients(id) ON DELETE CASCADE,
  title                  text NOT NULL,
  type                   text NOT NULL CHECK (type IN (
    'checkin_scheduled',
    'checkin_completed',
    'checkin_missed',
    'phase_transition',
    'milestone',
    'intervention',
    'coach_note'
  )),
  scheduled_at           timestamptz NOT NULL,
  completed_at           timestamptz,
  status                 text DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'completed', 'missed', 'rescheduled', 'cancelled'
  )),
  rescheduled_to         timestamptz,
  linked_checkin_id      uuid REFERENCES check_ins(id),
  linked_intervention_id uuid REFERENCES interventions(id),
  notes                  text,
  created_at             timestamptz DEFAULT now()
);

-- ============================================================
-- TABLE: weekly_summaries
-- Auto-generated every Sunday night via Claude Sonnet.
-- ============================================================
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          uuid REFERENCES clients(id) ON DELETE CASCADE,
  week_number        integer NOT NULL,
  generated_at       timestamptz DEFAULT now(),
  total_checkins     integer DEFAULT 0,
  missed_checkins    integer DEFAULT 0,
  avg_adherence      numeric(5,2),
  avg_energy         numeric(4,2),
  avg_focus          numeric(4,2),
  avg_sleep_hours    numeric(4,2),
  interventions_sent integer DEFAULT 0,
  ai_narrative       text,
  coach_notes        text,
  UNIQUE (client_id, week_number)
);

-- ============================================================
-- TABLE: milestones
-- Assessment snapshots at weeks 2, 4, 6, 8, 12.
-- ============================================================
CREATE TABLE IF NOT EXISTS milestones (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                  uuid REFERENCES clients(id) ON DELETE CASCADE,
  week_number                integer NOT NULL,
  meq_score                  integer,
  chronotype                 text,
  rcs_hours_per_week         numeric(5,2),
  deep_work_blocks_per_week  integer,
  avg_energy_rating          numeric(4,2),
  avg_focus_rating           numeric(4,2),
  avg_sleep_hours            numeric(4,2),
  wearable_hrv_avg           numeric(6,2),
  notes                      text,
  completed_at               timestamptz,
  UNIQUE (client_id, week_number)
);

-- ============================================================
-- TABLE: notifications
-- In-portal notification log. Powers the notification bell.
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid REFERENCES users(id) ON DELETE CASCADE,
  type               text NOT NULL CHECK (type IN (
    'checkin_reminder',
    'intervention',
    'phase_transition',
    'milestone',
    'weekly_summary_ready',
    'coach_alert',
    'streak'
  )),
  title              text NOT NULL,
  body               text NOT NULL,
  read               boolean DEFAULT false,
  linked_entity_type text,
  linked_entity_id   uuid,
  created_at         timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clients_user_id             ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_coach_id            ON clients(coach_id);
CREATE INDEX IF NOT EXISTS idx_clients_discord_channel_id  ON clients(discord_channel_id);
CREATE INDEX IF NOT EXISTS idx_clients_status              ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_checkin_time_am     ON clients(checkin_time_am);
CREATE INDEX IF NOT EXISTS idx_clients_checkin_time_pm     ON clients(checkin_time_pm);

CREATE INDEX IF NOT EXISTS idx_check_ins_client_id         ON check_ins(client_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_submitted_at      ON check_ins(submitted_at);
CREATE INDEX IF NOT EXISTS idx_check_ins_type              ON check_ins(type);

CREATE INDEX IF NOT EXISTS idx_calendar_events_client_id   ON calendar_events(client_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_scheduled   ON calendar_events(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status      ON calendar_events(status);

CREATE INDEX IF NOT EXISTS idx_interventions_client_id     ON interventions(client_id);
CREATE INDEX IF NOT EXISTS idx_interventions_status        ON interventions(status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id       ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read          ON notifications(read);

CREATE INDEX IF NOT EXISTS idx_weekly_summaries_client_id  ON weekly_summaries(client_id);
CREATE INDEX IF NOT EXISTS idx_milestones_client_id        ON milestones(client_id);

CREATE INDEX IF NOT EXISTS idx_registrations_status        ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_email         ON registrations(email);
