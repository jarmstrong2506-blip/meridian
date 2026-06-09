import { useCallback, useEffect, useRef, useState } from 'react';
import {
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

import { Colors } from '@/constants/theme';

// ─── Colour shortcuts ─────────────────────────────────────────────────────────

const BG     = Colors.dark.background;
const CARD   = '#181818';
const BORDER = '#2A2A2A';
const GREEN  = '#5CAD83';
const AMBER  = '#C49A50';
const RED    = '#B86262';
const MUTED  = Colors.dark.textSecondary;

const INTENSITY_COLOR: Record<string, string> = {
  Light: GREEN, Moderate: AMBER, High: RED,
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

// ─── Session meta + data ──────────────────────────────────────────────────────

const SESSION_META = {
  type: 'Lower Body',
  focus: 'Strength',
  duration: '~55 min',
  intensity: 'Moderate' as const,
};

function makeSet(targetReps: number, targetWeight: number): SetData {
  return {
    targetReps, targetWeight,
    actualReps: targetReps, actualWeight: targetWeight,
    completed: false, metTarget: null,
  };
}

const INITIAL_EXERCISES: ExerciseData[] = [
  {
    id: '1', name: 'Back Squat', category: 'compound', restSeconds: 150,
    sets: [makeSet(8, 80), makeSet(8, 80), makeSet(8, 80), makeSet(8, 80)],
    notes: '',
  },
  {
    id: '2', name: 'Romanian Deadlift', category: 'compound', restSeconds: 150,
    sets: [makeSet(10, 70), makeSet(10, 70), makeSet(10, 70)],
    notes: '',
  },
  {
    id: '3', name: 'Leg Press', category: 'compound', restSeconds: 150,
    sets: [makeSet(12, 120), makeSet(12, 120), makeSet(12, 120)],
    notes: '',
  },
  {
    id: '4', name: 'Walking Lunges', category: 'accessory', restSeconds: 75,
    sets: [makeSet(12, 20), makeSet(12, 20), makeSet(12, 20)],
    notes: '',
  },
  {
    id: '5', name: 'Lying Leg Curl', category: 'accessory', restSeconds: 75,
    sets: [makeSet(15, 40), makeSet(15, 40), makeSet(15, 40)],
    notes: '',
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

type TimerDisplay = { secs: number; total: number } | null;
type SessionPhase = 'active' | 'summary';

export default function SessionScreen() {
  const [exercises, setExercises] = useState<ExerciseData[]>(INITIAL_EXERCISES);
  const [timerDisplay, setTimerDisplay] = useState<TimerDisplay>(null);
  const [phase, setPhase] = useState<SessionPhase>('active');

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

  if (phase === 'summary') {
    return (
      <SummaryScreen
        exercises={exercises}
        hasUnderTarget={hasUnderTarget}
        onSave={() => router.back()}
      />
    );
  }

  // ── Active session ─────────────────────────────────────────────────────────────

  return (
    <View style={s.screen}>
      <SafeAreaView edges={['top']} style={s.safeTop}>
        <SessionHeader
          currentExercise={currentExNum}
          totalExercises={exercises.length}
          completedExercises={completedExCount}
        />
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
            style={({ pressed }) => [s.completeBtn, pressed && s.completeBtnPressed]}
            onPress={() => setPhase('summary')}
          >
            <Text style={s.completeBtnText}>Complete Session</Text>
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
              tintColor="#FFFFFF"
            />
          </Pressable>

          <View style={h.titleGroup}>
            <Text style={h.title}>
              {SESSION_META.type} — {SESSION_META.focus}
            </Text>
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
  const allDone       = exercise.sets.every(s => s.completed);
  const completedCount = exercise.sets.filter(s => s.completed).length;

  return (
    <View style={ec.wrapper}>
      <View style={[ec.accentBar, { backgroundColor: isActive ? GREEN : 'transparent' }]} />

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
              style={({ pressed }) => [ec.adjustBtn, ec.amberBtn, pressed && ec.btnPressed]}
              onPress={() => onAdjustWeight(-2.5)}
            >
              <Text style={[ec.adjustLabel, { color: AMBER }]}>Too Hard</Text>
              <Text style={[ec.adjustSub, { color: AMBER }]}>−2.5 kg</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [ec.adjustBtn, ec.greenBtn, pressed && ec.btnPressed]}
              onPress={() => onAdjustWeight(2.5)}
            >
              <Text style={[ec.adjustLabel, { color: GREEN }]}>Too Easy</Text>
              <Text style={[ec.adjustSub, { color: GREEN }]}>+2.5 kg</Text>
            </Pressable>
          </View>
        )}

        <TextInput
          style={ec.notes}
          value={exercise.notes}
          onChangeText={onUpdateNotes}
          placeholder="Add notes..."
          placeholderTextColor="#222"
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

  // Sync weight display when parent adjusts via Too Easy / Too Hard
  useEffect(() => {
    if (!set.completed) setWeightText(fmtWeight(set.actualWeight));
  }, [set.actualWeight, set.completed]);

  // ── Completed state ───────────────────────────────────────────────────────────

  if (set.completed) {
    const under = set.metTarget === false;
    return (
      <View style={[sr.row, sr.completedRow, under && sr.underRow]}>
        <Text style={sr.completedNum}>{setNumber}</Text>
        <View style={sr.completedValues}>
          <Text style={[sr.completedReps, under && { color: RED }]}>{set.actualReps}</Text>
          <Text style={sr.unit}>reps</Text>
          <View style={sr.dot} />
          <Text style={sr.completedWeight}>{fmtWeight(set.actualWeight)}</Text>
          <Text style={sr.unit}>kg</Text>
        </View>
        <SymbolView
          name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
          size={20}
          tintColor={under ? RED : GREEN}
        />
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
          tintColor="#2E2E2E"
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
  const insets   = useSafeAreaInsets();
  const mm       = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss       = String(secs % 60).padStart(2, '0');
  const progress = total > 0 ? secs / total : 0;
  const done     = secs === 0;

  return (
    <View style={[rt.panel, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      <View style={rt.inner}>
        <View style={rt.topRow}>
          <Text style={rt.label}>REST</Text>
          <Text style={[rt.time, done && { color: GREEN }]}>{mm}:{ss}</Text>
          <View style={rt.btns}>
            <Pressable
              style={({ pressed }) => [rt.addBtn, pressed && { opacity: 0.6 }]}
              onPress={onAddTime}
            >
              <Text style={rt.addBtnText}>+30s</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [rt.skipBtn, pressed && { opacity: 0.6 }]}
              onPress={onSkip}
            >
              <Text style={rt.skipBtnText}>{done ? 'Done' : 'Skip'}</Text>
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

function SummaryScreen({
  exercises,
  hasUnderTarget,
  onSave,
}: {
  exercises: ExerciseData[];
  hasUnderTarget: boolean;
  onSave: () => void;
}) {
  const [rating, setRating]               = useState<number | null>(null);
  const [sessionNote, setSessionNote]     = useState('');
  const [underNote, setUnderNote]         = useState('');

  const totalSets     = exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const completedSets = exercises.reduce((n, ex) => n + ex.sets.filter(s => s.completed).length, 0);
  const underCount    = exercises.reduce((n, ex) => n + ex.sets.filter(s => s.metTarget === false).length, 0);
  const exDone        = exercises.filter(ex => ex.sets.every(s => s.completed)).length;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
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
              tintColor={GREEN}
            />
            <Text style={sum.title}>Session Complete</Text>
            <Text style={sum.titleSub}>{SESSION_META.type} · {SESSION_META.focus}</Text>
          </View>

          {/* Stats */}
          <View style={sum.statsRow}>
            <StatChip label="SETS" value={`${completedSets}/${totalSets}`} />
            <StatChip label="EXERCISES" value={`${exDone}/${exercises.length}`} />
            {underCount > 0 && (
              <StatChip label="UNDER TARGET" value={String(underCount)} accent={RED} />
            )}
          </View>

          {/* Rating */}
          <View style={sum.section}>
            <Text style={sum.label}>HOW WAS IT?</Text>
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
              <Text style={sum.label}>SETS UNDER TARGET</Text>
              <Text style={sum.prompt}>
                A couple of sets came in under target today. Anything worth noting?
              </Text>
              <TextInput
                style={sum.textArea}
                value={underNote}
                onChangeText={setUnderNote}
                placeholder="Heavy day, poor sleep, form focus..."
                placeholderTextColor="#252525"
                multiline
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Session notes */}
          <View style={sum.section}>
            <Text style={sum.label}>SESSION NOTES</Text>
            <TextInput
              style={sum.textArea}
              value={sessionNote}
              onChangeText={setSessionNote}
              placeholder="How did it feel overall?"
              placeholderTextColor="#252525"
              multiline
              textAlignVertical="top"
            />
          </View>

          <Pressable
            style={({ pressed }) => [sum.saveBtn, pressed && sum.saveBtnPressed]}
            onPress={onSave}
          >
            <Text style={sum.saveBtnText}>Save & Finish</Text>
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
  screen:             { flex: 1, backgroundColor: BG },
  safeTop:            { backgroundColor: BG },
  flex:               { flex: 1 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop:        14,
    paddingBottom:     40,
    gap:               14,
  },
  completeBtn: {
    backgroundColor: GREEN,
    borderRadius:    14,
    paddingVertical: 17,
    alignItems:      'center',
    marginTop:       6,
  },
  completeBtnPressed: { opacity: 0.8 },
  completeBtnText: {
    color:         BG,
    fontSize:      15,
    fontWeight:    '600',
    letterSpacing: 0.2,
  },
});

const h = StyleSheet.create({
  wrapper: {
    flexDirection:     'row',
    backgroundColor:   BG,
    borderBottomWidth: 1,
    borderBottomColor: '#131313',
  },
  intensityBar: { width: 3 },
  content: {
    flex:             1,
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
    backgroundColor: '#1C1C1C',
    alignItems:      'center',
    justifyContent:  'center',
  },
  titleGroup: { flex: 1 },
  title: {
    color:         '#FFFFFF',
    fontSize:      16,
    fontWeight:    '600',
    letterSpacing: -0.2,
  },
  subtitle: {
    color:      MUTED,
    fontSize:   12,
    fontWeight: '400',
    marginTop:  2,
  },
  counter: {
    flexDirection: 'row',
    alignItems:    'baseline',
  },
  counterNum: {
    color:      '#FFFFFF',
    fontSize:   18,
    fontWeight: '600',
  },
  counterOf: {
    color:      '#3A3A3A',
    fontSize:   12,
    fontWeight: '500',
  },
  progressTrack: {
    height:          2,
    backgroundColor: '#151515',
    borderRadius:    1,
    overflow:        'hidden',
  },
  progressFill: {
    height:          2,
    backgroundColor: GREEN,
    borderRadius:    1,
  },
});

const ec = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius:    16,
    borderWidth:     1,
    borderColor:     BORDER,
    overflow:        'hidden',
  },
  accentBar: { width: 3 },
  body: {
    flex:    1,
    padding: 18,
    gap:     16,
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
  },
  name: {
    color:         '#FFFFFF',
    fontSize:      19,
    fontWeight:    '600',
    letterSpacing: -0.3,
    flex:          1,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap:        4,
    marginLeft: 8,
  },
  badge: {
    backgroundColor: '#111111',
    borderRadius:    5,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  badgeText: {
    color:          '#3A3A3A',
    fontSize:       9,
    fontWeight:     '600',
    letterSpacing:  1.2,
    textTransform:  'uppercase',
  },
  setCount: {
    color:      '#3A3A3A',
    fontSize:   12,
    fontWeight: '500',
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
    paddingVertical: 11,
    alignItems:      'center',
    gap:             2,
  },
  amberBtn: {
    backgroundColor: `${AMBER}12`,
    borderColor:     `${AMBER}30`,
  },
  greenBtn: {
    backgroundColor: `${GREEN}12`,
    borderColor:     `${GREEN}30`,
  },
  btnPressed:  { opacity: 0.65 },
  adjustLabel: { fontSize: 13, fontWeight: '600' },
  adjustSub:   { fontSize: 11, fontWeight: '400', opacity: 0.7 },
  notes: {
    color:           '#555',
    fontSize:        13,
    borderTopWidth:  1,
    borderTopColor:  '#1A1A1A',
    paddingTop:      12,
    minHeight:       32,
  },
});

const sr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingVertical: 8,
    gap:             10,
    borderRadius:    8,
  },
  completedRow: { opacity: 0.65 },
  underRow: {
    opacity:          1,
    backgroundColor:  `${RED}09`,
    paddingHorizontal: 6,
    marginHorizontal: -4,
  },
  numPill: {
    width:           24,
    height:          24,
    borderRadius:    12,
    backgroundColor: '#111',
    alignItems:      'center',
    justifyContent:  'center',
  },
  numText: {
    color:      '#3A3A3A',
    fontSize:   11,
    fontWeight: '600',
  },
  inputs: {
    flex:          1,
    flexDirection: 'row',
    gap:           8,
  },
  inputWrap: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#111111',
    borderRadius:    8,
    borderWidth:     1,
    borderColor:     '#1E1E1E',
    paddingHorizontal: 10,
    paddingVertical:   8,
    gap:               4,
  },
  input: {
    flex:       1,
    color:      '#FFFFFF',
    fontSize:   15,
    fontWeight: '600',
    padding:    0,
    minWidth:   28,
    textAlign:  'center',
  },
  unit: {
    color:      '#2E2E2E',
    fontSize:   11,
    fontWeight: '500',
  },
  doneBtn: { padding: 2 },

  // Completed row
  completedNum: {
    width:      24,
    color:      '#2E2E2E',
    fontSize:   11,
    fontWeight: '600',
    textAlign:  'center',
  },
  completedValues: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  completedReps: {
    color:      '#FFFFFF',
    fontSize:   15,
    fontWeight: '600',
  },
  completedWeight: {
    color:      '#888',
    fontSize:   14,
    fontWeight: '500',
  },
  dot: {
    width:           3,
    height:          3,
    borderRadius:    1.5,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 2,
  },
});

