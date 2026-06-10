export type NoGoMovement = 'running' | 'jumping' | 'overhead' | 'deep_squat' | 'none';

export type TestType =
  | 'amrap_squat' | 'amrap_bench' | 'amrap_deadlift' | 'amrap_ohp' | 'amrap_row'
  | 'cardio_baseline' | 'max_pushups' | 'max_squats_60s'
  | 'movement_screen' | 'loaded_carry' | 'plank_hold'
  | 'body_measurements' | 'recovery_walk';

export type Substitution = {
  type: TestType;
  primaryExercise: string;
  instructionShort: string;
  instructionFull: string;
  triggers?: NoGoMovement[];
  distanceMeters?: number;
  timeLimitSeconds?: number;
};

export type TestDefinition = {
  type: TestType;
  primaryExercise: string;
  instructionShort: string;
  instructionFull: string;
  substitutions?: Substitution[];
  affectedNoGoMovements?: NoGoMovement[];
  targetReps?: { min: number; max: number };
  timeLimitSeconds?: number;
  distanceMeters?: number;
  /** Set by resolveTestWeekPlan when a substitution is applied. */
  originalType?: TestType;
};

export type TestDay = {
  dayNumber: number;
  label: string;
  tests: TestDefinition[];
  rest?: boolean;
};

export type GoalKey = 'build_muscle' | 'lose_fat' | 'general_fitness';

export type TestWeekPlan = {
  goal: GoalKey;
  durationDays: number;
  description: string;
  days: TestDay[];
};

// ─── Shared test definitions ──────────────────────────────────────────────────

const BODY_MEASUREMENTS: TestDefinition = {
  type: 'body_measurements',
  primaryExercise: 'Body Measurements',
  instructionShort: 'Record bodyweight, waist, and hips first thing in the morning.',
  instructionFull:
    'Before eating, after using the bathroom.\n\n' +
    'Record:\n' +
    '  • Bodyweight — step on scale, breathe out\n' +
    '  • Waist — tape at navel level, breathe normally\n' +
    '  • Hips — tape at widest point\n\n' +
    'These are your baselines for tracking change.',
};

const AMRAP_WARMUP_NOTE =
  'Warm-up protocol:\n' +
  '  Set 1 — 40% of working weight × 5 reps\n' +
  '  Set 2 — 60% × 3 reps\n' +
  '  Set 3 — 80% × 2 reps\n\n' +
  'Rest 3 minutes before your all-out set.';

// ─── build_muscle ─────────────────────────────────────────────────────────────

