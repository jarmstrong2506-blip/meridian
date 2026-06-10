import { useState } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, MeridianColors as C } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { BackgroundWash } from '@/components/background-wash';
import {
  GoalKey,
  NoGoMovement,
  Substitution,
  TestDefinition,
  TestType,
  TestWeekPlan,
  TEST_WEEK_PLANS,
} from '@/data/testWeek';
import {
  buildTestWeekId,
  calculateEpley1RM,
  getCurrentTestDay,
  resolveTestWeekPlan,
} from '@/lib/testWeek';
import {
  formatDistance,
  formatPace,
  formatWeight,
  lbToKg,
} from '@/lib/units';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TestWeekProfile = {
  goal: string;
  test_week_status: string;
  test_week_started_at: string;
  test_week_no_gos: string[] | null;
  units: {
    height: 'cm' | 'ft';
    weight: 'kg' | 'lb';
    distance: 'km' | 'miles';
  } | null;
};

type AmrapInput     = { kind: 'amrap';        weight: string; reps: string };
type CardioInput    = { kind: 'cardio';       durationStr: string };
type RepsInput      = { kind: 'reps';         reps: string };
type DurationInput  = { kind: 'duration';     durationStr: string };
type MovementInput  = { kind: 'movement';     sitToStand: 'pass' | 'fail' | null; singleLegBalance: 'pass' | 'fail' | null; overheadReach: 'pass' | 'fail' | null };
type MeasureInput   = { kind: 'measurements'; weight: string; chest: string; waist: string; hips: string; armL: string; armR: string; thighL: string; thighR: string; calfL: string; calfR: string };
type RecoveryInput  = { kind: 'recovery';     done: boolean };

type TestInput = AmrapInput | CardioInput | RepsInput | DurationInput | MovementInput | MeasureInput | RecoveryInput;

type TestSlot = {
  baseType: TestType;
  defaultExercise: string;  // exercise name from unresolved plan (for substitution_used detection)
  baseDef: TestDefinition;  // from resolved plan, used as base for manual switches
  def: TestDefinition;      // currently active definition
  input: TestInput;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0'); }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toGoalKey(goal: string): GoalKey {
  const map: Record<string, GoalKey> = {
    'Build muscle':     'build_muscle',
    'Lose fat':         'lose_fat',
    'General fitness':  'general_fitness',
  };
  return (map[goal] ?? 'general_fitness') as GoalKey;
}

function inputForType(type: TestType): TestInput {
  switch (type) {
    case 'amrap_squat':
    case 'amrap_bench':
    case 'amrap_deadlift':
    case 'amrap_ohp':
    case 'amrap_row':
      return { kind: 'amrap', weight: '', reps: '' };
    case 'cardio_baseline':
      return { kind: 'cardio', durationStr: '' };
    case 'max_pushups':
    case 'max_squats_60s':
      return { kind: 'reps', reps: '' };
    case 'plank_hold':
    case 'loaded_carry':
      return { kind: 'duration', durationStr: '' };
    case 'movement_screen':
      return { kind: 'movement', sitToStand: null, singleLegBalance: null, overheadReach: null };
    case 'body_measurements':
      return { kind: 'measurements', weight: '', chest: '', waist: '', hips: '', armL: '', armR: '', thighL: '', thighR: '', calfL: '', calfR: '' };
    case 'recovery_walk':
      return { kind: 'recovery', done: false };
  }
}

