import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MeridianColors as C } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import SessionScreen from '../session';
import TestWeekDayScreen, { TestWeekProfile } from '../test-week-day';

export default function TrainTab() {
  const [profile, setProfile] = useState<TestWeekProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase
              .from('profiles')
              .select('goal, test_week_status, test_week_started_at, test_week_no_gos, units')
              .eq('id', user.id)
              .single();
            setProfile(data as TestWeekProfile | null);
          }
        } catch (_) { /* non-blocking */ }
        setLoading(false);
      })();
    }, []),
  );

  // Blank bg while loading — avoids flash of wrong screen
  if (loading) {
    return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  }

  if (profile?.test_week_status === 'in_progress') {
    return <TestWeekDayScreen profile={profile} />;
  }

  return <SessionScreen />;
}