const BUILD_MUSCLE_PLAN: TestWeekPlan = {
  goal: 'build_muscle',
  durationDays: 5,
  description:
    'Five days of baseline strength tests to establish 1RM estimates across the major lifts.',
  days: [
    {
      dayNumber: 1,
      label: 'Test Day 1 — Squat',
      tests: [
        {
          type: 'amrap_squat',
          primaryExercise: 'Back Squat',
          instructionShort: '3 warm-up sets, then 1 all-out set. Target 5–10 reps.',
          instructionFull:
            'Choose a weight you estimate you can lift 5–10 times.\n\n' +
            AMRAP_WARMUP_NOTE +
            '\n\nDescend to depth — hip crease below parallel. Drive through your heels, ' +
            'chest up. Stop 1 rep before failure or when form breaks.\n\n' +
            'Log the weight and reps.',
          targetReps: { min: 5, max: 10 },
          affectedNoGoMovements: ['deep_squat'],
          substitutions: [
            {
              type: 'amrap_squat',
              primaryExercise: 'Leg Press',
              instructionShort: '3 warm-up sets, then 1 all-out leg press set. Target 5–10 reps.',
              instructionFull:
                'Same protocol on the leg press machine.\n\n' +
                'Feet shoulder-width, toes slightly out. ' +
                'Warm up: 40% × 5, 60% × 3, 80% × 2. Rest 3 minutes.\n\n' +
                'Lower until knees reach 90°. Press to near full extension — slight bend remains. ' +
                'Stop 1 rep before failure.\n\n' +
                'Log the weight (machine setting) and reps.',
              triggers: ['deep_squat'],
            },
          ],
        },
      ],
    },
    {
      dayNumber: 2,
      label: 'Test Day 2 — Bench',
      tests: [
        {
          type: 'amrap_bench',
          primaryExercise: 'Bench Press',
          instructionShort: '3 warm-up sets, then 1 all-out set. Target 5–10 reps.',
          instructionFull:
            'Choose a weight you estimate you can lift 5–10 times.\n\n' +
            AMRAP_WARMUP_NOTE +
            '\n\nFeet flat, natural arch. Lower the bar to your chest, press to full extension. ' +
            'Stop 1 rep before failure.\n\n' +
            'Log the weight and reps.',
          targetReps: { min: 5, max: 10 },
          affectedNoGoMovements: ['overhead'],
          substitutions: [
            {
              type: 'amrap_bench',
              primaryExercise: 'Dumbbell Floor Press',
              instructionShort: '3 warm-up sets, then 1 all-out dumbbell floor press.',
              instructionFull:
                'Lie on the floor, dumbbells at chest height, upper arms resting on the ground.\n\n' +
                'Warm up: 40% × 5, 60% × 3, 80% × 2. Rest 3 minutes.\n\n' +
                'Press to full extension, lower until upper arms touch the floor. ' +
                'The floor naturally limits range of motion — use that. Stop before failure.\n\n' +
                'Log the weight per dumbbell and reps.',
              triggers: ['overhead'],
            },
          ],
        },
      ],
    },
    {
      dayNumber: 3,
      label: 'Test Day 3 — Deadlift',
      tests: [
        {
          type: 'amrap_deadlift',
          primaryExercise: 'Conventional Deadlift',
          instructionShort: '3 warm-up sets, then 1 all-out set from the floor.',
          instructionFull:
            'Choose a weight you estimate you can lift 5–10 times.\n\n' +
            AMRAP_WARMUP_NOTE +
            '\n\nBar over mid-foot, grip just outside legs. Brace hard — hips down, chest up. ' +
            'Bar stays close to the body throughout. Lock out fully at the top. ' +
            'Stop when bar speed drops significantly.\n\n' +
            'Log the weight and reps.',
          targetReps: { min: 5, max: 10 },
          affectedNoGoMovements: ['deep_squat'],
          substitutions: [
            {
              type: 'amrap_deadlift',
              primaryExercise: 'Trap-Bar Deadlift',
              instructionShort: '3 warm-up sets, then 1 all-out trap-bar set.',
              instructionFull:
                'Same protocol on a trap (hex) bar — more upright torso, less lower-back demand.\n\n' +
                'Warm up: 40% × 5, 60% × 3, 80% × 2. Rest 3 minutes.\n\n' +
                'Stand centred in the bar, grip the side handles. ' +
                'Drive through legs — hips and shoulders rise together. Full lockout at the top.\n\n' +
                'Log the weight and reps.',
              triggers: ['deep_squat'],
            },
          ],
        },
      ],
    },
    {
      dayNumber: 4,
      label: 'Test Day 4 — Press & Row',
      tests: [
        {
          type: 'amrap_ohp',
          primaryExercise: 'Overhead Press',
          instructionShort: '3 warm-up sets, then 1 all-out overhead press.',
          instructionFull:
            'Choose a weight for 5–10 reps.\n\n' +
            'Warm up: 40% × 5, 60% × 3, 80% × 2. Rest 3 minutes.\n\n' +
            'Bar on front rack at collar-bone. Brace core, press to full lockout overhead. ' +
            'Do not lean excessively back. Stop 1 rep before failure.\n\n' +
            'Log the weight and reps.',
          targetReps: { min: 5, max: 10 },
          affectedNoGoMovements: ['overhead'],
          substitutions: [
            {
              type: 'amrap_ohp',
              primaryExercise: 'Landmine Press',
              instructionShort: '3 warm-up sets, then 1 all-out landmine press.',
              instructionFull:
                'Landmine press: bar anchored in a corner, pressing at ~45° — removes direct overhead load.\n\n' +
                'Warm up: 40% × 5, 60% × 3, 80% × 2. Rest 3 minutes.\n\n' +
                'Single arm or bilateral. Full extension at the top, controlled lowering.\n\n' +
                'Log the weight and reps.',
              triggers: ['overhead'],
            },
          ],
        },
        {
          type: 'amrap_row',
          primaryExercise: 'Barbell Row',
          instructionShort: '3 warm-up sets, then 1 all-out bent-over row.',
          instructionFull:
            'Choose a weight for 5–10 reps.\n\n' +
            'Warm up: 40% × 5, 60% × 3, 80% × 2. Rest 2 minutes.\n\n' +
            'Hinge to roughly 45°, overhand grip. ' +
            'Row bar to lower chest — elbows drive back, not flared wide. ' +
            'Control the eccentric. No momentum from the hips.\n\n' +
            'Log the weight and reps.',
          targetReps: { min: 5, max: 10 },
        },
      ],
    },
    {
      dayNumber: 5,
      label: 'Test Day 5 — Measurements & Recovery',
      tests: [
        BODY_MEASUREMENTS,
        {
          type: 'recovery_walk',
          primaryExercise: 'Recovery Walk',
          instructionShort: '20-minute easy walk — conversational pace, heart rate below 120.',
          instructionFull:
            'A gentle walk at a pace where you can hold a full conversation without gasping.\n\n' +
            'Goal is active recovery: blood flow without adding fatigue. ' +
            'Any flat route. 20 minutes.\n\n' +
            'No performance target — just move.',
          timeLimitSeconds: 1200,
        },
      ],
    },
  ],
};

