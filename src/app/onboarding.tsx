import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, MeridianColors } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type UserProfile = {
  name: string;
  age: number;
  sex: 'Male' | 'Female';
  height_cm: number;
  weight_kg: number;
  goal: 'Build muscle' | 'Lose fat' | 'General fitness';
  experience: 'Complete beginner' | 'Some experience' | 'Intermediate' | 'Advanced';
  equipment: 'Full gym' | 'Home gym' | 'Bodyweight only' | 'Outdoor only';
  training_days: string[];
  health_notes: string;
  wearable: 'Apple Watch' | 'Another tracker' | 'None — manual check-ins';
  onboarded_at: string;
};

const TOTAL_STEPS = 11;
const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── CoachQuestion ────────────────────────────────────────────────────────────

function CoachQuestion({
  primary,
  secondary,
}: {
  primary: string;
  secondary?: string;
}) {
  return (
    <View style={cq.wrap}>
      <Text style={cq.primary}>{primary}</Text>
      {secondary ? <Text style={cq.secondary}>{secondary}</Text> : null}
    </View>
  );
}

const cq = StyleSheet.create({
  wrap: { paddingHorizontal: 24, gap: 16 },
  primary: {
    fontFamily: fonts.serif,
    fontSize: 28,
    color: MeridianColors.text,
    lineHeight: 38,
  },
  secondary: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: MeridianColors.textMuted,
    lineHeight: 31,
  },
});

// ─── TextInputLine ────────────────────────────────────────────────────────────

function TextInputLine({
  value,
  onChangeText,
  multiline,
  autoFocus,
}: {
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={tl.wrap}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={tl.input}
        multiline={multiline}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        cursorColor={MeridianColors.accent}
        selectionColor={MeridianColors.accent}
        autoCorrect={false}
        autoCapitalize={multiline ? 'sentences' : 'words'}
        placeholderTextColor={MeridianColors.textFaint}
      />
      <View style={[tl.line, focused && tl.lineFocused]} />
    </View>
  );
}

const tl = StyleSheet.create({
  wrap: { paddingHorizontal: 24 },
  input: {
    fontFamily: fonts.sans,
    fontSize: 22,
    color: MeridianColors.text,
    paddingTop: 8,
    paddingBottom: 12,
    minHeight: 48,
  },
  line: { height: 1, backgroundColor: '#2A2A2A' },
  lineFocused: { backgroundColor: MeridianColors.accent },
});

// ─── NumberInputLine ──────────────────────────────────────────────────────────

function NumberInputLine({
  value,
  onChangeText,
  unit,
  autoFocus,
}: {
  value: string;
  onChangeText: (v: string) => void;
  unit?: string;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={nl.wrap}>
      <View style={nl.row}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          style={nl.input}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          cursorColor={MeridianColors.accent}
          selectionColor={MeridianColors.accent}
          placeholder="—"
          placeholderTextColor={MeridianColors.textFaint}
        />
        {unit ? <Text style={nl.unit}>{unit}</Text> : null}
      </View>
      <View style={[nl.line, focused && nl.lineFocused]} />
    </View>
  );
}

const nl = StyleSheet.create({
  wrap: { paddingHorizontal: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 8,
    paddingBottom: 12,
  },
  input: {
    fontFamily: fonts.sans,
    fontSize: 22,
    color: MeridianColors.text,
    flex: 1,
  },
  unit: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: MeridianColors.textMuted,
    marginLeft: 8,
    marginBottom: 2,
  },
  line: { height: 1, backgroundColor: '#2A2A2A' },
  lineFocused: { backgroundColor: MeridianColors.accent },
});

// ─── SingleSelectChip ─────────────────────────────────────────────────────────

