import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { fonts, MeridianColors as C } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { BackgroundWash } from '@/components/background-wash';
import { buildTestWeekId } from '@/lib/testWeek';
import { formatDistance, formatPace, formatWeight } from '@/lib/units';

// ─── Types ────────────────────────────────────────────────────────────────────

type TestResult = {
  id: string;
  test_type: string;
  substitution_used: string | null;
  weight_kg: number | null;
  reps: number | null;
  estimated_1rm_kg: number | null;
  duration_seconds: number | null;
  distance_m: number | null;
  notes: string | null;
};

type BodyMeasurement = {
  weight_kg:      number | null;
  chest_cm:       number | null;
  waist_cm:       number | null;
  hips_cm:        number | null;
  arm_left_cm:    number | null;
  arm_right_cm:   number | null;
  thigh_left_cm:  number | null;
  thigh_right_cm: number | null;
  calf_left_cm:   number | null;
  calf_right_cm:  number | null;
};

type Units = { weight: 'kg' | 'lb'; distance: 'km' | 'miles' } | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AMRAP_TYPES = new Set(['amrap_squat', 'amrap_bench', 'amrap_deadlift', 'amrap_ohp', 'amrap_row']);
const CARDIO_TYPES = new Set(['cardio_baseline']);
const REPS_TYPES = new Set(['max_pushups', 'max_squats_60s']);
const DURATION_TYPES = new Set(['plank_hold', 'loaded_carry']);

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function exerciseLabel(result: TestResult): string {
  if (result.substitution_used) return result.substitution_used;
  const labels: Record<string, string> = {
    amrap_squat:     'Back Squat',
    amrap_bench:     'Bench Press',
    amrap_deadlift:  'Deadlift',
    amrap_ohp:       'Overhead Press',
    amrap_row:       'Barbell Row',
    cardio_baseline: 'Cardio',
    max_pushups:     'Push-Ups',
    max_squats_60s:  'Bodyweight Squats',
    plank_hold:      'Plank Hold',
    loaded_carry:    'Loaded Carry',
    movement_screen: 'Movement Screen',
    body_measurements: 'Body Measurements',
    recovery_walk:   'Recovery Walk',
  };
  return labels[result.test_type] ?? result.test_type;
}

// ─── Result row components ────────────────────────────────────────────────────

function AmrapRow({ result, units }: { result: TestResult; units: Units }) {
  const wu = units?.weight ?? 'kg';
  const w  = result.weight_kg;
  const r  = result.reps;
  const rm = result.estimated_1rm_kg;
  return (
    <View style={rr.wrap}>
      <Text style={rr.name}>{exerciseLabel(result)}</Text>
      {w && r ? (
        <Text style={rr.detail}>{formatWeight(w, wu)} × {r} reps</Text>
      ) : null}
      {rm ? <Text style={rr.highlight}>Est. 1RM: {formatWeight(rm, wu)}</Text> : null}
    </View>
  );
}

function CardioRow({ result, units }: { result: TestResult; units: Units }) {
  const du   = units?.distance ?? 'km';
  const dist = result.distance_m;
  const dur  = result.duration_seconds;
  const pace = dist && dur ? formatPace(dur, dist, du) : null;
  return (
    <View style={rr.wrap}>
      <Text style={rr.name}>{exerciseLabel(result)}</Text>
      {dist ? <Text style={rr.detail}>{formatDistance(dist, du)}</Text> : null}
      {dur  ? <Text style={rr.detail}>{fmtDuration(dur)}</Text> : null}
      {pace ? <Text style={rr.highlight}>{pace}</Text> : null}
    </View>
  );
}

function RepsRow({ result }: { result: TestResult }) {
  return (
    <View style={rr.wrap}>
      <Text style={rr.name}>{exerciseLabel(result)}</Text>
      {result.reps ? <Text style={rr.detail}>{result.reps} reps</Text> : null}
    </View>
  );
}

function DurationRow({ result }: { result: TestResult }) {
  return (
    <View style={rr.wrap}>
      <Text style={rr.name}>{exerciseLabel(result)}</Text>
      {result.duration_seconds ? <Text style={rr.detail}>{fmtDuration(result.duration_seconds)}</Text> : null}
    </View>
  );
}

function MovementRow({ result }: { result: TestResult }) {
  let checks: Record<string, string> | null = null;
  try { checks = result.notes ? JSON.parse(result.notes) : null; } catch (_) {}
  return (
    <View style={rr.wrap}>
      <Text style={rr.name}>Movement Screen</Text>
      {checks && Object.entries(checks).map(([k, v]) => (
        <Text key={k} style={rr.detail}>
          {k}: <Text style={{ color: v === 'pass' ? C.green : C.textMuted }}>{String(v)}</Text>
        </Text>
      ))}
    </View>
  );
}

function RecoveryRow({ result }: { result: TestResult }) {
  return (
    <View style={rr.wrap}>
      <Text style={rr.name}>Recovery Walk</Text>
      <Text style={rr.detail}>Completed</Text>
    </View>
  );
}

const rr = StyleSheet.create({
  wrap:      { gap: 3 },
  name:      { fontFamily: fonts.sansBold, fontSize: 16, color: C.text },
  detail:    { fontFamily: fonts.sans, fontSize: 13, color: C.textMuted },
  highlight: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: C.gold },
});

