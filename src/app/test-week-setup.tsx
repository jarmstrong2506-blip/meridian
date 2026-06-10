import { useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, MeridianColors as C } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { NoGoMovement } from '@/data/testWeek';

// ─── Data ─────────────────────────────────────────────────────────────────────

type Chip = { label: string; value: NoGoMovement; exclusive?: boolean };

const CHIPS: Chip[] = [
  { label: 'Running',             value: 'running'    },
  { label: 'Jumping',             value: 'jumping'    },
  { label: 'Overhead movements',  value: 'overhead'   },
  { label: 'Deep squatting',      value: 'deep_squat' },
  { label: "None — I'm good",     value: 'none', exclusive: true },
];

function pad(n: number) { return String(n).padStart(2, '0'); }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TestWeekSetupScreen() {
  const { bottom } = useSafeAreaInsets();
  const [selected, setSelected] = useState<NoGoMovement[]>([]);
  const [saving, setSaving]     = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const toggle = (chip: Chip) => {
    setSelected(prev => {
      if (chip.exclusive) return ['none'];
      const withoutExclusive = prev.filter(v => v !== 'none') as NoGoMovement[];
      return withoutExclusive.includes(chip.value)
        ? withoutExclusive.filter(v => v !== chip.value)
        : [...withoutExclusive, chip.value];
    });
  };

  const handleContinue = async () => {
    if (saving) return;
    setSaving(true);
    const noGos: NoGoMovement[] = selected.length === 0 ? ['none'] : selected;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from('profiles').upsert({
          id:                    user.id,
          test_week_status:      'in_progress',
          test_week_started_at:  todayStr(),
          test_week_no_gos:      noGos,
        });
        if (error) console.log('[test-week-setup] error:', error);
        else       console.log('[test-week-setup] saved, no_gos:', noGos);
      }
    } catch (e) {
      console.log('[test-week-setup] error:', e);
    }
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      router.replace('/');
    });
  };

  return (
    <View style={s.screen}>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: '100%' }]} />
      </View>

      <SafeAreaView style={s.safe} edges={['top']}>
        <Animated.View style={[s.content, { opacity: fadeAnim }]}>
          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={s.topGap} />
            <View style={s.coachWrap}>
              <Text style={s.primary}>One more thing — anything you'd rather avoid during testing?</Text>
              <Text style={s.secondary}>Tap any that apply. We'll swap those movements for safer alternatives.</Text>
            </View>
            <View style={s.gap40} />
            <View style={s.pills}>
              {CHIPS.map(chip => {
                const isOn = selected.includes(chip.value);
                return (
                  <TouchableOpacity
                    key={chip.value}
                    activeOpacity={0.6}
                    style={[s.pill, isOn && s.pillOn]}
                    onPress={() => toggle(chip)}
                  >
                    <Text style={[s.pillLabel, isOn && s.pillLabelOn]}>{chip.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={[s.actions, { paddingBottom: bottom + 32 }]}>
            <View />
            <TouchableOpacity activeOpacity={0.6} onPress={handleContinue} disabled={saving}>
              <Text style={s.ctaLabel}>Continue →</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: C.bg },
  progressTrack: { height: 1, backgroundColor: '#2A2A2A' },
  progressFill:  { height: 1, backgroundColor: C.gold },
  safe:          { flex: 1 },
  content:       { flex: 1 },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  topGap:        { height: 80 },
  gap40:         { height: 40 },

  coachWrap: { gap: 0 },
  primary: {
    fontFamily: fonts.serif,
    fontSize:   28,
    color:      C.text,
    lineHeight: 38,
  },
  secondary: {
    fontFamily: fonts.serif,
    fontSize:   14,
    color:      C.textMuted,
    lineHeight: 20,
    marginTop:  16,
  },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    borderWidth:       1,
    borderColor:       '#2A2A2A',
    borderRadius:      999,
    paddingVertical:   10,
    paddingHorizontal: 18,
  },
  pillOn: {
    borderColor:     C.gold,
    backgroundColor: 'rgba(201,169,107,0.08)',
  },
  pillLabel:    { fontFamily: fonts.sansSemiBold, fontSize: 14, color: C.text },
  pillLabelOn:  { color: C.gold },

  actions: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'flex-end',
    paddingHorizontal: 32,
  },
  ctaLabel: {
    fontFamily:    fonts.sansSemiBold,
    fontSize:      14,
    letterSpacing: 1.5,
    color:         C.gold,
  },
});