function SingleSelectChip({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string | null;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={sc.wrap}>
      {options.map((opt) => {
        const on = opt === selected;
        return (
          <TouchableOpacity
            key={opt}
            activeOpacity={0.6}
            style={[sc.chip, on && sc.chipOn]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[sc.label, on && sc.labelOn]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const sc = StyleSheet.create({
  wrap: { paddingHorizontal: 24, gap: 12 },
  chip: {
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  chipOn: {
    borderColor: MeridianColors.accent,
    backgroundColor: 'rgba(159,184,154,0.08)',
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: MeridianColors.text,
  },
  labelOn: { color: MeridianColors.accent },
});

// ─── MultiSelectPill ──────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function MultiSelectPill({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (day: string) => void;
}) {
  return (
    <View style={mp.wrap}>
      {DAYS.map((day) => {
        const on = selected.includes(day);
        return (
          <TouchableOpacity
            key={day}
            activeOpacity={0.6}
            style={[mp.pill, on && mp.pillOn]}
            onPress={() => onToggle(day)}
          >
            <Text style={[mp.label, on && mp.labelOn]}>{day}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const mp = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24, gap: 10 },
  pill: {
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  pillOn: {
    borderColor: MeridianColors.accent,
    backgroundColor: 'rgba(159,184,154,0.08)',
  },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: MeridianColors.text },
  labelOn: { color: MeridianColors.accent },
});

// ─── BottomActions ────────────────────────────────────────────────────────────

function BottomActions({
  skipVisible,
  onSkip,
  continueVisible,
  continueLabel = 'Continue →',
  onContinue,
}: {
  skipVisible?: boolean;
  onSkip?: () => void;
  continueVisible: boolean;
  continueLabel?: string;
  onContinue: () => void;
}) {
  const { bottom } = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(continueVisible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: continueVisible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [continueVisible, opacity]);

  return (
    <View style={[ba.row, { paddingBottom: bottom + 32 }]}>
      {skipVisible ? (
        <TouchableOpacity activeOpacity={0.6} onPress={onSkip}>
          <Text style={ba.skip}>Skip</Text>
        </TouchableOpacity>
      ) : (
        <View />
      )}
      <Animated.View style={{ opacity }} pointerEvents={continueVisible ? 'auto' : 'none'}>
        <TouchableOpacity activeOpacity={0.6} onPress={onContinue}>
          <Text style={ba.cont}>{continueLabel}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const ba = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 32,
  },
  skip: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: MeridianColors.textMuted,
  },
  cont: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    letterSpacing: 1.5,
    color: MeridianColors.accent,
  },
});

// ─── OnboardingScreen ─────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Per-step input state
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [goal, setGoal] = useState<string | null>(null);
  const [experience, setExperience] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [trainingDays, setTrainingDays] = useState<string[]>([]);
  const [healthNotes, setHealthNotes] = useState('');
  const [wearable, setWearable] = useState<string | null>(null);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_WIDTH],
  });

  const advance = useCallback(
    (updates: Partial<UserProfile>) => {
      const next = step + 1;
      setProfile((prev) => ({ ...prev, ...updates }));

      Animated.timing(progressAnim, {
        toValue: next / TOTAL_STEPS,
        duration: 400,
        useNativeDriver: false,
      }).start();

      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setStep(next);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    },
    [step, fadeAnim, progressAnim],
  );

  const complete = useCallback(() => {
    router.replace('/');
  }, []);

  const autoAdvance = useCallback(
    (setter: (v: string) => void, value: string, updates: Partial<UserProfile>) => {
      setter(value);
      setTimeout(() => advance(updates), 250);
    },
    [advance],
  );

  const toggleDay = useCallback((day: string) => {
    setTrainingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }, []);

  const renderStep = () => {
    switch (step) {
      // 0 — Name
      case 0:
        return (
          <>
            <CoachQuestion
              primary="I'm Meridian. I'll be your coach."
              secondary="First — what should I call you?"
            />
            <View style={s.gap40} />
            <TextInputLine value={name} onChangeText={setName} autoFocus />
            <View style={s.spacer} />
            <BottomActions
              continueVisible={name.trim().length > 0}
              onContinue={() => advance({ name: name.trim() })}
            />
          </>
        );

      // 1 — Age
      case 1:
        return (
          <>
            <CoachQuestion
              primary={`Nice to meet you, ${profile.name}. How old are you?`}
            />
            <View style={s.gap40} />
            <NumberInputLine value={age} onChangeText={setAge} autoFocus />
            <View style={s.spacer} />
            <BottomActions
              continueVisible={age.length > 0 && Number(age) > 0}
              onContinue={() => advance({ age: Number(age) })}
            />
          </>
        );

      // 2 — Sex
      case 2:
        return (
          <>
            <CoachQuestion primary="Biological sex? (this is for the calorie and macro maths.)" />
            <View style={s.gap40} />
            <SingleSelectChip
              options={['Male', 'Female']}
              selected={sex}
              onSelect={(v) => autoAdvance(setSex, v, { sex: v as UserProfile['sex'] })}
            />
            <View style={s.spacer} />
            <BottomActions continueVisible={false} onContinue={() => {}} />
          </>
        );

      // 3 — Height + Weight
      case 3:
        return (
          <>
            <CoachQuestion primary="Height and weight — to set your baselines." />
            <View style={s.gap40} />
            <NumberInputLine value={heightCm} onChangeText={setHeightCm} unit="cm" autoFocus />
            <View style={s.gap16} />
            <NumberInputLine value={weightKg} onChangeText={setWeightKg} unit="kg" />
            <View style={s.spacer} />
            <BottomActions
              continueVisible={
                heightCm.length > 0 && Number(heightCm) > 0 &&
                weightKg.length > 0 && Number(weightKg) > 0
              }
              onContinue={() =>
                advance({ height_cm: Number(heightCm), weight_kg: Number(weightKg) })
              }
            />
          </>
        );

      // 4 — Goal
      case 4:
        return (
          <>
            <CoachQuestion primary="What are we working towards?" />
            <View style={s.gap40} />
            <SingleSelectChip
              options={['Build muscle', 'Lose fat', 'General fitness']}
              selected={goal}
              onSelect={(v) => autoAdvance(setGoal, v, { goal: v as UserProfile['goal'] })}
            />
            <View style={s.spacer} />
            <BottomActions continueVisible={false} onContinue={() => {}} />
          </>
        );

      // 5 — Experience
      case 5:
        return (
          <>
            <CoachQuestion primary="How much training have you done?" />
            <View style={s.gap40} />
            <SingleSelectChip
              options={['Complete beginner', 'Some experience', 'Intermediate', 'Advanced']}
              selected={experience}
              onSelect={(v) =>
                autoAdvance(setExperience, v, { experience: v as UserProfile['experience'] })
              }
            />
            <View style={s.spacer} />
            <BottomActions continueVisible={false} onContinue={() => {}} />
          </>
        );

      // 6 — Equipment
      case 6:
        return (
          <>
            <CoachQuestion primary="What's your setup?" />
            <View style={s.gap40} />
            <SingleSelectChip
              options={['Full gym', 'Home gym', 'Bodyweight only', 'Outdoor only']}
              selected={equipment}
              onSelect={(v) =>
                autoAdvance(setEquipment, v, { equipment: v as UserProfile['equipment'] })
              }
            />
            <View style={s.spacer} />
            <BottomActions continueVisible={false} onContinue={() => {}} />
          </>
        );

      // 7 — Training days
      case 7:
        return (
          <>
            <CoachQuestion primary="Which days can you train?" />
            <View style={s.gap40} />
            <MultiSelectPill selected={trainingDays} onToggle={toggleDay} />
            <View style={s.spacer} />
            <BottomActions
              continueVisible={trainingDays.length > 0}
              onContinue={() => advance({ training_days: trainingDays })}
            />
          </>
        );

      // 8 — Health notes
      case 8:
        return (
          <>
            <CoachQuestion primary="Anything I should know? Injuries, conditions — anything that might affect training." />
            <View style={s.gap40} />
            <TextInputLine
              value={healthNotes}
              onChangeText={setHealthNotes}
              multiline
              autoFocus
            />
            <View style={s.spacer} />
            <BottomActions
              skipVisible
              onSkip={() => advance({ health_notes: '' })}
              continueVisible={healthNotes.trim().length > 0}
              onContinue={() => advance({ health_notes: healthNotes.trim() })}
            />
          </>
        );

      // 9 — Wearable
      case 9:
        return (
          <>
            <CoachQuestion primary="Do you wear a fitness tracker?" />
            <View style={s.gap40} />
            <SingleSelectChip
              options={['Apple Watch', 'Another tracker', 'None — manual check-ins']}
              selected={wearable}
              onSelect={(v) =>
                autoAdvance(setWearable, v, { wearable: v as UserProfile['wearable'] })
              }
            />
            <View style={s.spacer} />
            <BottomActions continueVisible={false} onContinue={() => {}} />
          </>
        );

      // 10 — Test week intro
      case 10:
        return (
          <>
            <View style={s.finalPad}>
              <Text style={s.finalText}>
                Right — I've got what I need. Before any real training begins, we run a Test
                Week. It tells me where you actually are right now — strength, fitness,
                recovery — so everything I build for you is based on you, not a template.
              </Text>
            </View>
            <View style={s.spacer} />
            <BottomActions
              continueVisible
              continueLabel="Begin Test Week →"
              onContinue={complete}
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <View style={s.screen}>
      <SafeAreaView style={s.safe} edges={['top']}>
        {/* Progress line — top of safe area */}
        <View style={s.progressTrack}>
          <Animated.View style={[s.progressFill, { width: progressWidth }]} />
        </View>

        <KeyboardAvoidingView
          style={s.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Animated.View style={[s.content, { opacity: fadeAnim }]}>
            <View style={s.topGap} />
            {renderStep()}
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: MeridianColors.bg },
  safe: { flex: 1 },
  progressTrack: { height: 1, backgroundColor: '#2A2A2A' },
  progressFill: { height: 1, backgroundColor: MeridianColors.accent },
  kav: { flex: 1 },
  content: { flex: 1 },
  topGap: { height: 80 },
  gap40: { height: 40 },
  gap16: { height: 16 },
  spacer: { flex: 1 },
  finalPad: { paddingHorizontal: 24 },
  finalText: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: MeridianColors.text,
    lineHeight: 31,
  },
});