const rt = StyleSheet.create({
  panel: {
    backgroundColor: '#0D0D0D',
    borderTopWidth:  1,
    borderTopColor:  '#1A1A1A',
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
    color:         '#2A2A2A',
    fontSize:      10,
    fontWeight:    '700',
    letterSpacing: 2,
    width:         38,
  },
  time: {
    flex:          1,
    color:         '#CCCCCC',
    fontSize:      28,
    fontWeight:    '600',
    letterSpacing: -1,
  },
  btns: {
    flexDirection: 'row',
    gap:           8,
  },
  addBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius:    8,
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderWidth:       1,
    borderColor:       '#272727',
  },
  addBtnText: {
    color:      '#555',
    fontSize:   12,
    fontWeight: '500',
  },
  skipBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius:    8,
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderWidth:       1,
    borderColor:       '#2E2E2E',
  },
  skipBtnText: {
    color:      '#888',
    fontSize:   12,
    fontWeight: '500',
  },
  track: {
    height:          2,
    backgroundColor: '#1A1A1A',
    borderRadius:    1,
    overflow:        'hidden',
    marginBottom:    4,
  },
  fill: {
    height:          2,
    backgroundColor: GREEN,
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
    alignItems: 'center',
    gap:        10,
    paddingBottom: 6,
  },
  title: {
    color:         '#FFFFFF',
    fontSize:      26,
    fontWeight:    '700',
    letterSpacing: -0.5,
  },
  titleSub: {
    color:      '#444',
    fontSize:   13,
    fontWeight: '400',
  },
  statsRow: {
    flexDirection: 'row',
    gap:           10,
  },
  chip: {
    flex:            1,
    backgroundColor: CARD,
    borderRadius:    12,
    borderWidth:     1,
    borderColor:     BORDER,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems:      'center',
    gap:             6,
  },
  chipValue: {
    color:         '#FFFFFF',
    fontSize:      18,
    fontWeight:    '700',
    letterSpacing: -0.3,
  },
  chipLabel: {
    color:         '#2E2E2E',
    fontSize:      8,
    fontWeight:    '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  section: { gap: 10 },
  label: {
    color:         '#2E2E2E',
    fontSize:      9,
    fontWeight:    '600',
    letterSpacing: 2,
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
    backgroundColor: '#111',
    borderWidth:     1,
    borderColor:     '#1E1E1E',
    alignItems:      'center',
    justifyContent:  'center',
  },
  ratingActive: {
    backgroundColor: GREEN,
    borderColor:     GREEN,
  },
  ratingNum: {
    color:      '#3A3A3A',
    fontSize:   12,
    fontWeight: '600',
  },
  ratingNumActive: {
    color:      BG,
    fontWeight: '700',
  },
  prompt: {
    color:      '#555',
    fontSize:   13,
    lineHeight: 20,
    fontWeight: '400',
    marginTop:  -2,
  },
  textArea: {
    backgroundColor: CARD,
    borderRadius:    12,
    borderWidth:     1,
    borderColor:     BORDER,
    padding:         14,
    color:           '#CCCCCC',
    fontSize:        14,
    minHeight:       80,
    fontWeight:      '400',
  },
  saveBtn: {
    backgroundColor: GREEN,
    borderRadius:    14,
    paddingVertical: 17,
    alignItems:      'center',
    marginTop:       4,
  },
  saveBtnPressed: { opacity: 0.8 },
  saveBtnText: {
    color:         BG,
    fontSize:      15,
    fontWeight:    '600',
    letterSpacing: 0.2,
  },
});
