import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, MeridianColors as C } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { BackgroundWash } from '@/components/background-wash';
import { MOCK_SCHEDULE, todaySchedule } from '@/data/mockSchedule';
import TestWeekSession from '@/components/test-week-session';
import { fetchTestWeekProfile, TestWeekProfileData } from '@/lib/profile';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0'); }

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function weekDates(): string[] {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
}

// ─── Week strip — derived from single source of truth ─────────────────────────

const WEEK = MOCK_SCHEDULE.map(d => ({ day: d.day[0], label: d.label }));

function WeekStrip({ completedDates, dates }: { completedDates: Set<string>; dates: string[] }) {
  const today = todayStr();
  return (
    <View style={ws.row}>
      {WEEK.map((d, i) => {
        const isToday   = dates[i] === today;
        const completed = completedDates.has(dates[i]);
        return (
          <View key={i} style={ws.cell}>
            <Text style={[ws.dayLetter, isToday && ws.todayText]}>{d.day}</Text>
            <Text style={[ws.label, isToday && ws.todayText]}>{d.label}</Text>
            {isToday   && <View style={ws.underline} />}
            {completed && <View style={ws.tick} />}
          </View>
        );
      })}
    </View>
  );
}

const ws = StyleSheet.create({
  row: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    paddingHorizontal: 16,
    paddingVertical:   10,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
    backgroundColor:   C.bg,
  },
  cell: {
    flex:           1,
    alignItems:     'center',
    gap:            3,
    paddingBottom:  4,
  },
  dayLetter: {
    fontFamily: fonts.sansSemiBold,
    fontSize:   10,
    color:      C.textMuted,
    textTransform: 'uppercase',
  },
  label: {
    fontFamily: fonts.sans,
    fontSize:   9,
    color:      C.textFaint,
  },
  todayText: {
    color: C.text,
  },
  underline: {
    position:        'absolute',
    bottom:          0,
    width:           '60%',
    height:          1.5,
    borderRadius:    1,
    backgroundColor: C.text,
  },
  // hidden while completed:false — visible when true
  tick: {
    width:           5,
    height:          5,
    borderRadius:    2.5,
    backgroundColor: C.green,
    marginTop:       1,
  },
});

// ─── Intensity accent ─────────────────────────────────────────────────────────

const INTENSITY_COLOR: Record<string, string> = {
  Light: C.green, Moderate: C.gold, High: C.red,
};

// ─── Types (AI-ready shape) ───────────────────────────────────────────────────

type SetData = {
  targetReps: number;
  targetWeight: number;
  actualReps: number;
  actualWeight: number;
  completed: boolean;
  metTarget: boolean | null;
};

type ExerciseData = {
  id: string;
  name: string;
  category: 'compound' | 'accessory';
  restSeconds: number;
  sets: SetData[];
  notes: string;
};

// ─── Session meta — derived from schedule ─────────────────────────────────────

const _today = todaySchedule();

const SESSION_META = {
  type:      _today.type      ?? 'Rest Day',
  duration:  _today.duration  ?? '—',
  intensity: (_today.intensity ?? 'Light') as 'Light' | 'Moderate' | 'High',
};

// ─── Exercise data ─────────────────────────────────────────────────────────────

function makeSet(targetReps: number, targetWeight: number): SetData {
  return {
    targetReps, targetWeight,
    actualReps: targetReps, actualWeight: targetWeight,
    completed: false, metTarget: null,
  };
}

const LOWER_BODY_EXERCISES: ExerciseData[] = [
  {
    id: 'l1', name: 'Back Squat', category: 'compound', restSeconds: 150,
    sets: [makeSet(8, 80), makeSet(8, 80), makeSet(8, 80), makeSet(8, 80)],
    notes: '',
  },
  {
    id: 'l2', name: 'Romanian Deadlift', category: 'compound', restSeconds: 150,
    sets: [makeSet(10, 70), makeSet(10, 70), makeSet(10, 70)],
    notes: '',
  },
  {
    id: 'l3', name: 'Leg Press', category: 'compound', restSeconds: 150,
    sets: [makeSet(12, 120), makeSet(12, 120), makeSet(12, 120)],
    notes: '',
  },
  {
    id: 'l4', name: 'Walking Lunges', category: 'accessory', restSeconds: 75,
    sets: [makeSet(12, 20), makeSet(12, 20), makeSet(12, 20)],
    notes: '',
  },
  {
    id: 'l5', name: 'Lying Leg Curl', category: 'accessory', restSeconds: 75,
    sets: [makeSet(15, 40), makeSet(15, 40), makeSet(15, 40)],
    notes: '',
  },
];