function MeasurementSection({ meas, units }: { meas: BodyMeasurement; units: Units }) {
  const wu = units?.weight ?? 'kg';
  const pairs: [string, number | null, string][] = [
    ['Bodyweight',   meas.weight_kg,      wu === 'kg' ? 'kg' : 'lb'],
    ['Chest',        meas.chest_cm,       'cm'],
    ['Waist',        meas.waist_cm,       'cm'],
    ['Hips',         meas.hips_cm,        'cm'],
    ['Left Arm',     meas.arm_left_cm,    'cm'],
    ['Right Arm',    meas.arm_right_cm,   'cm'],
    ['Left Thigh',   meas.thigh_left_cm,  'cm'],
    ['Right Thigh',  meas.thigh_right_cm, 'cm'],
    ['Left Calf',    meas.calf_left_cm,   'cm'],
    ['Right Calf',   meas.calf_right_cm,  'cm'],
  ];
  const filled = pairs.filter(([, v]) => v !== null);
  if (filled.length === 0) return null;

  return (
    <View style={ms.wrap}>
      <Text style={ms.heading}>Body Measurements</Text>
      <View style={ms.grid}>
        {filled.map(([label, val, unit]) => {
          const display = label === 'Bodyweight' && wu !== 'kg' && val
            ? `${(val * 2.20462).toFixed(1)} ${unit}`
            : `${val} ${unit}`;
          return (
            <View key={label} style={ms.cell}>
              <Text style={ms.cellLabel}>{label}</Text>
              <Text style={ms.cellValue}>{display}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const ms = StyleSheet.create({
  wrap:      { gap: 10 },
  heading:   { fontFamily: fonts.sansBold, fontSize: 16, color: C.text },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell:      { width: '45%' },
  cellLabel: { fontFamily: fonts.sans, fontSize: 11, color: C.textMuted },
  cellValue: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: C.text },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TestWeekSummaryScreen() {
  const { bottom } = useSafeAreaInsets();
  const [results,  setResults]  = useState<TestResult[]>([]);
  const [measures, setMeasures] = useState<BodyMeasurement | null>(null);
  const [units,    setUnits]    = useState<Units>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: prof } = await supabase
            .from('profiles')
            .select('test_week_started_at, units')
            .eq('id', user.id)
            .single();

          if (!prof?.test_week_started_at) return;
          setUnits(prof.units ?? null);

          const twId = buildTestWeekId(prof.test_week_started_at);

          const [resData, measData] = await Promise.all([
            supabase
              .from('test_results')
              .select('id, test_type, substitution_used, weight_kg, reps, estimated_1rm_kg, duration_seconds, distance_m, notes')
              .eq('test_week_id', twId)
              .order('id'),
            supabase
              .from('body_measurements')
              .select('weight_kg, chest_cm, waist_cm, hips_cm, arm_left_cm, arm_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm')
              .eq('user_id', user.id)
              .eq('test_week_id', twId)
              .order('id')
              .limit(1)
              .maybeSingle(),
          ]);

          setResults((resData.data ?? []) as TestResult[]);
          setMeasures(measData.data as BodyMeasurement | null);
        } catch (e) {
          console.log('[summary] error:', e);
        }
      })();
    }, []),
  );

  const hasMeasures = measures !== null && Object.values(measures).some((v) => v !== null);

  return (
    <View style={s.screen}>
      <BackgroundWash />
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.content, { paddingBottom: bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Opening */}
          <Text style={s.headline}>Right — here's where you actually are.</Text>

          {/* Results list */}
          {results.length > 0 && (
            <View style={s.section}>
              {results
                .filter((r) => r.test_type !== 'body_measurements')
                .map((r) => (
                  <View key={r.id} style={s.resultRow}>
                    {AMRAP_TYPES.has(r.test_type)    && <AmrapRow    result={r} units={units} />}
                    {CARDIO_TYPES.has(r.test_type)   && <CardioRow   result={r} units={units} />}
                    {REPS_TYPES.has(r.test_type)     && <RepsRow     result={r} />}
                    {DURATION_TYPES.has(r.test_type) && <DurationRow result={r} />}
                    {r.test_type === 'movement_screen' && <MovementRow result={r} />}
                    {r.test_type === 'recovery_walk'   && <RecoveryRow result={r} />}
                  </View>
                ))}
            </View>
          )}

          {/* Body measurements */}
          {hasMeasures && measures && (
            <View style={s.section}>
              <MeasurementSection meas={measures} units={units} />
            </View>
          )}

          {/* Closing coach sentence */}
          <View style={s.coachWrap}>
            <View style={[s.coachBorder, { backgroundColor: C.gold }]} />
            <Text style={s.coachText}>
              Your first training block is being built around these numbers. Start tomorrow.
            </Text>
          </View>
        </ScrollView>

        {/* Done button */}
        <View style={[s.footer, { paddingBottom: bottom + 20 }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={s.doneBtn}
            onPress={() => router.replace('/')}
          >
            <Text style={s.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  safe:   { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 32, gap: 0 },

  headline: {
    fontFamily: fonts.serif,
    fontSize:   24,
    color:      C.text,
    lineHeight: 34,
    marginBottom: 28,
  },

  section: {
    gap:          18,
    marginBottom: 28,
  },
  resultRow: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },

  coachWrap: { flexDirection: 'row', marginBottom: 32 },
  coachBorder: { width: 2, borderRadius: 1, marginRight: 14 },
  coachText: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize:   18,
    color:      C.text,
    lineHeight: 26,
  },

  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.divider,
    backgroundColor: C.bg,
  },
  doneBtn: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    fontFamily: fonts.sansSemiBold,
    fontSize:   15,
    color:      C.text,
  },
});
