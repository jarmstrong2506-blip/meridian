import {
  GoalKey,
  NoGoMovement,
  TestDefinition,
  TestWeekPlan,
  TEST_WEEK_PLANS,
} from '@/data/testWeek';

/**
 * Epley formula: estimated 1RM from a submaximal AMRAP set.
 * Returns weight × (1 + reps/30), rounded to 1 decimal place.
 */
export function calculateEpley1RM(weightKg: number, reps: number): number {
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/**
 * Returns the user's Test Week plan with substitutions applied for their no-go
 * movements. Only the first matching substitution per test is applied.
 * When a substitution fires, `originalType` is set on the resulting
 * TestDefinition so callers can record which substitution was used.
 */
export function resolveTestWeekPlan(goal: GoalKey, noGos: NoGoMovement[]): TestWeekPlan {
  const base = TEST_WEEK_PLANS[goal];

  return {
    ...base,
    days: base.days.map((day) => ({
      ...day,
      tests: day.tests.map((test) => applySubstitution(test, noGos)),
    })),
  };
}

function applySubstitution(test: TestDefinition, noGos: NoGoMovement[]): TestDefinition {
  if (!test.substitutions || test.substitutions.length === 0) return test;

  const sub = test.substitutions.find(
    (s) => s.triggers !== undefined && s.triggers.some((t) => noGos.includes(t)),
  );
  if (!sub) return test;

  const { triggers: _triggers, ...subFields } = sub;
  return {
    ...test,
    ...subFields,
    originalType: test.type,
  };
}

/**
 * Returns the 1-based day index within the Test Week plan that corresponds to
 * `todayISO`, or null if the Test Week is complete or hasn't started.
 * Uses local date arithmetic — ISO strings parsed as YYYY-MM-DD.
 */
export function getCurrentTestDay(
  plan: TestWeekPlan,
  startDateISO: string,
  todayISO: string,
): number | null {
  const [sy, sm, sd] = startDateISO.split('-').map(Number);
  const [ty, tm, td] = todayISO.split('-').map(Number);

  const start = new Date(sy, sm - 1, sd);
  const today = new Date(ty, tm - 1, td);

  const msPerDay = 24 * 60 * 60 * 1000;
  const elapsed = Math.round((today.getTime() - start.getTime()) / msPerDay);
  const dayNumber = elapsed + 1;

  if (dayNumber < 1 || dayNumber > plan.durationDays) return null;
  return dayNumber;
}

/**
 * Builds the test_week_id used to group all results from one Test Week.
 * Format: the start date ISO string YYYY-MM-DD.
 */
export function buildTestWeekId(startDateISO: string): string {
  return startDateISO;
}
