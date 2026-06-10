export type ScheduleDay = {
  day: string;
  label: string;
  type: string | null;
  duration: string | null;
  intensity: 'Light' | 'Moderate' | 'High' | null;
  exerciseCount: number;
};

export const MOCK_SCHEDULE: ScheduleDay[] = [
  { day: 'Mon', label: 'Lower',        type: 'Lower Body — Strength',       duration: '55 min', intensity: 'Moderate', exerciseCount: 5 },
  { day: 'Tue', label: 'Upper',        type: 'Upper Body — Strength',       duration: '45 min', intensity: 'Moderate', exerciseCount: 4 },
  { day: 'Wed', label: 'Rest',         type: null,                           duration: null,      intensity: null,       exerciseCount: 0 },
  { day: 'Thu', label: 'Lower',        type: 'Lower Body — Hypertrophy',    duration: '50 min', intensity: 'High',     exerciseCount: 5 },
  { day: 'Fri', label: 'Upper',        type: 'Upper Body — Hypertrophy',    duration: '45 min', intensity: 'High',     exerciseCount: 4 },
  { day: 'Sat', label: 'Conditioning', type: 'Conditioning',                 duration: '30 min', intensity: 'Moderate', exerciseCount: 3 },
  { day: 'Sun', label: 'Rest',         type: null,                           duration: null,      intensity: null,       exerciseCount: 0 },
];

/** Returns today's schedule entry. Mon=0 … Sun=6. */
export function todaySchedule(): ScheduleDay {
  return MOCK_SCHEDULE[(new Date().getDay() + 6) % 7];
}
