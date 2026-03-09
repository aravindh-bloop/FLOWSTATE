/**
 * FlowState — shared TypeScript types.
 * Mirrors the NeonDB schema defined in /db/schema.sql and PRD.
 */

export interface Registration {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  discord_user_id?: string;
  preferred_start_date: string;
  key_changes?: string;
  short_term_goals?: string;
  long_term_goals?: string;
  goal_motivation?: string;
  bottlenecks?: string;
  checkin_time_am?: string;
  current_wake_time?: string;
  peak_mental_time?: string;
  wearable_device?: string;

  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  coach_id: string;
  full_name: string;
  discord_user_id?: string;
  discord_channel_id?: string;
  affine_workspace_id?: string;
  program_start_date: string;
  program_end_date: string;
  program_week: number;
  program_day: number;
  status: 'pending' | 'active' | 'paused' | 'completed';
  chronotype?: 'Morning' | 'Intermediate' | 'Evening';
  meq_score?: number;
  primary_goal?: string;
  signature_focus_areas: string[];
  onboarding_responses: Record<string, unknown>;
  target_wake_time: string;
  target_bedtime: string;
  target_caffeine_cutoff: string;
  morning_light_duration_min: number;
  morning_exercise_time: string;
  target_peak_window: string;
  checkin_time_am: string;
  checkin_time_pm: string;
  rolling_7d_adherence: number;
  consecutive_missed_checkins: number;
  last_checkin_at?: string;
  intervention_flag: boolean;
  created_at: string;
  updated_at: string;
}

export interface CheckIn {
  id: string;
  client_id: string;
  discord_message_id?: string;
  type: 'morning' | 'evening' | 'wearable';
  submitted_at: string;
  photo_url?: string;
  client_note?: string;
  ai_analysis?: string;
  ai_model_used?: string;
  adherence_score?: number;
  exercise_completed?: boolean;
  morning_light_completed?: boolean;
  caffeine_cutoff_met?: boolean;
  wake_time_actual?: string;
  sleep_hours?: number;
  energy_rating?: number;
  focus_rating?: number;
  wearable_hrv?: number;
  wearable_recovery_score?: number;
  wearable_sleep_score?: number;
  program_week: number;
  program_day: number;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  client_id: string;
  title: string;
  type:
  | 'checkin_scheduled'
  | 'checkin_completed'
  | 'checkin_missed'
  | 'phase_transition'
  | 'milestone'
  | 'intervention'
  | 'coach_note';
  scheduled_at: string;
  completed_at?: string;
  status: 'scheduled' | 'completed' | 'missed' | 'rescheduled' | 'cancelled';
  rescheduled_to?: string;
  linked_checkin_id?: string;
  linked_intervention_id?: string;
  notes?: string;
  created_at: string;
}

export interface Intervention {
  id: string;
  client_id: string;
  coach_id?: string;
  trigger_condition: string;
  trigger_data: Record<string, unknown>;
  template_id?: string;
  draft_message: string;
  final_message?: string;
  status: 'pending' | 'approved' | 'modified' | 'sent' | 'dismissed';
  delivered_via: string;
  discord_message_id?: string;
  client_response?: string;
  outcome_notes?: string;
  created_at: string;
  approved_at?: string;
  sent_at?: string;
  // joined
  client_name?: string;
}

export interface InterventionTemplate {
  id: string;
  code: string;
  trigger_condition: string;
  name: string;
  message_template: string;
  variables: string[];
  active: boolean;
  use_count: number;
  created_at: string;
}

export interface WeeklySummary {
  id: string;
  client_id: string;
  week_number: number;
  generated_at: string;
  total_checkins: number;
  missed_checkins: number;
  avg_adherence: number;
  avg_energy: number;
  avg_focus: number;
  avg_sleep_hours: number;
  interventions_sent: number;
  ai_narrative: string;
  coach_notes?: string;
}

export interface CoachDashboardRow {
  id: string;
  full_name: string;
  program_week: number;
  status: string;
  rolling_7d_adherence: number;
  consecutive_missed_checkins: number;
  last_checkin_at?: string;
  intervention_flag: boolean;
  chronotype?: string;
}

export interface ClientDashboard {
  client: Client;
  this_week_targets: {
    wake_time: string;
    bedtime: string;
    caffeine_cutoff: string;
    morning_light_min: number;
    exercise_time: string;
    peak_window: string;
    phase_name: string;
  };
  recent_checkins: CheckIn[];
  upcoming_events: CalendarEvent[];
  kpis: {
    rolling_7d_adherence: number;
    avg_energy_7d: number;
    avg_focus_7d: number;
    avg_sleep_7d: number;
    streak_days: number;
    program_week: number;
    program_day: number;
  };
}

export interface CheckInStats {
  total: number;
  missed: number;
  avg_adherence: number;
  avg_energy: number;
  avg_focus: number;
  avg_sleep_hours: number;
  by_week: Array<{
    week: number;
    adherence: number;
    energy: number;
    focus: number;
    sleep: number;
  }>;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  linked_entity_type?: string;
  linked_entity_id?: string;
  created_at: string;
}