// ─── lose_fat ─────────────────────────────────────────────────────────────────

const LOSE_FAT_PLAN: TestWeekPlan = {
  goal: 'lose_fat',
  durationDays: 5,
  description:
    'Five days of baseline tests spanning cardio capacity and main compound lifts at moderate rep ranges.',
  days: [
    {
      dayNumber: 1,
      label: 'Test Day 1 — Cardio Baseline',
      tests: [
        {
          type: 'cardio_baseline',
          primaryExercise: '1-Mile Run',
          instructionShort: 'Run 1 mile as fast as you can safely sustain. Record your time.',
          instructionFull:
            'Warm up with 5 minutes easy walking or jogging.\n\n' +
            'Then run 1 mile (1,609 m) at a hard but sustainable effort — ' +
            'not a sprint, not a stroll. Push to a pace you can hold the whole way.\n\n' +
            'Record your total time. This is your cardio baseline.',
          distanceMeters: 1609,
          affectedNoGoMovements: ['running'],
          substitutions: [
            {
              type: 'cardio_baseline',
              primaryExercise: 'Rowing Machine — 2 km',
              instructionShort: 'Row 2 km for time at a hard sustainable effort.',
              instructionFull:
                'Warm up with 3 minutes easy rowing.\n\n' +
                'Row 2,000 m at a hard but sustainable pace. ' +
                'Aim for consistent split times throughout — do not sprint the first 500 m.\n\n' +
                'Record your total time.',
              distanceMeters: 2000,
              triggers: ['running'],
            },
            {
              type: 'cardio_baseline',
              primaryExercise: 'Assault Bike — 4 km',
              instructionShort: 'Bike 4 km for time at a hard sustainable effort.',
              instructionFull:
                'Warm up with 3 minutes easy cycling.\n\n' +
                'Ride 4,000 m at a hard but sustainable pace. ' +
                'Keep cadence steady — avoid hammering early and fading.\n\n' +
                'Record your total time.',
              distanceMeters: 4000,
              triggers: ['running'],
            },
          ],
        },
      ],
    },
    {
      dayNumber: 2,
      label: 'Test Day 2 — Squat',
      tests: [
        {
          type: 'amrap_squat',
          primaryExercise: 'Back Squat',
          instructionShort: '3 warm-up sets, then 1 all-out set. Target 8–12 reps.',
          instructionFull:
            'Choose a moderate weight you can lift 8–12 times — lighter than a pure strength test.\n\n' +
            AMRAP_WARMUP_NOTE +
            '\n\nDescend to depth, drive through heels. Stop 1 rep before failure.\n\n' +
            'Log the weight and reps.',
          targetReps: { min: 8, max: 12 },
          affectedNoGoMovements: ['deep_squat'],
          substitutions: [
            {
              type: 'amrap_squat',
              primaryExercise: 'Leg Press',
              instructionShort: '3 warm-up sets, then 1 all-out leg press. Target 8–12 reps.',
              instructionFull:
                'Same protocol on the leg press machine.\n\n' +
                'Warm up: 40% × 5, 60% × 3, 80% × 2. Rest 3 minutes.\n\n' +
                'Lower to 90° knee angle, press to near full extension. Stop before failure.\n\n' +
                'Log the weight and reps.',
              triggers: ['deep_squat'],
            },
          ],
        },
      ],
    },
    {
      dayNumber: 3,
      label: 'Test Day 3 — Bench',
      tests: [
        {
          type: 'amrap_bench',
          primaryExercise: 'Bench Press',
          instructionShort: '3 warm-up sets, then 1 all-out set. Target 8–12 reps.',
          instructionFull:
            'Choose a moderate weight for 8–12 reps.\n\n' +
            AMRAP_WARMUP_NOTE +
            '\n\nFeet flat, natural arch. Lower bar to chest, press to full extension. ' +
            'Stop 1 rep before failure.\n\n' +
            'Log the weight and reps.',
          targetReps: { min: 8, max: 12 },
          affectedNoGoMovements: ['overhead'],
          substitutions: [
            {
              type: 'amrap_bench',
              primaryExercise: 'Dumbbell Floor Press',
              instructionShort: '3 warm-up sets, then 1 all-out dumbbell floor press.',
              instructionFull:
                'Lie on the floor, dumbbells at chest height.\n\n' +
                'Warm up: 40% × 5, 60% × 3, 80% × 2. Rest 3 minutes.\n\n' +
                'Press to full extension, lower until upper arms contact the floor.\n\n' +
                'Log the weight per dumbbell and reps.',
              triggers: ['overhead'],
            },
          ],
        },
      ],
    },
    {
      dayNumber: 4,
      label: 'Test Day 4 — Deadlift',
      tests: [
        {
          type: 'amrap_deadlift',
          primaryExercise: 'Conventional Deadlift',
          instructionShort: '3 warm-up sets, then 1 all-out set. Target 8–12 reps.',
          instructionFull:
            'Choose a moderate weight for 8–12 reps.\n\n' +
            AMRAP_WARMUP_NOTE +
            '\n\nBar over mid-foot. Brace hard, bar close throughout. Full lockout each rep. ' +
            'Stop when form degrades.\n\n' +
            'Log the weight and reps.',
          targetReps: { min: 8, max: 12 },
          affectedNoGoMovements: ['deep_squat'],
          substitutions: [
            {
              type: 'amrap_deadlift',
              primaryExercise: 'Trap-Bar Deadlift',
              instructionShort: '3 warm-up sets, then 1 all-out trap-bar set.',
              instructionFull:
                'Same protocol on a trap bar.\n\n' +
                'Warm up: 40% × 5, 60% × 3, 80% × 2. Rest 3 minutes.\n\n' +
                'Stand centred, grip side handles, drive through legs. Full lockout.\n\n' +
                'Log the weight and reps.',
              triggers: ['deep_squat'],
            },
          ],
        },
      ],
    },
    {
      dayNumber: 5,
      label: 'Test Day 5 — Measurements',
      tests: [BODY_MEASUREMENTS],
    },
  ],
};