function parseMmSs(s: string): number | null {
  const m = s.match(/^(\d{1,2}):([0-5]\d)$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function isSlotComplete(slot: TestSlot): boolean {
  const { input } = slot;
  switch (input.kind) {
    case 'amrap':
      return parseFloat(input.weight) > 0 && parseInt(input.reps) > 0;
    case 'cardio':
      return parseMmSs(input.durationStr) !== null;
    case 'reps':
      return parseInt(input.reps) > 0;
    case 'duration':
      return parseMmSs(input.durationStr) !== null;
    case 'movement':
      return input.sitToStand !== null && input.singleLegBalance !== null && input.overheadReach !== null;
    case 'measurements':
      return true; // all fields optional
    case 'recovery':
      return input.done;
  }
}

function initSlots(tests: TestDefinition[], goalKey: GoalKey): TestSlot[] {
  const originalPlan = TEST_WEEK_PLANS[goalKey];
  const allOriginal = originalPlan.days.flatMap((d) => d.tests);

  return tests.map((def) => {
    const baseType = def.originalType ?? def.type;
    const originalTest = allOriginal.find((t) => t.type === baseType);
    return {
      baseType,
      defaultExercise: originalTest?.primaryExercise ?? def.primaryExercise,
      baseDef: def,
      def,
      input: inputForType(def.type),
    };
  });
}

// ─── Test Week week strip ──────────────────────────────────────────────────────

function TestWeekStrip({ plan, currentDayIdx }: { plan: TestWeekPlan; currentDayIdx: number }) {
  return (
    <View style={ws.row}>
      {plan.days.map((day) => {
        const isToday = day.dayNumber === currentDayIdx;
        const isPast  = day.dayNumber < currentDayIdx;
        return (
          <View key={day.dayNumber} style={ws.cell}>
            <Text style={[ws.tag, isToday && ws.tagToday]}>D{day.dayNumber}</Text>
            <Text style={[ws.label, isToday && ws.labelToday]}>
              {day.rest ? 'Rest' : `Test ${day.dayNumber}`}
            </Text>
            {isToday && <View style={ws.underline} />}
            {isPast   && <View style={ws.tick} />}
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
  cell:       { flex: 1, alignItems: 'center', gap: 3, paddingBottom: 4 },
  tag:        { fontFamily: fonts.sansSemiBold, fontSize: 10, color: C.textMuted },
  tagToday:   { color: C.text },
  label:      { fontFamily: fonts.sans, fontSize: 9, color: C.textFaint },
  labelToday: { color: C.text },
  underline: {
    position: 'absolute', bottom: 0,
    width: '60%', height: 1.5, borderRadius: 1,
    backgroundColor: C.text,
  },
  tick: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: C.green, marginTop: 1,
  },
});

// ─── Input sub-components ─────────────────────────────────────────────────────

function AmrapInputs({
  input, weightUnit, def, onChange,
}: {
  input: AmrapInput;
  weightUnit: 'kg' | 'lb';
  def: TestDefinition;
  onChange: (i: AmrapInput) => void;
}) {
  const rawWeight = parseFloat(input.weight) || 0;
  const reps = parseInt(input.reps) || 0;
  const weightKg = weightUnit === 'lb' ? lbToKg(rawWeight) : rawWeight;
  const est1RM = weightKg > 0 && reps > 0 ? calculateEpley1RM(weightKg, reps) : null;
  const est1RMDisplay = est1RM
    ? `Est. 1RM: ${formatWeight(est1RM, weightUnit)}`
    : null;

  return (
    <View style={inp.section}>
      <View style={inp.row}>
        <View style={inp.field}>
          <TextInput
            style={inp.numInput}
            value={input.weight}
            onChangeText={(v) => onChange({ ...input, weight: v })}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={C.textFaint}
          />
          <Text style={inp.unit}>{weightUnit}</Text>
          <View style={inp.line} />
        </View>
        <View style={inp.field}>
          <TextInput
            style={inp.numInput}
            value={input.reps}
            onChangeText={(v) => onChange({ ...input, reps: v })}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={C.textFaint}
          />
          <Text style={inp.unit}>reps</Text>
          <View style={inp.line} />
        </View>
      </View>
      {est1RMDisplay && (
        <Text style={inp.derived}>{est1RMDisplay}</Text>
      )}
      {def.targetReps && (
        <Text style={inp.hint}>
          Target: {def.targetReps.min}–{def.targetReps.max} reps
        </Text>
      )}
    </View>
  );
}

function CardioInputs({
  input, def, distanceUnit, onChange,
}: {
  input: CardioInput;
  def: TestDefinition;
  distanceUnit: 'km' | 'miles';
  onChange: (i: CardioInput) => void;
}) {
  const distM = def.distanceMeters ?? 0;
  const durSec = parseMmSs(input.durationStr);
  const pace = distM > 0 && durSec ? formatPace(durSec, distM, distanceUnit) : null;

  return (
    <View style={inp.section}>
      {distM > 0 && (
        <Text style={inp.hint}>Distance: {formatDistance(distM, distanceUnit)}</Text>
      )}
      <View style={inp.fieldFull}>
        <TextInput
          style={inp.numInput}
          value={input.durationStr}
          onChangeText={(v) => onChange({ ...input, durationStr: v })}
          keyboardType="numbers-and-punctuation"
          placeholder="mm:ss"
          placeholderTextColor={C.textFaint}
          autoCorrect={false}
        />
        <Text style={inp.unit}>time</Text>
        <View style={inp.line} />
      </View>
      {pace && <Text style={inp.derived}>Pace: {pace}</Text>}
    </View>
  );
}

function RepsInputField({
  input, onChange,
}: {
  input: RepsInput;
  onChange: (i: RepsInput) => void;
}) {
  return (
    <View style={inp.section}>
      <View style={inp.fieldFull}>
        <TextInput
          style={inp.numInput}
          value={input.reps}
          onChangeText={(v) => onChange({ ...input, reps: v })}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={C.textFaint}
        />
        <Text style={inp.unit}>reps</Text>
        <View style={inp.line} />
      </View>
    </View>
  );
}

function DurationInputField({
  input, onChange,
}: {
  input: DurationInput;
  onChange: (i: DurationInput) => void;
}) {
  return (
    <View style={inp.section}>
      <View style={inp.fieldFull}>
        <TextInput
          style={inp.numInput}
          value={input.durationStr}
          onChangeText={(v) => onChange({ ...input, durationStr: v })}
          keyboardType="numbers-and-punctuation"
          placeholder="mm:ss"
          placeholderTextColor={C.textFaint}
          autoCorrect={false}
        />
        <Text style={inp.unit}>time</Text>
        <View style={inp.line} />
      </View>
    </View>
  );
}

function MovementInputs({
  input, onChange,
}: {
  input: MovementInput;
  onChange: (i: MovementInput) => void;
}) {
  type CheckKey = 'sitToStand' | 'singleLegBalance' | 'overheadReach';
  const checks: { key: CheckKey; label: string }[] = [
    { key: 'sitToStand',        label: 'Sit-to-Stand (60 s)' },
    { key: 'singleLegBalance',  label: 'Single-Leg Balance' },
    { key: 'overheadReach',     label: 'Overhead Reach' },
  ];

  return (
    <View style={inp.section}>
      {checks.map((c) => (
        <View key={c.key} style={mov.row}>
          <Text style={mov.label}>{c.label}</Text>
          <View style={mov.btnRow}>
            {(['pass', 'fail'] as const).map((v) => {
              const on = input[c.key] === v;
              return (
                <TouchableOpacity
                  key={v}
                  activeOpacity={0.7}
                  style={[mov.btn, on && (v === 'pass' ? mov.btnPass : mov.btnFail)]}
                  onPress={() => onChange({ ...input, [c.key]: v })}
                >
                  <Text style={[mov.btnText, on && mov.btnTextOn]}>
                    {v === 'pass' ? 'Pass' : 'Needs work'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const mov = StyleSheet.create({
  row:       { gap: 6, marginBottom: 12 },
  label:     { fontFamily: fonts.sansSemiBold, fontSize: 12, color: C.textMuted },
  btnRow:    { flexDirection: 'row', gap: 8 },
  btn: {
    borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14,
  },
  btnPass:   { borderColor: C.green,  backgroundColor: 'rgba(77,154,120,0.1)' },
  btnFail:   { borderColor: C.textMuted, backgroundColor: 'transparent' },
  btnText:   { fontFamily: fonts.sans, fontSize: 12, color: C.textMuted },
  btnTextOn: { color: C.text },
});

function MeasurementInputs({
  input, weightUnit, onChange,
}: {
  input: MeasureInput;
  weightUnit: 'kg' | 'lb';
  onChange: (i: MeasureInput) => void;
}) {
  const fields: { key: keyof Omit<MeasureInput, 'kind'>; label: string; unit: string }[] = [
    { key: 'weight', label: 'Bodyweight',  unit: weightUnit },
    { key: 'chest',  label: 'Chest',       unit: 'cm' },
    { key: 'waist',  label: 'Waist',       unit: 'cm' },
    { key: 'hips',   label: 'Hips',        unit: 'cm' },
    { key: 'armL',   label: 'Left Arm',    unit: 'cm' },
    { key: 'armR',   label: 'Right Arm',   unit: 'cm' },
    { key: 'thighL', label: 'Left Thigh',  unit: 'cm' },
    { key: 'thighR', label: 'Right Thigh', unit: 'cm' },
    { key: 'calfL',  label: 'Left Calf',   unit: 'cm' },
    { key: 'calfR',  label: 'Right Calf',  unit: 'cm' },
  ];

  return (
    <View style={meas.grid}>
      {fields.map((f) => (
        <View key={f.key} style={meas.cell}>
          <Text style={meas.label}>{f.label}</Text>
          <View style={meas.inputRow}>
            <TextInput
              style={meas.input}
              value={input[f.key] as string}
              onChangeText={(v) => onChange({ ...input, [f.key]: v })}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor={C.textFaint}
            />
            <Text style={meas.unit}>{f.unit}</Text>
          </View>
          <View style={meas.line} />
        </View>
      ))}
    </View>
  );
}

const meas = StyleSheet.create({
  grid:     { gap: 12 },
  cell:     {},
  label:    { fontFamily: fonts.sans, fontSize: 12, color: C.textMuted, marginBottom: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  input:    { fontFamily: fonts.sans, fontSize: 18, color: C.text, flex: 1 },
  unit:     { fontFamily: fonts.sans, fontSize: 12, color: C.textMuted, marginBottom: 2 },
  line:     { height: 1, backgroundColor: C.cardBorder, marginTop: 4 },
});

function RecoveryInputField({
  input, onChange,
}: {
  input: RecoveryInput;
  onChange: (i: RecoveryInput) => void;
}) {
  return (
    <View style={inp.section}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={[rec.btn, input.done && rec.btnOn]}
        onPress={() => onChange({ ...input, done: !input.done })}
      >
        <Text style={[rec.label, input.done && rec.labelOn]}>
          {input.done ? '✓  Done' : 'Mark Done'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const rec = StyleSheet.create({
  btn: {
    borderWidth: 1, borderColor: C.cardBorder, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
  },
  btnOn:   { borderColor: C.green, backgroundColor: 'rgba(77,154,120,0.1)' },
  label:   { fontFamily: fonts.sansSemiBold, fontSize: 14, color: C.textMuted },
  labelOn: { color: C.green },
});

// Shared input styles
const inp = StyleSheet.create({
  section:   { gap: 8 },
  row:       { flexDirection: 'row', gap: 20 },
  field:     { flex: 1, gap: 2 },
  fieldFull: { gap: 2 },
  numInput: {
    fontFamily: fonts.sans,
    fontSize:   22,
    color:      C.text,
    paddingTop: 4,
    paddingBottom: 8,
    fontVariant: ['tabular-nums'],
  },
  unit: { fontFamily: fonts.sans, fontSize: 12, color: C.textMuted },
  line: { height: 1, backgroundColor: C.cardBorder },
  derived: {
    fontFamily: fonts.sansSemiBold,
    fontSize:   13,
    color:      C.gold,
    marginTop:  4,
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize:   12,
    color:      C.textMuted,
  },
});

// ─── Test card ─────────────────────────────────────────────────────────────────

function TestCard({
  slot, weightUnit, distanceUnit, onUpdate, onSwitch,
}: {
  slot: TestSlot;
  weightUnit: 'kg' | 'lb';
  distanceUnit: 'km' | 'miles';
  onUpdate: (input: TestInput) => void;
  onSwitch: () => void;
}) {
  const { def, input } = slot;
  const isSubbed = def.primaryExercise !== slot.defaultExercise;
  const hasSubstitutions = (slot.baseDef.substitutions?.length ?? 0) > 0;

  return (
    <View style={tc.card}>
      <View style={tc.header}>
        <Text style={tc.exercise}>{def.primaryExercise}</Text>
        {hasSubstitutions && (
          <TouchableOpacity activeOpacity={0.7} onPress={onSwitch} style={tc.switchBtn}>
            <Text style={tc.switchLabel}>Switch ↕</Text>
          </TouchableOpacity>
        )}
      </View>

      {isSubbed && (
        <Text style={tc.subBadge}>Substituted from {slot.defaultExercise}</Text>
      )}

      <Text style={tc.instruction}>{def.instructionFull}</Text>

      <View style={tc.divider} />

      {input.kind === 'amrap' && (
        <AmrapInputs
          input={input}
          weightUnit={weightUnit}
          def={def}
          onChange={onUpdate as (i: AmrapInput) => void}
        />
      )}
      {input.kind === 'cardio' && (
        <CardioInputs
          input={input}
          def={def}
          distanceUnit={distanceUnit}
          onChange={onUpdate as (i: CardioInput) => void}
        />
      )}
      {input.kind === 'reps' && (
        <RepsInputField
          input={input}
          onChange={onUpdate as (i: RepsInput) => void}
        />
      )}
      {input.kind === 'duration' && (
        <DurationInputField
          input={input}
          onChange={onUpdate as (i: DurationInput) => void}
        />
      )}
      {input.kind === 'movement' && (
        <MovementInputs
          input={input}
          onChange={onUpdate as (i: MovementInput) => void}
        />
      )}
      {input.kind === 'measurements' && (
        <MeasurementInputs
          input={input}
          weightUnit={weightUnit}
          onChange={onUpdate as (i: MeasureInput) => void}
        />
      )}
      {input.kind === 'recovery' && (
        <RecoveryInputField
          input={input}
          onChange={onUpdate as (i: RecoveryInput) => void}
        />
      )}
    </View>
  );
}

const tc = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom:     14,
    backgroundColor:  C.card,
    borderWidth:      1,
    borderColor:      C.cardBorder,
    borderRadius:     14,
    padding:          18,
    gap:              12,
  },
  header:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  exercise:    { fontFamily: fonts.sansBold, fontSize: 17, color: C.text, flex: 1 },
  switchBtn:   { paddingLeft: 12 },
  switchLabel: { fontFamily: fonts.sansMedium, fontSize: 12, color: C.textMuted },
  subBadge:    { fontFamily: fonts.sans, fontSize: 12, color: C.textMuted, fontStyle: 'italic' },
  instruction: { fontFamily: fonts.serif, fontSize: 15, color: C.text, lineHeight: 22 },
  divider:     { height: 1, backgroundColor: C.divider },
});

// ─── Switch exercise sheet ────────────────────────────────────────────────────

function SwitchSheet({
  slot, onSelect, onClose,
}: {
  slot: TestSlot;
  onSelect: (sub: Substitution) => void;
  onClose: () => void;
}) {
  const { bottom } = useSafeAreaInsets();
  const subs = slot.baseDef.substitutions ?? [];

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={sh.overlay} onPress={onClose}>
        <Pressable style={[sh.sheet, { paddingBottom: bottom + 20 }]} onPress={() => {}}>
          <Text style={sh.title}>Switch Exercise</Text>

          {/* Current (default) option */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[sh.option, slot.def.primaryExercise === slot.defaultExercise && sh.optionOn]}
            onPress={() => {
              onSelect({ type: slot.baseType, primaryExercise: slot.defaultExercise, instructionShort: '', instructionFull: '' });
              onClose();
            }}
          >
            <Text style={sh.optLabel}>{slot.defaultExercise}</Text>
            <Text style={sh.optSub}>Default</Text>
          </TouchableOpacity>

          {subs.map((sub, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.7}
              style={[sh.option, slot.def.primaryExercise === sub.primaryExercise && sh.optionOn]}
              onPress={() => { onSelect(sub); onClose(); }}
            >
              <Text style={sh.optLabel}>{sub.primaryExercise}</Text>
              {sub.triggers && sub.triggers.length > 0 && (
                <Text style={sh.optSub}>Alt for {sub.triggers.join(', ')}</Text>
              )}
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const sh = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, paddingHorizontal: 20,
    gap: 2,
  },
  title: {
    fontFamily: fonts.sansSemiBold, fontSize: 14,
    color: C.textMuted, letterSpacing: 1,
    marginBottom: 12,
  },
  option: {
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  optionOn: { },
  optLabel: { fontFamily: fonts.sansMedium, fontSize: 15, color: C.text },
  optSub:   { fontFamily: fonts.sans, fontSize: 12, color: C.textMuted, marginTop: 2 },
});

// ─── Supabase save helpers ────────────────────────────────────────────────────

function buildTestResultRow(
  slot: TestSlot,
  userId: string,
  testWeekId: string,
  date: string,
  weightUnit: 'kg' | 'lb',
  noGos: string[],
): Record<string, unknown> {
  const subUsed = slot.def.primaryExercise !== slot.defaultExercise
    ? slot.def.primaryExercise
    : null;

  const base: Record<string, unknown> = {
    user_id:           userId,
    test_week_id:      testWeekId,
    test_type:         slot.baseType,
    substitution_used: subUsed,
    no_go_movements:   noGos,
    date,
  };

  const { input } = slot;

  switch (input.kind) {
    case 'amrap': {
      const rawW = parseFloat(input.weight) || 0;
      const reps = parseInt(input.reps) || 0;
      const wKg  = weightUnit === 'lb' ? lbToKg(rawW) : rawW;
      return {
        ...base,
        weight_kg:        wKg,
        reps,
        estimated_1rm_kg: reps > 0 && wKg > 0 ? calculateEpley1RM(wKg, reps) : null,
      };
    }
    case 'cardio':
      return {
        ...base,
        duration_seconds: parseMmSs(input.durationStr),
        distance_m:       slot.def.distanceMeters ?? null,
      };
    case 'reps':
      return { ...base, reps: parseInt(input.reps) || 0 };
    case 'duration':
      return { ...base, duration_seconds: parseMmSs(input.durationStr) };
    case 'movement':
      return {
        ...base,
        notes: JSON.stringify({
          sitToStand:       input.sitToStand,
          singleLegBalance: input.singleLegBalance,
          overheadReach:    input.overheadReach,
        }),
      };
    case 'measurements':
      return base; // body_measurements saved separately
    case 'recovery':
      return { ...base, notes: 'completed' };
  }
}

function buildMeasurementRow(
  input: MeasureInput,
  userId: string,
  testWeekId: string,
  date: string,
  weightUnit: 'kg' | 'lb',
): Record<string, unknown> {
  const rawW = parseFloat(input.weight) || 0;
  const weightKg = rawW > 0 ? (weightUnit === 'lb' ? lbToKg(rawW) : rawW) : null;
  const n = (v: string) => { const p = parseFloat(v); return p > 0 ? p : null; };

  return {
    user_id:      userId,
    test_week_id: testWeekId,
    date,
    weight_kg:    weightKg,
    chest_cm:     n(input.chest),
    waist_cm:     n(input.waist),
    hips_cm:      n(input.hips),
    arm_l_cm:     n(input.armL),
    arm_r_cm:     n(input.armR),
    thigh_l_cm:   n(input.thighL),
    thigh_r_cm:   n(input.thighR),
    calf_l_cm:    n(input.calfL),
    calf_r_cm:    n(input.calfR),
  };
}

// ─── Rest / between-days view ─────────────────────────────────────────────────

function RestDayView() {
  const { bottom } = useSafeAreaInsets();
  return (
    <View style={[rd.wrap, { paddingBottom: bottom + 32 }]}>
      <Text style={rd.title}>Rest Day</Text>
      <Text style={rd.sub}>Recover. Next test tomorrow.</Text>
    </View>
  );
}

const rd = StyleSheet.create({
  wrap:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  title: { fontFamily: fonts.sansBold, fontSize: 24, color: C.text },
  sub:   { fontFamily: fonts.sans, fontSize: 15, color: C.textMuted },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TestWeekDayScreen({ profile }: { profile: TestWeekProfile }) {
  const { bottom } = useSafeAreaInsets();

  const goalKey      = toGoalKey(profile.goal);
  const noGos        = (profile.test_week_no_gos ?? ['none']) as NoGoMovement[];
  const resolvedPlan = resolveTestWeekPlan(goalKey, noGos);
  const today        = todayStr();
  const currentDayIdx = getCurrentTestDay(resolvedPlan, profile.test_week_started_at, today);

  const testDay = currentDayIdx !== null
    ? resolvedPlan.days.find((d) => d.dayNumber === currentDayIdx) ?? null
    : null;

  const [slots, setSlots] = useState<TestSlot[]>(() =>
    testDay ? initSlots(testDay.tests, goalKey) : [],
  );
  const [switchSheetIdx, setSwitchSheetIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const weightUnit   = profile.units?.weight   ?? 'kg';
  const distanceUnit = profile.units?.distance ?? 'km';

  const updateSlot = (i: number, input: TestInput) => {
    setSlots((prev) => prev.map((s, idx) => idx === i ? { ...s, input } : s));
  };

  const applySwitch = (i: number, sub: Substitution) => {
    setSlots((prev) =>
      prev.map((s, idx) => {
        if (idx !== i) return s;
        // Rebuild def from baseDef + substitution fields
        const { triggers: _t, ...subFields } = sub;
        const newDef: TestDefinition = {
          ...s.baseDef,
          ...subFields,
          originalType: s.baseType,
        };
        return { ...s, def: newDef };
      }),
    );
  };

  const allComplete = slots.length > 0 && slots.every(isSlotComplete);

  const handleComplete = async () => {
    if (saving || !currentDayIdx) return;
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaving(false); return; }

      const testWeekId = buildTestWeekId(profile.test_week_started_at);

      for (const slot of slots) {
        const row = buildTestResultRow(slot, user.id, testWeekId, today, weightUnit, noGos);
        const { error } = await supabase.from('test_results').insert(row);
        if (error) console.log('[test_result] error:', slot.baseType, error);
        else       console.log('[test_result] saved:', slot.baseType);

        if (slot.input.kind === 'measurements') {
          const measRow = buildMeasurementRow(slot.input, user.id, testWeekId, today, weightUnit);
          const { error: me } = await supabase.from('body_measurements').insert(measRow);
          if (me) console.log('[body_measurements] error:', me);
          else    console.log('[body_measurements] saved');
        }
      }

      const isLastDay = currentDayIdx === resolvedPlan.durationDays;
      if (isLastDay) {
        await supabase.from('profiles').upsert({ id: user.id, test_week_status: 'complete' });
        setSaving(false);
        router.replace('/test-week-summary');
      } else {
        setSaving(false);
        router.replace('/');
      }
    } catch (e) {
      console.log('[test-week-day] error:', e);
      setSaving(false);
    }
  };

  return (
    <View style={s.screen}>
      <BackgroundWash />
      <SafeAreaView style={s.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={s.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Week strip */}
          {currentDayIdx !== null && (
            <TestWeekStrip plan={resolvedPlan} currentDayIdx={currentDayIdx} />
          )}

          {!testDay ? (
            <RestDayView />
          ) : (
            <ScrollView
              style={s.scroll}
              contentContainerStyle={[s.content, { paddingBottom: bottom + 100 }]}
              showsVerticalScrollIndicator={false}
            >
              {/* Day label */}
              <View style={s.dayHeader}>
                <Text style={s.dayLabel}>{testDay.label}</Text>
              </View>

              {/* Test cards */}
              {slots.map((slot, i) => (
                <TestCard
                  key={i}
                  slot={slot}
                  weightUnit={weightUnit}
                  distanceUnit={distanceUnit}
                  onUpdate={(inp) => updateSlot(i, inp)}
                  onSwitch={() => setSwitchSheetIdx(i)}
                />
              ))}

              {/* Complete Day button */}
              <View style={s.ctaWrap}>
                <Pressable
                  disabled={!allComplete || saving}
                  style={({ pressed }) => [
                    s.cta,
                    !allComplete && s.ctaDisabled,
                    pressed && allComplete && s.ctaPressed,
                  ]}
                  onPress={handleComplete}
                >
                  <Text style={[s.ctaText, !allComplete && s.ctaTextDisabled]}>
                    {saving ? 'Saving…' : 'Complete Day →'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Switch exercise sheet */}
      {switchSheetIdx !== null && slots[switchSheetIdx] && (
        <SwitchSheet
          slot={slots[switchSheetIdx]}
          onSelect={(sub) => applySwitch(switchSheetIdx, sub)}
          onClose={() => setSwitchSheetIdx(null)}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  safe:   { flex: 1 },
  kav:    { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingTop: 8 },

  dayHeader: { paddingHorizontal: 16, paddingVertical: 14 },
  dayLabel: {
    fontFamily: fonts.sansBold,
    fontSize:   20,
    color:      C.text,
  },

  ctaWrap: { paddingHorizontal: 16, paddingTop: 8 },
  cta: {
    backgroundColor: C.gold,
    borderRadius:    12,
    paddingVertical: 16,
    alignItems:      'center',
  },
  ctaDisabled: { backgroundColor: C.cardBorder },
  ctaPressed:  { opacity: 0.85 },
  ctaText: {
    fontFamily:    fonts.sansBold,
    fontSize:      15,
    color:         C.bg,
    letterSpacing: 0.5,
  },
  ctaTextDisabled: { color: C.textMuted },
});