const UPPER_BODY_EXERCISES: ExerciseData[] = [
  {
    id: 'u1', name: 'Bench Press', category: 'compound', restSeconds: 150,
    sets: [makeSet(8, 80), makeSet(8, 80), makeSet(8, 80)],
    notes: '',
  },
  {
    id: 'u2', name: 'Barbell Row', category: 'compound', restSeconds: 150,
    sets: [makeSet(8, 70), makeSet(8, 70), makeSet(8, 70)],
    notes: '',
  },
  {
    id: 'u3', name: 'Overhead Press', category: 'compound', restSeconds: 120,
    sets: [makeSet(10, 50), makeSet(10, 50), makeSet(10, 50)],
    notes: '',
  },
  {
    id: 'u4', name: 'Pull-ups', category: 'accessory', restSeconds: 120,
    sets: [makeSet(8, 0), makeSet(8, 0), makeSet(8, 0)],
    notes: '',
  },
];

const CONDITIONING_EXERCISES: ExerciseData[] = [
  {
    id: 'c1', name: 'Kettlebell Swing', category: 'compound', restSeconds: 60,
    sets: [makeSet(20, 24), makeSet(20, 24), makeSet(20, 24)],
    notes: '',
  },
  {
    id: 'c2', name: 'Box Jump', category: 'compound', restSeconds: 60,
    sets: [makeSet(10, 0), makeSet(10, 0), makeSet(10, 0)],
    notes: '',
  },
  {
    id: 'c3', name: 'Farmer Carry', category: 'accessory', restSeconds: 90,
    sets: [makeSet(1, 32), makeSet(1, 32), makeSet(1, 32)],
    notes: '',
  },
];

function pickExercises(type: string | null): ExerciseData[] {
  if (!type) return LOWER_BODY_EXERCISES;
  if (type.includes('Upper')) return UPPER_BODY_EXERCISES;
  if (type.includes('Conditioning')) return CONDITIONING_EXERCISES;
  return LOWER_BODY_EXERCISES;
}

const INITIAL_EXERCISES = pickExercises(_today.type);

// ─── Screen ───────────────────────────────────────────────────────────────────

type TimerDisplay = { secs: number; total: number } | null;
type SessionPhase = 'active' | 'summary';

