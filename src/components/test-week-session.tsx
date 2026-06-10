import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, MeridianColors as C } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { BackgroundWash } from '@/components/background-wash';
import type { TestDefinition, TestDay, TestType, TestWeekPlan } from '@/data/testWeek';
import {
  buildTestWeekId,
  calculateEpley1RM,
  getCurrentTestDay,
  resolveTestWeekPlan,
} from '@/lib/testWeek';
import { formatDistance, formatPace, lbToKg } from '@/lib/units';
import type { TestWeekProfileData } from '@/lib/profile';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TestResultState = {
  weightText:      string;
  repsText:        string;
  durationText:    string;
  done:            boolean;
  sitToStandText:  string;
  legBalanceL:     boolean | null;
  legBalanceR:     boolean | null;
  overheadReach:   boolean | null;
  bwText:          string;
  chestText:       string;
  waistText:       string;
  hipsText:        string;
  armLText:        string;
  armRText:        string;
  thighLText:      string;
  thighRText:      string;
  calfLText:       string;
  calfRText:       string;
  activeSubIndex:  number | null;
};

function makeEmptyResult(): TestResultState {
  return {
    weightText: '', repsText: '', durationText: '', done: false,
    sitToStandText: '', legBalanceL: null, legBalanceR: null, overheadReach: null,
    bwText: '', chestText: '', waistText: '', hipsText: '',
    armLText: '', armRText: '', thighLText: '', thighRText: '', calfLText: '', calfRText: '',
    activeSubIndex: null,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0'); }
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDuration(text: string): number | null {
  const m = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const mins = parseInt(m[1], 10);
  const secs = parseInt(m[2], 10);
  if (secs >= 60) return null;
  return mins * 60 + secs;
}

const AMRAP_TYPES: TestType[] = [
  'amrap_squat', 'amrap_bench', 'amrap_deadlift', 'amrap_ohp', 'amrap_row',
];
function isAmrap(type: TestType) { return AMRAP_TYPES.includes(type); }

function getActiveTestDef(test: TestDefinition, activeSubIndex: number | null): TestDefinition {
  if (activeSubIndex !== null && test.substitutions?.[activeSubIndex]) {
    const { triggers: _t, ...subFields } = test.substitutions[activeSubIndex];
    return { ...test, ...subFields, originalType: test.originalType ?? test.type };
  }
  return test;
}

function isTestComplete(type: TestType, result: TestResultState): boolean {
  if (isAmrap(type)) return result.weightText.length > 0 && result.repsText.length > 0;
  if (type === 'cardio_baseline') return parseDuration(result.durationText) !== null;
  if (type === 'max_pushups' || type === 'max_squats_60s') return result.repsText.length > 0;
  if (type === 'plank_hold' || type === 'loaded_carry') return result.durationText.length > 0;
  if (type === 'movement_screen') {
    return (
      result.sitToStandText.length > 0 &&
      result.legBalanceL !== null &&
      result.legBalanceR !== null &&
      result.overheadReach !== null
    );
  }
  if (type === 'body_measurements') return true;
  if (type === 'recovery_walk') return result.done;
  return false;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function TestWeekSession({ profile }: { profile: TestWeekProfileData }) {
  const plan = useMemo(
    () => resolveTestWeekPlan(profile.goal, profile.test_week_no_gos),
    [profile.goal, profile.test_week_no_gos],
  );

  const today = useMemo(() => todayStr(), []);

  const dayNum = useMemo(
    () =>
      profile.test_week_started_at
        ? getCurrentTestDay(plan, profile.test_week_started_at, today)
        : null,
    [plan, profile.test_week_started_at, today],
  );

  if (dayNum === null) return <NoTestToday />;

  const testDay = plan.days.find(d => d.dayNumber === dayNum);
  if (!testDay) return <NoTestToday />;

  return (
    <TestDayView
      testDay={testDay}
      plan={plan}
      profile={profile}
      dayNum={dayNum}
    />
  );
}

// ─── No test today ────────────────────────────────────────────────────────────

function NoTestToday() {
  return (
    <View style={ss.screen}>
      <BackgroundWash />
      <SafeAreaView edges={['top', 'bottom']} style={ss.safe}>
        <Pressable
          style={({ pressed }) => [ss.back, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <SymbolView
            name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
            size={17}
            tintColor={C.textMuted}
          />
        </Pressable>
        <View style={ss.centerWrap}>
          <Text style={ss.noTestTitle}>Rest Day</Text>
          <Text style={ss.noTestSub}>No test today — recover well. See you tomorrow.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const ss = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: C.bg },
  safe:      { flex: 1, paddingHorizontal: 22 },
  back: {
    marginTop: 12,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  centerWrap: { flex: 1, justifyContent: 'center', paddingBottom: 80 },
  noTestTitle: { fontFamily: fonts.sansBold, fontSize: 24, color: C.text, marginBottom: 10 },
  noTestSub:   { fontFamily: fonts.serif, fontSize: 18, color: C.textMuted, lineHeight: 26 },
});

// ─── Test day view ─────────────────────────────────────────────────────────────

type TestDayViewProps = {
  testDay: TestDay;
  plan: TestWeekPlan;
  profile: TestWeekProfileData;
  dayNum: number;
};

function TestDayView({ testDay, plan, profile, dayNum }: TestDayViewProps) {
  const [results, setResults] = useState<TestResultState[]>(
    () => testDay.tests.map(() => makeEmptyResult()),
  );
  const [subModalFor, setSubModalFor] = useState<number | null>(null);
  const [saving, setSaving]           = useState(false);

  const updateResult = useCallback((idx: number, patch: Partial<TestResultState>) => {
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }, []);

  const allComplete = testDay.tests.every((test, i) => {
    const activeDef = getActiveTestDef(test, results[i].activeSubIndex);
    return isTestComplete(activeDef.type, results[i]);
  });

  const handleCompleteDay = useCallback(async () => {
    if (!allComplete || saving || !profile.test_week_started_at) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaving(false); return; }

      const testWeekId = buildTestWeekId(profile.test_week_started_at);
      const weightUnit = profile.units.weight;
      const heightUnit = profile.units.height;

      for (let i = 0; i < testDay.tests.length; i++) {
        const test   = testDay.tests[i];
        const result = results[i];
        const active = getActiveTestDef(test, result.activeSubIndex);
        const baseType = test.originalType ?? test.type;
        const subUsed  = (result.activeSubIndex !== null || test.originalType !== undefined)
          ? active.primaryExercise
          : null;

        const row: Record<string, unknown> = {
          user_id:          user.id,
          test_week_id:     testWeekId,
          test_type:        baseType,
          substitution_used: subUsed,
          no_go_movements:  profile.test_week_no_gos,
        };

        if (isAmrap(active.type)) {
          const rawW = parseFloat(result.weightText) || 0;
          const kg   = weightUnit === 'kg' ? rawW : lbToKg(rawW);
          const reps = parseInt(result.repsText, 10) || 0;
          row.weight_kg      = Math.round(kg * 10) / 10;
          row.reps           = reps;
          row.estimated_1rm_kg = calculateEpley1RM(kg, reps);
        }
        if (active.type === 'cardio_baseline') {
          row.duration_seconds = parseDuration(result.durationText);
          row.distance_m       = active.distanceMeters ?? null;
        }
        if (active.type === 'max_pushups' || active.type === 'max_squats_60s') {
          row.reps = parseInt(result.repsText, 10) || 0;
        }
        if (active.type === 'plank_hold' || active.type === 'loaded_carry') {
          row.duration_seconds = parseDuration(result.durationText);
        }

        const { error } = await supabase.from('test_results').insert(row);
        if (error) console.log('[test_result] error:', error);
        else       console.log('[test_result] saved:', baseType);

        // Body measurements row (separate table)
        if (active.type === 'body_measurements') {
          const toCm = (v: string) => {
            const n = parseFloat(v);
            if (!n) return null;
            return heightUnit === 'cm' ? n : Math.round(n * 2.54 * 10) / 10;
          };
          const toKg = (v: string) => {
            const n = parseFloat(v);
            if (!n) return null;
            return weightUnit === 'kg' ? n : lbToKg(n);
          };
          const bm: Record<string, unknown> = {
            user_id:      user.id,
            test_week_id: testWeekId,
            weight_kg:    toKg(result.bwText),
            chest_cm:     toCm(result.chestText),
            waist_cm:     toCm(result.waistText),
            hips_cm:      toCm(result.hipsText),
            arm_left_cm:  toCm(result.armLText),
            arm_right_cm: toCm(result.armRText),
            thigh_left_cm:  toCm(result.thighLText),
            thigh_right_cm: toCm(result.thighRText),
            calf_left_cm:   toCm(result.calfLText),
            calf_right_cm:  toCm(result.calfRText),
          };
          const bmRes = await supabase.from('body_measurements').insert(bm);
          if (bmRes.error) console.log('[body_measurements] error:', bmRes.error);
          else             console.log('[body_measurements] saved');
        }
      }

      const isFinalDay = dayNum === plan.durationDays;
      if (isFinalDay) {
        await supabase.from('profiles').upsert({
          id: user.id,
          test_week_status: 'complete',
        });
        router.replace('/test-week-summary');
      } else {
        router.replace('/');
      }
    } catch (e) {
      console.log('[test_result] error:', e);
      setSaving(false);
    }
  }, [allComplete, saving, profile, testDay, results, dayNum, plan]);

  return (
    <View style={tv.screen}>
      <BackgroundWash />
      <SafeAreaView edges={['top']} style={tv.safeTop}>
        <TestWeekHeader dayNum={dayNum} label={testDay.label} totalDays={plan.durationDays} />
        <TestWeekStrip plan={plan} startDateISO={profile.test_week_started_at!} />
      </SafeAreaView>

      <KeyboardAvoidingView
        style={tv.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={tv.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {testDay.tests.map((test, i) => (
            <TestCard
              key={i}
              test={getActiveTestDef(test, results[i].activeSubIndex)}
              originalTest={test}
              result={results[i]}
              profile={profile}
              onChange={patch => updateResult(i, patch)}
              onSwitchExercise={test.substitutions && test.substitutions.length > 0
                ? () => setSubModalFor(i)
                : undefined}
            />
          ))}

          <Pressable
            onPress={handleCompleteDay}
            disabled={!allComplete || saving}
            style={({ pressed }) => [
              tv.completeBtn,
              !allComplete && tv.completeBtnDisabled,
              pressed && allComplete && { opacity: 0.85, transform: [{ scale: 0.983 }] },
            ]}
          >
            <Text style={tv.completeBtnText}>
              {saving ? 'Saving…' : `Complete Day ${dayNum} →`}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {subModalFor !== null && (
        <SubstitutionModal
          substitutions={testDay.tests[subModalFor].substitutions ?? []}
          currentSubIndex={results[subModalFor].activeSubIndex}
          onSelect={idx => {
            updateResult(subModalFor, { activeSubIndex: idx });
            setSubModalFor(null);
          }}
          onClose={() => setSubModalFor(null)}
        />
      )}
    </View>
  );
}

const tv = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: C.bg },
  safeTop:     { backgroundColor: C.bg },
  flex:        { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop:        14,
    paddingBottom:     40,
    gap:               12,
  },
  completeBtn: {
    backgroundColor: C.gold,
    borderRadius:    14,
    paddingVertical: 17,
    alignItems:      'center',
    marginTop:       6,
  },
  completeBtnDisabled: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  completeBtnText: {
    fontFamily:    fonts.sansSemiBold,
    color:         C.bg,
    fontSize:      15,
    letterSpacing: 0.2,
  },
});

// ─── Test Week Header ──────────────────────────────────────────────────────────

function TestWeekHeader({ dayNum, label, totalDays }: { dayNum: number; label: string; totalDays: number }) {
  return (
    <View style={th.wrapper}>
      <View style={th.content}>
        <View style={th.topRow}>
          <Pressable
            style={({ pressed }) => [th.back, pressed && { opacity: 0.6 }]}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <SymbolView
              name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
              size={17}
              tintColor={C.textMuted}
            />
          </Pressable>
          <View style={th.titleGroup}>
            <Text style={th.eyebrow}>TEST WEEK</Text>
            <Text style={th.title}>{label}</Text>
          </View>
          <View style={th.counter}>
            <Text style={th.counterNum}>{dayNum}</Text>
            <Text style={th.counterOf}> of {totalDays}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const th = StyleSheet.create({
  wrapper: {
    backgroundColor:   C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop:        12,
    paddingBottom:     14,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  titleGroup: { flex: 1 },
  eyebrow: {
    fontFamily:    fonts.sansSemiBold,
    fontSize:      9,
    color:         C.gold,
    letterSpacing: 1.5,
  },
  title: {
    fontFamily:    fonts.sansBold,
    color:         C.text,
    fontSize:      16,
    letterSpacing: -0.2,
    marginTop:     2,
  },
  counter:    { flexDirection: 'row', alignItems: 'baseline' },
  counterNum: { fontFamily: fonts.sansSemiBold, color: C.text, fontSize: 18 },
  counterOf:  { fontFamily: fonts.sans, color: C.textMuted, fontSize: 12 },
});

// ─── Test Week Strip ───────────────────────────────────────────────────────────

function TestWeekStrip({ plan, startDateISO }: { plan: TestWeekPlan; startDateISO: string }) {
  const today = todayStr();
  const [sy, sm, sd] = startDateISO.split('-').map(Number);

  return (
    <View style={tws.row}>
      {plan.days.map(day => {
        const dayDate = new Date(sy, sm - 1, sd + day.dayNumber - 1);
        const dateISO = `${dayDate.getFullYear()}-${pad(dayDate.getMonth() + 1)}-${pad(dayDate.getDate())}`;
        const isToday = dateISO === today;
        const label   = day.rest ? 'Rest' : `Test ${day.dayNumber}`;

        return (
          <View key={day.dayNumber} style={tws.cell}>
            <Text style={[tws.dayNum, isToday && tws.todayText]}>
              {day.dayNumber}
            </Text>
            <Text style={[tws.label, isToday && tws.todayText]}>{label}</Text>
            {isToday && <View style={tws.underline} />}
          </View>
        );
      })}
    </View>
  );
}

const tws = StyleSheet.create({
  row: {
    flexDirection:     'row',
    justifyContent:    'space-around',
    paddingHorizontal: 16,
    paddingVertical:   10,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
    backgroundColor:   C.bg,
  },
  cell: {
    flex: 1, alignItems: 'center', gap: 3, paddingBottom: 4,
  },
  dayNum: {
    fontFamily: fonts.sansSemiBold, fontSize: 10, color: C.textMuted,
  },
  label: {
    fontFamily: fonts.sans, fontSize: 9, color: C.textFaint,
  },
  todayText: { color: C.text },
  underline: {
    position: 'absolute', bottom: 0,
    width: '60%', height: 1.5,
    borderRadius: 1, backgroundColor: C.gold,
  },
});

// ─── Test card ─────────────────────────────────────────────────────────────────

type TestCardProps = {
  test: TestDefinition;
  originalTest: TestDefinition;
  result: TestResultState;
  profile: TestWeekProfileData;
  onChange: (patch: Partial<TestResultState>) => void;
  onSwitchExercise?: () => void;
};

function TestCard({ test, originalTest, result, profile, onChange, onSwitchExercise }: TestCardProps) {
  const wasSubstituted = originalTest.originalType !== undefined || result.activeSubIndex !== null;
  const originalExName = originalTest.originalType !== undefined
    ? result.activeSubIndex !== null
      ? originalTest.substitutions?.find((_, i) =>
          i !== result.activeSubIndex &&
          originalTest.type === (originalTest.substitutions?.[i]?.type ?? originalTest.type)
        )?.primaryExercise ?? 'original exercise'
      : test.primaryExercise
    : null;

  return (
    <View style={tc.wrapper}>
      <View style={[tc.accentBar, { backgroundColor: C.gold }]} />
      <View style={tc.body}>
        <View style={tc.header}>
          <View style={tc.nameWrap}>
            <Text style={tc.name}>{test.primaryExercise}</Text>
            {wasSubstituted && (
              <Text style={tc.subBadge}>
                Substituted{originalExName ? ` from ${originalExName}` : ''}
              </Text>
            )}
          </View>
          {onSwitchExercise && (
            <TouchableOpacity activeOpacity={0.6} onPress={onSwitchExercise} style={tc.switchBtn}>
              <Text style={tc.switchLabel}>Switch</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={tc.instruction}>{test.instructionFull}</Text>

        <TestInputs
          test={test}
          result={result}
          profile={profile}
          onChange={onChange}
        />
      </View>
    </View>
  );
}

const tc = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder,
    overflow: 'hidden',
  },
  accentBar: { width: 3 },
  body: { flex: 1, padding: 16, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  nameWrap: { flex: 1, gap: 4 },
  name: { fontFamily: fonts.sansBold, color: C.text, fontSize: 17, letterSpacing: -0.2 },
  subBadge: { fontFamily: fonts.sans, color: C.textMuted, fontSize: 11 },
  switchBtn: {
    borderWidth: 1, borderColor: C.cardBorder, borderRadius: 8,
    paddingVertical: 5, paddingHorizontal: 10, marginLeft: 8,
  },
  switchLabel: { fontFamily: fonts.sansMedium, color: C.textMuted, fontSize: 11 },
  instruction: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: C.textMuted,
    lineHeight: 22,
  },
});

// ─── Test inputs ───────────────────────────────────────────────────────────────

function TestInputs({ test, result, profile, onChange }: {
  test: TestDefinition;
  result: TestResultState;
  profile: TestWeekProfileData;
  onChange: (patch: Partial<TestResultState>) => void;
}) {
  const wUnit = profile.units.weight;
  const dUnit = profile.units.distance;

  if (isAmrap(test.type)) {
    const kg = wUnit === 'kg'
      ? parseFloat(result.weightText) || 0
      : lbToKg(parseFloat(result.weightText) || 0);
    const reps  = parseInt(result.repsText, 10) || 0;
    const orm   = kg > 0 && reps > 0 ? calculateEpley1RM(kg, reps) : null;
    const ormDisplay = orm
      ? wUnit === 'kg' ? `${orm} kg` : `${Math.round(orm / 0.453592 * 10) / 10} lb`
      : '—';

    return (
      <View style={ti.group}>
        <View style={ti.row}>
          <InputBox
            label="Weight"
            unit={wUnit}
            value={result.weightText}
            onChangeText={t => onChange({ weightText: t })}
            keyboardType="decimal-pad"
          />
          <InputBox
            label="Reps"
            unit="reps"
            value={result.repsText}
            onChangeText={t => onChange({ repsText: t })}
            keyboardType="number-pad"
          />
        </View>
        {orm !== null && (
          <Text style={ti.calc}>Est. 1RM: <Text style={ti.calcValue}>{ormDisplay}</Text></Text>
        )}
      </View>
    );
  }

  if (test.type === 'cardio_baseline') {
    const distM     = test.distanceMeters ?? 0;
    const distLabel = distM > 0 ? formatDistance(distM, dUnit) : '—';
    const secs      = parseDuration(result.durationText);
    const pace      = secs && distM > 0 ? formatPace(secs, distM, dUnit) : '—';

    return (
      <View style={ti.group}>
        <Text style={ti.distRow}>Distance: <Text style={ti.calcValue}>{distLabel}</Text></Text>
        <InputBox
          label="Duration"
          unit="mm:ss"
          value={result.durationText}
          onChangeText={t => onChange({ durationText: t })}
          keyboardType="numbers-and-punctuation"
          placeholder="0:00"
        />
        {secs !== null && (
          <Text style={ti.calc}>Pace: <Text style={ti.calcValue}>{pace}</Text></Text>
        )}
      </View>
    );
  }

  if (test.type === 'max_pushups' || test.type === 'max_squats_60s') {
    return (
      <InputBox
        label="Reps"
        unit="reps"
        value={result.repsText}
        onChangeText={t => onChange({ repsText: t })}
        keyboardType="number-pad"
      />
    );
  }

  if (test.type === 'plank_hold' || test.type === 'loaded_carry') {
    return (
      <InputBox
        label="Duration"
        unit="mm:ss"
        value={result.durationText}
        onChangeText={t => onChange({ durationText: t })}
        keyboardType="numbers-and-punctuation"
        placeholder="0:00"
      />
    );
  }

  if (test.type === 'movement_screen') {
    return (
      <View style={ti.group}>
        <InputBox
          label="Sit-to-stand"
          unit="reps"
          value={result.sitToStandText}
          onChangeText={t => onChange({ sitToStandText: t })}
          keyboardType="number-pad"
        />
        <PassFail
          label="Single-leg balance — Left"
          value={result.legBalanceL}
          onChange={v => onChange({ legBalanceL: v })}
        />
        <PassFail
          label="Single-leg balance — Right"
          value={result.legBalanceR}
          onChange={v => onChange({ legBalanceR: v })}
        />
        <PassFail
          label="Overhead reach"
          value={result.overheadReach}
          onChange={v => onChange({ overheadReach: v })}
        />
      </View>
    );
  }

  if (test.type === 'body_measurements') {
    const bUnit = profile.units.height === 'cm' ? 'cm' : 'in';
    return (
      <View style={ti.group}>
        <InputBox label="Bodyweight" unit={wUnit} value={result.bwText}
          onChangeText={t => onChange({ bwText: t })} keyboardType="decimal-pad" />
        <View style={ti.row}>
          <InputBox label="Chest"  unit={bUnit} value={result.chestText}
            onChangeText={t => onChange({ chestText: t })} keyboardType="decimal-pad" />
          <InputBox label="Waist"  unit={bUnit} value={result.waistText}
            onChangeText={t => onChange({ waistText: t })} keyboardType="decimal-pad" />
        </View>
        <View style={ti.row}>
          <InputBox label="Hips"     unit={bUnit} value={result.hipsText}
            onChangeText={t => onChange({ hipsText: t })} keyboardType="decimal-pad" />
        </View>
        <View style={ti.row}>
          <InputBox label="Arm L" unit={bUnit} value={result.armLText}
            onChangeText={t => onChange({ armLText: t })} keyboardType="decimal-pad" />
          <InputBox label="Arm R" unit={bUnit} value={result.armRText}
            onChangeText={t => onChange({ armRText: t })} keyboardType="decimal-pad" />
        </View>
        <View style={ti.row}>
          <InputBox label="Thigh L" unit={bUnit} value={result.thighLText}
            onChangeText={t => onChange({ thighLText: t })} keyboardType="decimal-pad" />
          <InputBox label="Thigh R" unit={bUnit} value={result.thighRText}
            onChangeText={t => onChange({ thighRText: t })} keyboardType="decimal-pad" />
        </View>
        <View style={ti.row}>
          <InputBox label="Calf L"  unit={bUnit} value={result.calfLText}
            onChangeText={t => onChange({ calfLText: t })} keyboardType="decimal-pad" />
          <InputBox label="Calf R"  unit={bUnit} value={result.calfRText}
            onChangeText={t => onChange({ calfRText: t })} keyboardType="decimal-pad" />
        </View>
      </View>
    );
  }

  if (test.type === 'recovery_walk') {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[ti.doneBtn, result.done && ti.doneBtnOn]}
        onPress={() => onChange({ done: !result.done })}
      >
        <Text style={[ti.doneBtnLabel, result.done && ti.doneBtnLabelOn]}>
          {result.done ? '✓ Done' : 'Mark as done'}
        </Text>
      </TouchableOpacity>
    );
  }

  return null;
}

const ti = StyleSheet.create({
  group:  { gap: 10 },
  row:    { flexDirection: 'row', gap: 8 },
  calc: {
    fontFamily: fonts.sans, fontSize: 12, color: C.textMuted,
    marginTop: 2,
  },
  distRow: {
    fontFamily: fonts.sans, fontSize: 12, color: C.textMuted,
  },
  calcValue: {
    fontFamily: fonts.sansSemiBold, color: C.text,
  },
  doneBtn: {
    borderWidth: 1, borderColor: C.cardBorder, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  doneBtnOn: {
    borderColor: C.green, backgroundColor: `${C.green}18`,
  },
  doneBtnLabel:    { fontFamily: fonts.sansMedium, color: C.textMuted, fontSize: 14 },
  doneBtnLabelOn:  { color: C.green, fontFamily: fonts.sansSemiBold },
});

// ─── InputBox ─────────────────────────────────────────────────────────────────

function InputBox({ label, unit, value, onChangeText, keyboardType, placeholder }: {
  label: string;
  unit: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'decimal-pad' | 'number-pad' | 'numbers-and-punctuation';
  placeholder?: string;
}) {
  return (
    <View style={ib.wrap}>
      <Text style={ib.label}>{label}</Text>
      <View style={ib.inputRow}>
        <TextInput
          style={ib.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType ?? 'decimal-pad'}
          placeholder={placeholder ?? '—'}
          placeholderTextColor={C.textFaint}
          selectTextOnFocus
          returnKeyType="done"
        />
        <Text style={ib.unit}>{unit}</Text>
      </View>
    </View>
  );
}

const ib = StyleSheet.create({
  wrap:  { flex: 1 },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 10, color: C.textMuted, letterSpacing: 0.8, marginBottom: 6 },
  inputRow: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: C.bg,
    borderRadius:    8,
    borderWidth:     1,
    borderColor:     C.divider,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  input: {
    fontFamily: fonts.sansSemiBold, flex: 1, color: C.text, fontSize: 15,
    padding: 0, minWidth: 28, textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  unit: { fontFamily: fonts.sans, color: C.textFaint, fontSize: 11 },
});

// ─── PassFail ─────────────────────────────────────────────────────────────────

function PassFail({ label, value, onChange }: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={pf.wrap}>
      <Text style={pf.label}>{label}</Text>
      <View style={pf.btns}>
        {([true, false] as const).map(v => (
          <TouchableOpacity
            key={String(v)}
            activeOpacity={0.6}
            style={[pf.btn, value === v && (v ? pf.btnPass : pf.btnFail)]}
            onPress={() => onChange(v)}
          >
            <Text style={[pf.btnLabel, value === v && pf.btnLabelOn]}>
              {v ? 'Pass' : 'Fail'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const pf = StyleSheet.create({
  wrap:  { gap: 6 },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 11, color: C.textMuted, letterSpacing: 0.5 },
  btns:  { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
  },
  btnPass:     { borderColor: C.green, backgroundColor: `${C.green}18` },
  btnFail:     { borderColor: C.red,   backgroundColor: `${C.red}18` },
  btnLabel:    { fontFamily: fonts.sansMedium, color: C.textMuted, fontSize: 13 },
  btnLabelOn:  { fontFamily: fonts.sansSemiBold, color: C.text },
});

// ─── Substitution Modal ────────────────────────────────────────────────────────

type SubstitutionModalProps = {
  substitutions: TestDefinition['substitutions'];
  currentSubIndex: number | null;
  onSelect: (idx: number | null) => void;
  onClose: () => void;
};

function SubstitutionModal({ substitutions = [], currentSubIndex, onSelect, onClose }: SubstitutionModalProps) {
  const { bottom } = useSafeAreaInsets();
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sm.overlay} onPress={onClose} />
      <View style={[sm.sheet, { paddingBottom: bottom + 12 }]}>
        <View style={sm.handle} />
        <Text style={sm.heading}>Switch Exercise</Text>
        {substitutions.map((sub, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.6}
            style={[sm.option, currentSubIndex === i && sm.optionOn]}
            onPress={() => onSelect(i)}
          >
            <Text style={sm.optionName}>{sub.primaryExercise}</Text>
            <Text style={sm.optionShort}>{sub.instructionShort}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity activeOpacity={0.6} style={sm.cancel} onPress={onClose}>
          <Text style={sm.cancelLabel}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const sm = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, gap: 10,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.divider, alignSelf: 'center', marginBottom: 4,
  },
  heading: {
    fontFamily: fonts.sansBold, color: C.text, fontSize: 16,
    marginBottom: 4,
  },
  option: {
    borderWidth: 1, borderColor: C.cardBorder, borderRadius: 10,
    padding: 14, gap: 4,
  },
  optionOn: { borderColor: C.gold },
  optionName:  { fontFamily: fonts.sansSemiBold, color: C.text, fontSize: 14 },
  optionShort: { fontFamily: fonts.sans, color: C.textMuted, fontSize: 12 },
  cancel: {
    borderWidth: 1, borderColor: C.cardBorder, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  cancelLabel: { fontFamily: fonts.sansMedium, color: C.textMuted, fontSize: 14 },
});