// ─── general_fitness ──────────────────────────────────────────────────────────

const GENERAL_FITNESS_PLAN: TestWeekPlan = {
  goal: 'general_fitness',
  durationDays: 5,
  description:
    'Five days of baseline tests covering movement quality, cardio capacity, bodyweight strength, and core endurance.',
  days: [
    {
      dayNumber: 1,
      label: 'Test Day 1 — Movement Screen',
      tests: [
        {
          type: 'movement_screen',
          primaryExercise: 'Movement Screen',
          instructionShort: 'Three movement quality checks — sit-to-stand, balance, overhead reach.',
          instructionFull:
            'Three quick checks. No scoring — just notice what feels restricted.\n\n' +
            '1. Sit-to-stand (60 s)\n' +
            '   From a standard chair, stand fully then sit back down. Count reps in 60 seconds.\n\n' +
            '2. Single-leg balance (30 s / side)\n' +
            '   Stand on one foot, hands on hips. Can you hold 30 s without touching down?\n\n' +
            '3. Overhead reach\n' +
            '   Stand with back to wall. Reach both arms straight overhead. ' +
            'Note if your lower back arches off the wall or arms cannot reach vertical.\n\n' +
            'Log what you notice for each.',
          timeLimitSeconds: 60,
        },
      ],
    },
    {
      dayNumber: 2,
      label: 'Test Day 2 — Cardio Baseline',
      tests: [
        {
          type: 'cardio_baseline',
          primaryExercise: '1 km Walk or Run',
          instructionShort: 'Walk or run 1 km at any pace. Record your time.',
          instructionFull:
            'This is a baseline, not a race. Walk, jog, or run 1 km (1,000 m) ' +
            'at whatever pace you can comfortably sustain.\n\n' +
            'If easy walking feels fine, push the pace a little — we just need a starting point.\n\n' +
            'Record your total time.',
          distanceMeters: 1000,
          affectedNoGoMovements: ['running'],
          substitutions: [
            {
              type: 'cardio_baseline',
              primaryExercise: 'Stationary Bike — 2 km',
              instructionShort: 'Bike 2 km at a comfortable pace. Record your time.',
              instructionFull:
                'Cycle 2,000 m at a steady, comfortable effort.\n\n' +
                'This is a baseline — pick a pace you can maintain without stopping.\n\n' +
                'Record your total time.',
              distanceMeters: 2000,
              triggers: ['running'],
            },
            {
              type: 'cardio_baseline',
              primaryExercise: 'Rowing Machine — 1 km',
              instructionShort: 'Row 1 km at a comfortable pace. Record your time.',
              instructionFull:
                'Row 1,000 m at a steady, comfortable effort.\n\n' +
                'Maintain consistent strokes throughout. Breathe steadily.\n\n' +
                'Record your total time.',
              distanceMeters: 1000,
              triggers: ['running'],
            },
            {
              type: 'cardio_baseline',
              primaryExercise: '20-Minute Step Count',
              instructionShort: 'Walk for 20 minutes and count your steps.',
              instructionFull:
                'Walk at a comfortable pace for 20 minutes — indoors or outdoors.\n\n' +
                'Use your phone or watch to count steps. ' +
                'This gives us your baseline walking capacity without any impact.\n\n' +
                'Record your step count.',
              timeLimitSeconds: 1200,
              triggers: ['running'],
            },
          ],
        },
      ],
    },
    {
      dayNumber: 3,
      label: 'Test Day 3 — Bodyweight Strength',
      tests: [
        {
          type: 'max_pushups',
          primaryExercise: 'Push-Ups',
          instructionShort: 'As many push-ups as you can without stopping — knees allowed.',
          instructionFull:
            'Full push-up or on your knees — both are valid, just be consistent for re-tests.\n\n' +
            'Lower your chest to the floor, press to full arm extension. ' +
            'No bouncing, no pausing mid-set. Stop when you cannot complete a full rep.\n\n' +
            'Log the number of reps and which variation (full / knees).',
          affectedNoGoMovements: ['overhead'],
          substitutions: [
            {
              type: 'max_pushups',
              primaryExercise: 'Incline Push-Up (Wall)',
              instructionShort: 'As many wall push-ups as you can without stopping.',
              instructionFull:
                'Stand arm\'s length from a wall, hands at shoulder height. ' +
                'Lower chest toward wall, push back to straight arms.\n\n' +
                'The elevated angle reduces shoulder load. ' +
                'No pausing mid-set. Stop when form breaks.\n\n' +
                'Log the number of reps.',
              triggers: ['overhead'],
            },
          ],
        },
        {
          type: 'max_squats_60s',
          primaryExercise: 'Bodyweight Squats',
          instructionShort: 'As many bodyweight squats as you can in 60 seconds.',
          instructionFull:
            'Feet shoulder-width, arms forward or on hips.\n\n' +
            'Squat to at least parallel, stand fully at the top. ' +
            'Keep moving continuously — no pausing at the top or bottom.\n\n' +
            'Count every rep that reaches depth. Breathe throughout.\n\n' +
            'Log the rep count.',
          timeLimitSeconds: 60,
        },
      ],
    },
    {
      dayNumber: 4,
      label: 'Test Day 4 — Carry & Core',
      tests: [
        {
          type: 'loaded_carry',
          primaryExercise: 'Dumbbell Farmer Carry',
          instructionShort: 'Carry a light dumbbell 30 seconds each side. Stand tall throughout.',
          instructionFull:
            'Pick a light dumbbell — 5–10 kg, or whatever feels like a 5/10 effort one-handed.\n\n' +
            'Hold in one hand, stand tall, brace your core. ' +
            'Walk back and forth for 30 seconds. Swap hands, repeat for another 30 seconds.\n\n' +
            'Note the weight used.',
          timeLimitSeconds: 60,
        },
        {
          type: 'plank_hold',
          primaryExercise: 'Forearm Plank',
          instructionShort: 'Hold a forearm plank as long as you can.',
          instructionFull:
            'Forearms on floor, elbows directly under shoulders. ' +
            'Hips level — not too high, not sagging.\n\n' +
            'Breathe steadily. Hold until your hips drop or form breaks.\n\n' +
            'Log the time in seconds.',
        },
      ],
    },
    {
      dayNumber: 5,
      label: 'Test Day 5 — Measurements',
      tests: [BODY_MEASUREMENTS],
    },
  ],
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const TEST_WEEK_PLANS: Record<GoalKey, TestWeekPlan> = {
  build_muscle: BUILD_MUSCLE_PLAN,
  lose_fat: LOSE_FAT_PLAN,
  general_fitness: GENERAL_FITNESS_PLAN,
};