export default function SessionScreen() {
  const [exercises, setExercises] = useState<ExerciseData[]>(INITIAL_EXERCISES);
  const [timerDisplay, setTimerDisplay] = useState<TimerDisplay>(null);
  const [phase, setPhase] = useState<SessionPhase>('active');
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
  const [dates] = useState<string[]>(weekDates);
  const [twProfile, setTwProfile] = useState<TestWeekProfileData | null>(null);
  const [twLoaded,  setTwLoaded]  = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('sessions')
          .select('date')
          .in('date', dates);
        if (data) setCompletedDates(new Set(data.map((r: { date: string }) => r.date)));
      } catch (_) { /* non-blocking */ }
    })();
  }, [dates]);

  useEffect(() => {
    fetchTestWeekProfile().then(p => { setTwProfile(p); setTwLoaded(true); });
  }, []);

  // ── CTA animated press ────────────────────────────────────────────────────────
  const ctaScale   = useRef(new Animated.Value(1)).current;
  const ctaPressIn  = useCallback(() =>
    Animated.timing(ctaScale, { toValue: 0.983, duration: 120, useNativeDriver: true }).start(), []);
  const ctaPressOut = useCallback(() =>
    Animated.timing(ctaScale, { toValue: 1, duration: 120, useNativeDriver: true }).start(), []);

  // ── Imperative timer — ref-based to avoid stale closures ─────────────────────
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secsRef     = useRef(0);

  const tick = useCallback(() => {
    secsRef.current = Math.max(0, secsRef.current - 1);
    const s = secsRef.current;
    setTimerDisplay(prev => (prev ? { ...prev, secs: s } : null));
    if (s === 0) {
      clearInterval(intervalRef.current!);
      intervalRef.current = null;
    }
  }, []);

  const startRestTimer = useCallback((seconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    secsRef.current = seconds;
    setTimerDisplay({ secs: seconds, total: seconds });
    intervalRef.current = setInterval(tick, 1000);
  }, [tick]);

  const dismissTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setTimerDisplay(null);
  }, []);

  const addTimerTime = useCallback((seconds: number) => {
    secsRef.current += seconds;
    const s = secsRef.current;
    setTimerDisplay(prev => (prev ? { ...prev, secs: s } : null));
    if (!intervalRef.current) {
      intervalRef.current = setInterval(tick, 1000);
    }
  }, [tick]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // ── Exercise actions ──────────────────────────────────────────────────────────

  const completeSet = useCallback((
    exerciseId: string,
    setIndex: number,
    actualReps: number,
    actualWeight: number,
    restSecs: number,
  ) => {
    setExercises(prev =>
      prev.map(ex =>
        ex.id !== exerciseId ? ex : {
          ...ex,
          sets: ex.sets.map((s, i) =>
            i !== setIndex ? s : {
              ...s, actualReps, actualWeight,
              completed: true,
              metTarget: actualReps >= s.targetReps,
            }
          ),
        }
      )
    );
    startRestTimer(restSecs);
  }, [startRestTimer]);

  const adjustWeight = useCallback((exerciseId: string, delta: number) => {
    setExercises(prev =>
      prev.map(ex =>
        ex.id !== exerciseId ? ex : {
          ...ex,
          sets: ex.sets.map(s =>
            s.completed ? s : {
              ...s,
              targetWeight: Math.max(0, parseFloat((s.targetWeight + delta).toFixed(1))),
              actualWeight: Math.max(0, parseFloat((s.actualWeight + delta).toFixed(1))),
            }
          ),
        }
      )
    );
  }, []);

  const updateNotes = useCallback((exerciseId: string, notes: string) => {
    setExercises(prev => prev.map(ex => ex.id === exerciseId ? { ...ex, notes } : ex));
  }, []);

  // ── Progress ──────────────────────────────────────────────────────────────────

  const completedExCount = exercises.filter(ex => ex.sets.every(s => s.completed)).length;
  const currentExIdx     = exercises.findIndex(ex => ex.sets.some(s => !s.completed));
  const currentExNum     = currentExIdx === -1 ? exercises.length : currentExIdx + 1;
  const hasUnderTarget   = exercises.some(ex => ex.sets.some(s => s.metTarget === false));

  // ── Summary phase ─────────────────────────────────────────────────────────────

  const handleSave = useCallback((rating: number | null, notes: string) => {
    router.back();
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { console.log('[session] error: no user'); return; }
        console.log('[session] inserting...');
        const result = await supabase.from('sessions').insert({
          user_id:      user.id,
          date:         todayStr(),
          workout_type: SESSION_META.type,
          rating,
          notes,
          exercises,
          completed_at: new Date().toISOString(),
        });
        console.log('[session] result:', result);
        if (!result.error) {
          setCompletedDates(prev => new Set([...prev, todayStr()]));
        }
      } catch (e) {
        console.log('[session] error:', e);
      }
    })();
  }, [exercises]);

  if (!twLoaded) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  if (twProfile?.test_week_status === 'in_progress') return <TestWeekSession profile={twProfile} />;

  if (phase === 'summary') {
    return (
      <SummaryScreen
        exercises={exercises}
        hasUnderTarget={hasUnderTarget}
        onSave={handleSave}
      />
    );
  }

  // ── Active session ─────────────────────────────────────────────────────────────

  return (
    <View style={s.screen}>
      <BackgroundWash />
      <SafeAreaView edges={['top']} style={s.safeTop}>
        <SessionHeader
          currentExercise={currentExNum}
          totalExercises={exercises.length}
          completedExercises={completedExCount}
        />
        <WeekStrip completedDates={completedDates} dates={dates} />
      </SafeAreaView>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {exercises.map((ex, i) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              isActive={currentExIdx === i}
              onCompleteSet={(si, reps, wt) => completeSet(ex.id, si, reps, wt, ex.restSeconds)}
              onAdjustWeight={delta => adjustWeight(ex.id, delta)}
              onUpdateNotes={notes => updateNotes(ex.id, notes)}
            />
          ))}

          <Pressable
            onPress={() => setPhase('summary')}
            onPressIn={ctaPressIn}
            onPressOut={ctaPressOut}
          >
            <Animated.View style={[s.completeBtn, { transform: [{ scale: ctaScale }] }]}>
              <Text style={s.completeBtnText}>Complete Session</Text>
            </Animated.View>
          </Pressable>
        </ScrollView>

        {timerDisplay && (
          <RestTimerPanel
            secs={timerDisplay.secs}
            total={timerDisplay.total}
            onSkip={dismissTimer}
            onAddTime={() => addTimerTime(30)}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Session header ───────────────────────────────────────────────────────────

function SessionHeader({
  currentExercise,
  totalExercises,
  completedExercises,
}: {
  currentExercise: number;
  totalExercises: number;
  completedExercises: number;
}) {
  const accentColor = INTENSITY_COLOR[SESSION_META.intensity];
  const progress    = completedExercises / totalExercises;

  return (
    <View style={h.wrapper}>
      <View style={[h.intensityBar, { backgroundColor: accentColor }]} />

      <View style={h.content}>
        <View style={h.topRow}>
          <Pressable
            style={({ pressed }) => [h.back, pressed && { opacity: 0.6 }]}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <SymbolView
              name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
              size={17}
              tintColor={C.textMuted}
            />
          </Pressable>

          <View style={h.titleGroup}>
            <Text style={h.title}>{SESSION_META.type}</Text>
            <Text style={h.subtitle}>
              {SESSION_META.duration}
              {'  ·  '}
              <Text style={{ color: accentColor }}>{SESSION_META.intensity}</Text>
            </Text>
          </View>

          <View style={h.counter}>
            <Text style={h.counterNum}>{currentExercise}</Text>
            <Text style={h.counterOf}> of {totalExercises}</Text>
          </View>
        </View>

        <View style={h.progressTrack}>
          <View style={[h.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>
    </View>
  );
}

// ─── Exercise card ────────────────────────────────────────────────────────────

type ExerciseCardProps = {
  exercise: ExerciseData;
  isActive: boolean;
  onCompleteSet: (setIndex: number, actualReps: number, actualWeight: number) => void;
  onAdjustWeight: (delta: number) => void;
  onUpdateNotes: (notes: string) => void;
};

function ExerciseCard({
  exercise,
  isActive,
  onCompleteSet,
  onAdjustWeight,
  onUpdateNotes,
}: ExerciseCardProps) {
  const allDone        = exercise.sets.every(s => s.completed);
  const completedCount = exercise.sets.filter(s => s.completed).length;

  return (
    <View style={ec.wrapper}>
      <View style={[ec.accentBar, { backgroundColor: isActive ? C.gold : 'transparent' }]} />

      <View style={ec.body}>
        <View style={ec.header}>
          <Text style={ec.name}>{exercise.name}</Text>
          <View style={ec.headerRight}>
            <View style={ec.badge}>
              <Text style={ec.badgeText}>{exercise.category}</Text>
            </View>
            <Text style={ec.setCount}>{completedCount}/{exercise.sets.length}</Text>
          </View>
        </View>

        <View style={ec.setsList}>
          {exercise.sets.map((set, i) => (
            <SetRow
              key={i}
              setNumber={i + 1}
              set={set}
              onComplete={(reps, wt) => onCompleteSet(i, reps, wt)}
            />
          ))}
        </View>

        {!allDone && (
          <View style={ec.adjustRow}>
            <Pressable
              style={({ pressed }) => [ec.adjustBtn, pressed && ec.btnPressed]}
              onPress={() => onAdjustWeight(-2.5)}
            >
              <Text style={ec.adjustLabel}>Too Hard</Text>
              <Text style={ec.adjustSub}>−2.5 kg</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [ec.adjustBtn, pressed && ec.btnPressed]}
              onPress={() => onAdjustWeight(2.5)}
            >
              <Text style={ec.adjustLabel}>Too Easy</Text>
              <Text style={ec.adjustSub}>+2.5 kg</Text>
            </Pressable>
          </View>
        )}

        <TextInput
          style={ec.notes}
          value={exercise.notes}
          onChangeText={onUpdateNotes}
          placeholder="Add notes..."
          placeholderTextColor={C.textFaint}
          multiline
          submitBehavior="blurAndSubmit"
        />
      </View>
    </View>
  );
}

// ─── Set row ──────────────────────────────────────────────────────────────────

type SetRowProps = {
  setNumber: number;
  set: SetData;
  onComplete: (actualReps: number, actualWeight: number) => void;
};

function SetRow({ setNumber, set, onComplete }: SetRowProps) {
  const fmtWeight = (w: number) =>
    Number.isInteger(w) ? String(w) : w.toFixed(1);

  const [repsText, setRepsText]     = useState(() => String(set.actualReps));
  const [weightText, setWeightText] = useState(() => fmtWeight(set.actualWeight));

  // Spring scale for the completion tick
  const tickScale = useRef(new Animated.Value(0)).current;

  // Sync weight display when parent adjusts via Too Easy / Too Hard
  useEffect(() => {
    if (!set.completed) setWeightText(fmtWeight(set.actualWeight));
  }, [set.actualWeight, set.completed]);

  // Pop the tick in with a spring when set is first completed
  useEffect(() => {
    if (set.completed) {
      Animated.spring(tickScale, {
        toValue: 1,
        tension: 130,
        friction: 6,
        useNativeDriver: true,
      }).start();
    }
  }, [set.completed]);

  // ── Completed state ───────────────────────────────────────────────────────────

  if (set.completed) {
    const under = set.metTarget === false;
    return (
      <View style={[sr.row, sr.completedRow, under && sr.underRow]}>
        <Text style={sr.completedNum}>{setNumber}</Text>
        <View style={sr.completedValues}>
          <Text style={[sr.completedReps, under && { color: C.red }]}>{set.actualReps}</Text>
          <Text style={sr.unit}>reps</Text>
          <View style={sr.dot} />
          <Text style={sr.completedWeight}>{fmtWeight(set.actualWeight)}</Text>
          <Text style={sr.unit}>kg</Text>
        </View>
        <Animated.View style={{ transform: [{ scale: tickScale }] }}>
          <SymbolView
            name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
            size={20}
            tintColor={under ? C.red : C.textMuted}
          />
        </Animated.View>
      </View>
    );
  }

  // ── Active state ──────────────────────────────────────────────────────────────

  return (
    <View style={sr.row}>
      <View style={sr.numPill}>
        <Text style={sr.numText}>{setNumber}</Text>
      </View>

      <View style={sr.inputs}>
        <View style={sr.inputWrap}>
          <TextInput
            style={sr.input}
            value={repsText}
            onChangeText={setRepsText}
            keyboardType="number-pad"
            selectTextOnFocus
            returnKeyType="done"
          />
          <Text style={sr.unit}>reps</Text>
        </View>

        <View style={sr.inputWrap}>
          <TextInput
            style={sr.input}
            value={weightText}
            onChangeText={setWeightText}
            keyboardType="decimal-pad"
            selectTextOnFocus
            returnKeyType="done"
          />
          <Text style={sr.unit}>kg</Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [sr.doneBtn, pressed && { opacity: 0.6 }]}
        onPress={() => {
          const reps = parseInt(repsText, 10);
          const wt   = parseFloat(weightText);
          onComplete(
            isNaN(reps) ? set.targetReps : reps,
            isNaN(wt)   ? set.targetWeight : wt,
          );
        }}
      >
        <SymbolView
          name={{ ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' }}
          size={26}
          tintColor={C.textFaint}
        />
      </Pressable>
    </View>
  );
}

// ─── Rest timer panel ─────────────────────────────────────────────────────────

function RestTimerPanel({
  secs,
  total,
  onSkip,
  onAddTime,
}: {
  secs: number;
  total: number;
  onSkip: () => void;
  onAddTime: () => void;
}) {
  const insets    = useSafeAreaInsets();
  const mm        = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss        = String(secs % 60).padStart(2, '0');
  const progress  = total > 0 ? secs / total : 0;
  const done      = secs === 0;

  // Gentle breathing pulse while timer counts down
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loopRef   = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!done) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.8, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      loopRef.current = null;
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
    return () => { loopRef.current?.stop(); loopRef.current = null; };
  }, [done]);

  return (
    <View style={[rt.panel, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      <View style={rt.inner}>
        <View style={rt.topRow}>
          <Text style={rt.label}>REST</Text>
          <Animated.Text style={[rt.time, { opacity: pulseAnim }]}>{mm}:{ss}</Animated.Text>
          <View style={rt.btns}>
            <Pressable
              style={({ pressed }) => [rt.quietBtn, pressed && { opacity: 0.65, transform: [{ scale: 0.985 }] }]}
              onPress={onAddTime}
            >
              <Text style={rt.quietBtnText}>+30s</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [rt.quietBtn, pressed && { opacity: 0.65, transform: [{ scale: 0.985 }] }]}
              onPress={onSkip}
            >
              <Text style={rt.quietBtnText}>{done ? 'Done' : 'Skip'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={rt.track}>
          <View style={[rt.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>
    </View>
  );
}

// ─── Summary screen ───────────────────────────────────────────────────────────

const COACH_RECOVERY =
  "Good work. Your posterior chain took a real hit today — prioritise sleep and protein tonight. You're building the base; the strength will come.";

function SummaryScreen({
  exercises,
  hasUnderTarget,
  onSave,
}: {
  exercises: ExerciseData[];
  hasUnderTarget: boolean;
  onSave: (rating: number | null, notes: string) => void;
}) {
  const [rating, setRating]           = useState<number | null>(null);
  const [sessionNote, setSessionNote] = useState('');
  const [underNote, setUnderNote]     = useState('');

  const saveScale    = useRef(new Animated.Value(1)).current;
  const savePressIn  = () => Animated.timing(saveScale, { toValue: 0.983, duration: 120, useNativeDriver: true }).start();
  const savePressOut = () => Animated.timing(saveScale, { toValue: 1, duration: 120, useNativeDriver: true }).start();

  const totalSets     = exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const completedSets = exercises.reduce((n, ex) => n + ex.sets.filter(s => s.completed).length, 0);
  const underCount    = exercises.reduce((n, ex) => n + ex.sets.filter(s => s.metTarget === false).length, 0);
  const exDone        = exercises.filter(ex => ex.sets.every(s => s.completed)).length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={sum.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Heading */}
          <View style={sum.heading}>
            <SymbolView
              name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
              size={40}
              tintColor={C.green}
            />
            <Text style={sum.title}>Session Complete</Text>
            <Text style={sum.titleSub}>{SESSION_META.type}</Text>
          </View>

          {/* Stats */}
          <View style={sum.statsRow}>
            <StatChip label="SETS" value={`${completedSets}/${totalSets}`} />
            <StatChip label="EXERCISES" value={`${exDone}/${exercises.length}`} />
            {underCount > 0 && (
              <StatChip label="UNDER TARGET" value={String(underCount)} accent={C.red} />
            )}
          </View>

          {/* AI coach recovery message */}
          <View style={sum.coachWrap}>
            <View style={[sum.coachBorder, { backgroundColor: C.gold }]} />
            <Text style={sum.coachText}>{COACH_RECOVERY}</Text>
          </View>

          {/* Rating */}
          <View style={sum.section}>
            <Text style={sum.sectionLabel}>HOW WAS IT?</Text>
            <View style={sum.ratingRow}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <Pressable
                  key={n}
                  style={[sum.ratingBtn, rating === n && sum.ratingActive]}
                  onPress={() => setRating(n)}
                >
                  <Text style={[sum.ratingNum, rating === n && sum.ratingNumActive]}>{n}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Under-target prompt */}
          {hasUnderTarget && (
            <View style={sum.section}>
              <Text style={sum.sectionLabel}>SETS UNDER TARGET</Text>
              <Text style={sum.prompt}>
                A couple of sets came in under target today. Anything worth noting?
              </Text>
              <TextInput
                style={sum.textArea}
                value={underNote}
                onChangeText={setUnderNote}
                placeholder="Heavy day, poor sleep, form focus..."
                placeholderTextColor={C.textFaint}
                multiline
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Session notes */}
          <View style={sum.section}>
            <Text style={sum.sectionLabel}>SESSION NOTES</Text>
            <TextInput
              style={sum.textArea}
              value={sessionNote}
              onChangeText={setSessionNote}
              placeholder="How did it feel overall?"
              placeholderTextColor={C.textFaint}
              multiline
              textAlignVertical="top"
            />
          </View>

          <Pressable
            onPress={() => onSave(rating, sessionNote)}
            onPressIn={savePressIn}
            onPressOut={savePressOut}
          >
            <Animated.View style={[sum.saveBtn, { transform: [{ scale: saveScale }] }]}>
              <Text style={sum.saveBtnText}>Save & Finish</Text>
            </Animated.View>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={sum.chip}>
      <Text style={[sum.chipValue, accent ? { color: accent } : undefined]}>{value}</Text>
      <Text style={sum.chipLabel}>{label}</Text>
    </View>
  );
}

// ─── StyleSheets ─────────────────────────────────────────────────────────────

const s = StyleSheet.create({
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
  completeBtnPressed: { opacity: 0.8 },
  completeBtnText: {
    fontFamily: fonts.sansSemiBold,
    color:      C.bg,
    fontSize:   15,
    letterSpacing: 0.2,
  },
});

const h = StyleSheet.create({
  wrapper: {
    flexDirection:     'row',
    backgroundColor:   C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  intensityBar: { width: 3 },
  content: {
    flex:              1,
    paddingHorizontal: 16,
    paddingTop:        12,
    paddingBottom:     14,
    gap:               10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
  },
  back: {
    width:           32,
    height:          32,
    borderRadius:    16,
    backgroundColor: C.card,
    borderWidth:     1,
    borderColor:     C.cardBorder,
    alignItems:      'center',
    justifyContent:  'center',
  },
  titleGroup: { flex: 1 },
  title: {
    fontFamily:    fonts.sansBold,
    color:         C.text,
    fontSize:      16,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: fonts.sans,
    color:      C.textMuted,
    fontSize:   12,
    marginTop:  2,
  },
  counter: {
    flexDirection: 'row',
    alignItems:    'baseline',
  },
  counterNum: {
    fontFamily: fonts.sansSemiBold,
    color:      C.text,
    fontSize:   18,
  },
  counterOf: {
    fontFamily: fonts.sans,
    color:      C.textMuted,
    fontSize:   12,
  },
  progressTrack: {
    height:          2,
    backgroundColor: C.divider,
    borderRadius:    1,
    overflow:        'hidden',
  },
  progressFill: {
    height:          2,
    backgroundColor: C.textMuted,
    borderRadius:    1,
  },
});

const ec = StyleSheet.create({
  wrapper: {
    flexDirection:   'row',
    backgroundColor: C.card,
    borderRadius:    14,
    borderWidth:     1,
    borderColor:     C.cardBorder,
    overflow:        'hidden',
  },
  accentBar: { width: 3 },
  body: {
    flex:    1,
    padding: 16,
    gap:     14,
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
  },
  name: {
    fontFamily:    fonts.sansBold,
    color:         C.text,
    fontSize:      18,
    letterSpacing: -0.3,
    flex:          1,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap:        4,
    marginLeft: 8,
  },
  badge: {
    backgroundColor:  C.bg,
    borderRadius:     5,
    paddingHorizontal: 8,
    paddingVertical:  3,
  },
  badgeText: {
    fontFamily:    fonts.sansSemiBold,
    color:         C.textFaint,
    fontSize:      9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  setCount: {
    fontFamily: fonts.sansMedium,
    color:      C.textMuted,
    fontSize:   12,
  },
  setsList: { gap: 4 },
  adjustRow: {
    flexDirection: 'row',
    gap:           10,
  },
  adjustBtn: {
    flex:            1,
    borderRadius:    10,
    borderWidth:     1,
    borderColor:     C.cardBorder,
    backgroundColor: 'transparent',
    paddingVertical: 11,
    alignItems:      'center',
    gap:             2,
  },
  btnPressed:  { opacity: 0.65, transform: [{ scale: 0.985 }] },
  adjustLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize:   13,
    color:      C.text,
  },
  adjustSub: {
    fontFamily: fonts.sans,
    fontSize:   11,
    color:      C.textMuted,
  },
  notes: {
    fontFamily:     fonts.sans,
    color:          C.textMuted,
    fontSize:       13,
    borderTopWidth: 1,
    borderTopColor: C.divider,
    paddingTop:     12,
    minHeight:      32,
  },
});

const sr = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 8,
    gap:             10,
    borderRadius:    8,
  },
  completedRow: { opacity: 0.55 },
  underRow: {
    opacity:           1,
    backgroundColor:   `${C.red}0F`,
    paddingHorizontal: 6,
    marginHorizontal:  -4,
  },
  numPill: {
    width:           24,
    height:          24,
    borderRadius:    12,
    backgroundColor: C.bg,
    borderWidth:     1,
    borderColor:     C.divider,
    alignItems:      'center',
    justifyContent:  'center',
  },
  numText: {
    fontFamily: fonts.sansSemiBold,
    color:      C.textMuted,
    fontSize:   11,
  },
  inputs: {
    flex:          1,
    flexDirection: 'row',
    gap:           8,
  },
  inputWrap: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   C.bg,
    borderRadius:      8,
    borderWidth:       1,
    borderColor:       C.divider,
    paddingHorizontal: 10,
    paddingVertical:   8,
    gap:               4,
  },
  input: {
    fontFamily:  fonts.sansSemiBold,
    flex:        1,
    color:       C.text,
    fontSize:    15,
    padding:     0,
    minWidth:    28,
    textAlign:   'center',
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontFamily: fonts.sans,
    color:      C.textFaint,
    fontSize:   11,
  },
  doneBtn: { padding: 2 },

  // Completed row
  completedNum: {
    fontFamily: fonts.sansSemiBold,
    width:      24,
    color:      C.textFaint,
    fontSize:   11,
    textAlign:  'center',
  },
  completedValues: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  completedReps: {
    fontFamily:  fonts.sansSemiBold,
    color:       C.text,
    fontSize:    15,
    fontVariant: ['tabular-nums'],
  },
  completedWeight: {
    fontFamily:  fonts.sansMedium,
    color:       C.textMuted,
    fontSize:    14,
    fontVariant: ['tabular-nums'],
  },
  dot: {
    width:            3,
    height:           3,
    borderRadius:     1.5,
    backgroundColor:  C.divider,
    marginHorizontal: 2,
  },
});

const rt = StyleSheet.create({
  panel: {
    backgroundColor: C.card,
    borderTopWidth:  1,
    borderTopColor:  C.cardBorder,
    paddingTop:      14,
  },
  inner: {
    paddingHorizontal: 20,
    gap:               10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },
  label: {
    fontFamily:    fonts.sansSemiBold,
    color:         C.textFaint,
    fontSize:      10,
    letterSpacing: 2,
    width:         38,
  },
  time: {
    fontFamily:    fonts.sansBold,
    flex:          1,
    color:         C.text,
    fontVariant:   ['tabular-nums'],
    fontSize:      28,
    letterSpacing: -1,
  },
  btns: {
    flexDirection: 'row',
    gap:           8,
  },
  quietBtn: {
    backgroundColor:   C.bg,
    borderRadius:      8,
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderWidth:       1,
    borderColor:       C.divider,
  },
  quietBtnText: {
    fontFamily: fonts.sansMedium,
    color:      C.textMuted,
    fontSize:   12,
  },
  track: {
    height:          2,
    backgroundColor: C.divider,
    borderRadius:    1,
    overflow:        'hidden',
    marginBottom:    4,
  },
  fill: {
    height:          2,
    backgroundColor: C.gold,
    borderRadius:    1,
  },
});

const sum = StyleSheet.create({
  content: {
    paddingHorizontal: 22,
    paddingTop:        36,
    paddingBottom:     44,
    gap:               24,
  },
  heading: {
    alignItems:    'center',
    gap:           10,
    paddingBottom: 6,
  },
  title: {
    fontFamily:    fonts.sansBold,
    color:         C.text,
    fontSize:      26,
    letterSpacing: -0.5,
  },
  titleSub: {
    fontFamily: fonts.sans,
    color:      C.textMuted,
    fontSize:   13,
  },
  statsRow: {
    flexDirection: 'row',
    gap:           10,
  },
  chip: {
    flex:              1,
    backgroundColor:   C.card,
    borderRadius:      12,
    borderWidth:       1,
    borderColor:       C.cardBorder,
    paddingVertical:   14,
    paddingHorizontal: 10,
    alignItems:        'center',
    gap:               6,
  },
  chipValue: {
    fontFamily:    fonts.sansBold,
    color:         C.text,
    fontSize:      18,
    letterSpacing: -0.3,
  },
  chipLabel: {
    fontFamily:    fonts.sansSemiBold,
    color:         C.textFaint,
    fontSize:      8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Coach recovery message
  coachWrap: {
    flexDirection: 'row',
  },
  coachBorder: {
    width:        2,
    borderRadius: 1,
    marginRight:  14,
  },
  coachText: {
    flex:       1,
    fontFamily: fonts.serif,
    fontSize:   18,
    color:      C.text,
    lineHeight: 18 * 1.35,
  },

  section: { gap: 10 },
  sectionLabel: {
    fontFamily:    fonts.sansSemiBold,
    color:         C.textMuted,
    fontSize:      9,
    letterSpacing: 0.09 * 9,
    textTransform: 'uppercase',
  },
  ratingRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
  },
  ratingBtn: {
    width:           30,
    height:          30,
    borderRadius:    15,
    backgroundColor: C.card,
    borderWidth:     1,
    borderColor:     C.cardBorder,
    alignItems:      'center',
    justifyContent:  'center',
  },
  ratingActive: {
    backgroundColor: C.gold,
    borderColor:     C.gold,
  },
  ratingNum: {
    fontFamily: fonts.sansSemiBold,
    color:      C.textMuted,
    fontSize:   12,
  },
  ratingNumActive: {
    fontFamily: fonts.sansBold,
    color:      C.bg,
  },
  prompt: {
    fontFamily: fonts.sans,
    color:      C.textMuted,
    fontSize:   13,
    lineHeight: 20,
    marginTop:  -2,
  },
  textArea: {
    fontFamily:      fonts.sans,
    backgroundColor: C.card,
    borderRadius:    12,
    borderWidth:     1,
    borderColor:     C.cardBorder,
    padding:         14,
    color:           C.text,
    fontSize:        14,
    minHeight:       80,
  },
  saveBtn: {
    backgroundColor: C.gold,
    borderRadius:    14,
    paddingVertical: 17,
    alignItems:      'center',
    marginTop:       4,
  },
  saveBtnPressed: { opacity: 0.8 },
  saveBtnText: {
    fontFamily:    fonts.sansSemiBold,
    color:         C.bg,
    fontSize:      15,
    letterSpacing: 0.2,
  },
});
