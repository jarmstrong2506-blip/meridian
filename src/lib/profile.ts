import type { GoalKey, NoGoMovement } from '@/data/testWeek';
import { supabase } from '@/lib/supabase';

export type TestWeekProfileData = {
  goal: GoalKey;
  test_week_status: 'in_progress' | 'complete' | null;
  test_week_started_at: string | null;
  test_week_no_gos: NoGoMovement[];
  units: {
    height: 'cm' | 'ft';
    weight: 'kg' | 'lb';
    distance: 'km' | 'miles';
  };
};

export async function fetchTestWeekProfile(): Promise<TestWeekProfileData | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('profiles')
      .select('goal, test_week_status, test_week_started_at, test_week_no_gos, units')
      .eq('id', user.id)
      .maybeSingle();
    if (!data) return null;
    return {
      goal: (data.goal as GoalKey) ?? 'build_muscle',
      test_week_status: data.test_week_status ?? null,
      test_week_started_at: data.test_week_started_at ?? null,
      test_week_no_gos: (data.test_week_no_gos as NoGoMovement[]) ?? ['none'],
      units: data.units ?? { height: 'cm', weight: 'kg', distance: 'km' },
    };
  } catch {
    return null;
  }
}
