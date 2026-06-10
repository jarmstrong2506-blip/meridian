import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect, useRouter } from 'expo-router';
import { fonts, MeridianColors as C } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { todaySchedule } from '@/data/mockSchedule';
import { GoalKey, NoGoMovement } from '@/data/testWeek';
import { getCurrentTestDay, resolveTestWeekPlan } from '@/lib/testWeek';
import { BackgroundWash } from '@/components/background-wash';

type TestWeekProfileMin = {
  goal: string;
  test_week_status: string | null;
  test_week_started_at: string | null;
  test_week_no_gos: string[] | null;
};

// ─── Types ────────────────────────────────────────────────────────────────────

type MetricKey = 'readiness' | 'sleep' | 'hrv';

interface Stat { value: string; unit: string; label: string }
interface MetricConfig {
  key: MetricKey;
  label: string;
  color: string;
  arcValue: number;
  mainValue: string;
  subValue?: string;
  stats: [Stat, Stat, Stat];
  bars: number[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const METRICS: MetricConfig[] = [
  {
    key: 'readiness',
    label: 'READINESS',
    color: C.gold,
    arcValue: 0.72,
    mainValue: '72',
    stats: [
      { value: '52', unit: 'bpm', label: 'Resting HR' },
      { value: '+7', unit: 'pts', label: 'vs yesterday' },
      { value: '0.1°', unit: '', label: 'Skin Temp' },
    ],
    bars: [68, 75, 62, 81, 70, 65, 72],
  },
  {
    key: 'sleep',
    label: 'SLEEP',
    color: C.blue,
    arcValue: 0.84,
    mainValue: '8h',
    subValue: '2m',
    stats: [
      { value: '8h 2m', unit: '', label: 'Duration' },
      { value: '–12m', unit: '', label: 'Sleep debt' },
      { value: '91', unit: '%', label: 'Efficiency' },
    ],
    bars: [7.2, 7.8, 6.5, 8.5, 7.0, 6.8, 8.0],
  },
  {
    key: 'hrv',
    label: 'HRV',
    color: C.green,
    arcValue: 0.65,
    mainValue: '58',
    subValue: 'ms',
    stats: [
      { value: '62', unit: 'ms', label: '7-day avg' },
      { value: '–6.5', unit: '%', label: 'vs baseline' },
      { value: '55', unit: 'ms', label: 'Weekly low' },
    ],
    bars: [65, 58, 70, 62, 55, 61, 58],
  },
];

const DAY_LABELS = ['W', 'T', 'F', 'S', 'S', 'M', 'T'];

// ─── Arc component ────────────────────────────────────────────────────────────

const SIZE        = 52;
const RADIUS      = 20;
const STROKE      = 2.5;
const CX          = SIZE / 2;
const CY          = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Animated.createAnimatedComponent injects collapsable={false} to prevent native
// view collapsing. On web this prop reaches the SVG DOM element and triggers a
// React warning. Strip it in a shim before it gets that far.
const _CircleBase =
  Platform.OS === 'web'
    ? ({ collapsable: _c, ...p }: any) => <Circle {...p} />
    : Circle;

const AnimatedCircle = Animated.createAnimatedComponent(_CircleBase);

function MetricArc({ value, color, mainValue, subValue }: {
  value: number; color: string; mainValue: string; subValue?: string;
}) {
  const dashOffset = useRef(new Animated.Value(CIRCUMFERENCE)).current;

  useEffect(() => {
    Animated.timing(dashOffset, {
      toValue: CIRCUMFERENCE * (1 - value),
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, []);

  return (
    <View style={arcStyles.wrap}>
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={CX} cy={CY} r={RADIUS}
          stroke={C.divider} strokeWidth={STROKE} fill="none"
        />
        <AnimatedCircle
          cx={CX} cy={CY} r={RADIUS}
          stroke={color} strokeWidth={STROKE} fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90, ${CX}, ${CY})`}
        />
      </Svg>
      <View style={arcStyles.label}>
        <Text style={arcStyles.main}>{mainValue}</Text>
        {subValue && <Text style={arcStyles.sub}>{subValue}</Text>}
      </View>
    </View>
  );
}

const arcStyles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    lineHeight: 15,
    color: C.text,
    fontVariant: ['tabular-nums'],
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 9,
    color: C.textMuted,
    lineHeight: 11,
  },
});

// ─── Bar chart ────────────────────────────────────────────────────────────────

const BAR_CHART_HEIGHT = 44;
const BAR_WIDTH  = 12;
const BAR_GAP    = 8;
const BAR_RADIUS = 3;
const CHART_WIDTH = 7 * BAR_WIDTH + 6 * BAR_GAP;

import { Rect } from 'react-native-svg';

function BarChart({ bars, color }: { bars: number[]; color: string }) {
  const max = Math.max(...bars);
  return (
    <View>
      <Svg width={CHART_WIDTH} height={BAR_CHART_HEIGHT}>
        {bars.map((v, i) => {
          const barH    = Math.round((v / max) * BAR_CHART_HEIGHT);
          const x       = i * (BAR_WIDTH + BAR_GAP);
          const y       = BAR_CHART_HEIGHT - barH;
          const isToday = i === bars.length - 1;
          const fill    = isToday ? color : color + '38';
          return (
            <Rect
              key={i}
              x={x} y={y}
              width={BAR_WIDTH} height={barH}
              rx={BAR_RADIUS} ry={BAR_RADIUS}
              fill={fill}
            />
          );
        })}
      </Svg>
      <View style={chartStyles.labels}>
        {DAY_LABELS.map((d, i) => (
          <Text
            key={i}
            style={[
              chartStyles.dayLabel,
              { color: i === DAY_LABELS.length - 1 ? C.text : C.textFaint },
            ]}
          >
            {d}
          </Text>
        ))}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  labels: {
    flexDirection: 'row',
    width: CHART_WIDTH,
    justifyContent: 'space-between',
    marginTop: 5,
  },
  dayLabel: {
    fontFamily: fonts.sans,
    fontSize: 9,
    width: BAR_WIDTH,
    textAlign: 'center',
  },
});

// ─── Tab panel — crossfades on switch ─────────────────────────────────────────

function TabPanel({ metric }: { metric: MetricConfig }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[panelStyles.wrap, { opacity: fadeAnim }]}>
      {/* Stats row */}
      <View style={panelStyles.statsRow}>
        {metric.stats.map((s, i) => (
          <View key={i} style={panelStyles.statCol}>
            {i > 0 && <View style={panelStyles.dividerV} />}
            <View style={panelStyles.statInner}>
              <View style={panelStyles.statValueRow}>
                <Text style={[panelStyles.statValue, { color: metric.color }]}>{s.value}</Text>
                {s.unit ? <Text style={panelStyles.statUnit}>{s.unit}</Text> : null}
              </View>
              <Text style={panelStyles.statLabel}>{s.label.toUpperCase()}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Bar chart */}
      <View style={panelStyles.chartWrap}>
        <BarChart bars={metric.bars} color={metric.color} />
        <Text style={panelStyles.caption}>7-DAY TREND</Text>
      </View>
    </Animated.View>
  );
}

const panelStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statCol: {
    flex: 1,
    flexDirection: 'row',
  },
  dividerV: {
    width: 1,
    backgroundColor: C.divider,
    marginRight: 14,
  },
  statInner: {
    flex: 1,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  statValue: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  statUnit: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: C.textMuted,
  },
  statLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    color: C.textMuted,
    letterSpacing: 0.09 * 9,
    marginTop: 3,
  },
  chartWrap: {
    alignItems: 'flex-start',
  },
  caption: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    color: C.textMuted,
    letterSpacing: 0.09 * 9,
    alignSelf: 'flex-end',
    marginTop: 8,
  },
});

// ─── Home screen ──────────────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function HomeScreen() {
  const router   = useRouter();
  const opacity  = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab]           = useState<MetricKey>('readiness');
  const [todayDone, setTodayDone]           = useState(false);
  const [twProfile, setTwProfile]           = useState<TestWeekProfileMin | null>(null);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const [sessRes, profRes] = await Promise.all([
            supabase.from('sessions').select('id').eq('date', todayStr()).limit(1),
            supabase
              .from('profiles')
              .select('goal, test_week_status, test_week_started_at, test_week_no_gos')
              .eq('id', user.id)
              .single(),
          ]);

          console.log('[home] session query:', sessRes.error ?? 'ok');
          setTodayDone(sessRes.data !== null && sessRes.data.length > 0);
          setTwProfile(profRes.data as TestWeekProfileMin | null);
        } catch (_) { /* non-blocking */ }
      })();
    }, [])
  );

  const activeMetric = METRICS.find(m => m.key === activeTab)!;

  return (
    <View style={s.screen}>
      <BackgroundWash />
      <SafeAreaView style={s.safe} edges={['top']}>
        <Animated.View style={{ opacity, flex: 1 }}>
          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.content}
            showsVerticalScrollIndicator={false}
          >
            {/* 1 — Header */}
            <View style={s.header}>
              <Text style={s.date}>Tuesday · 9 June</Text>
              <View style={s.avatar}>
                <Text style={s.avatarText}>JA</Text>
              </View>
            </View>

            {/* 2 — Metrics row */}
            <View style={s.metricsRow}>
              {METRICS.map(m => {
                const isActive = m.key === activeTab;
                return (
                  <TouchableOpacity
                    key={m.key}
                    style={[s.metricCol, { opacity: isActive ? 1 : 0.45 }]}
                    onPress={() => setActiveTab(m.key)}
                    activeOpacity={0.7}
                  >
                    <MetricArc
                      value={m.arcValue}
                      color={m.color}
                      mainValue={m.mainValue}
                      subValue={m.subValue}
                    />
                    <Text style={[s.metricLabel, { color: isActive ? C.text : C.textMuted }]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 3 — Divider */}
            <View style={s.divider} />

            {/* 4 — Coaching sentence */}
            <View style={s.coachWrap}>
              <View style={[s.coachBorder, { backgroundColor: C.gold }]} />
              <Text style={s.coachText}>
                Lighter session today. Your HRV dropped 18% overnight — recover now, push tomorrow.
              </Text>
            </View>

            {/* 5 — Session card */}
            {(() => {
              // ── Test Week: complete ───────────────────────────────────────
              if (twProfile?.test_week_status === 'complete') {
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={s.card}
                    onPress={() => router.push('/test-week-summary')}
                  >
                    <Text style={s.cardEyebrow}>TEST WEEK COMPLETE</Text>
                    <Text style={s.cardTitle}>View your Test Week Summary →</Text>
                  </TouchableOpacity>
                );
              }

              // ── Test Week: in progress ────────────────────────────────────
              if (twProfile?.test_week_status === 'in_progress' && twProfile.test_week_started_at) {
                const goalMap: Record<string, GoalKey> = {
                  'Build muscle': 'build_muscle',
                  'Lose fat': 'lose_fat',
                  'General fitness': 'general_fitness',
                };
                const gk: GoalKey = goalMap[twProfile.goal] ?? 'general_fitness';
                const noGos = (twProfile.test_week_no_gos ?? ['none']) as NoGoMovement[];
                const plan  = resolveTestWeekPlan(gk, noGos);
                const dayIdx = getCurrentTestDay(plan, twProfile.test_week_started_at, todayStr());
                const testDay = dayIdx !== null
                  ? plan.days.find((d) => d.dayNumber === dayIdx) ?? null
                  : null;

                if (!testDay) {
                  return (
                    <View style={s.card}>
                      <Text style={s.cardEyebrowTw}>TODAY · TEST WEEK</Text>
                      <Text style={s.cardTitle}>Rest Day</Text>
                      <Text style={s.cardMeta}>Recover. Next test tomorrow.</Text>
                    </View>
                  );
                }

                const metaLine = testDay.tests.map((t) => t.primaryExercise).join(' · ');
                return (
                  <View style={s.card}>
                    <View style={s.cardTop}>
                      <Text style={s.cardEyebrowTw}>TODAY · TEST WEEK</Text>
                      <TouchableOpacity onPress={() => router.push('/train')} activeOpacity={0.7}>
                        <Text style={s.cardCta}>BEGIN →</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={s.cardTitle}>{testDay.label}</Text>
                    <Text style={s.cardMeta}>{metaLine}</Text>
                  </View>
                );
              }

              // ── Normal session card ───────────────────────────────────────
              const sched  = todaySchedule();
              const isRest = sched.type === null;
              return (
                <View style={s.card}>
                  <View style={s.cardTop}>
                    <Text style={s.cardEyebrow}>TODAY</Text>
                    {!isRest && (
                      <TouchableOpacity onPress={() => router.push('/train')} activeOpacity={0.7}>
                        <Text style={s.cardCta}>BEGIN →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={s.cardTitleRow}>
                    <Text style={s.cardTitle}>{isRest ? 'Rest Day' : sched.type}</Text>
                    {todayDone && <Text style={s.cardTick}>✓</Text>}
                  </View>
                  {!isRest && (
                    <Text style={s.cardMeta}>
                      {sched.intensity} · {sched.duration} · {sched.exerciseCount} exercises
                    </Text>
                  )}
                </View>
              );
            })()}

            {/* 6 — Metric tabs */}
            <View style={s.tabsRow}>
              {METRICS.map(m => {
                const isActive = m.key === activeTab;
                return (
                  <TouchableOpacity
                    key={m.key}
                    style={[s.tab, isActive && { borderBottomColor: m.color, borderBottomWidth: 1.5 }]}
                    onPress={() => setActiveTab(m.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.tabLabel, { color: isActive ? C.text : C.textMuted }]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 7 — Tab panel — key forces remount + crossfade on switch */}
            <TabPanel key={activeTab} metric={activeMetric} />
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 12,
  },
  date: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: C.textMuted,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#191C22',
    borderWidth: 1,
    borderColor: '#23272F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    color: C.textMuted,
  },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  metricCol: {
    alignItems: 'center',
    gap: 6,
  },
  metricLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    color: C.textMuted,
    letterSpacing: 0.09 * 9,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: C.divider,
    marginHorizontal: 22,
  },

  // Coaching sentence
  coachWrap: {
    flexDirection: 'row',
    paddingHorizontal: 22,
    marginTop: 16,
    marginBottom: 4,
  },
  coachBorder: {
    width: 2,
    borderRadius: 1,
    marginRight: 14,
  },
  coachText: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize: 19,
    color: C.text,
    lineHeight: 19 * 1.3,
  },

  // Session card
  card: {
    margin: 12,
    marginTop: 12,
    marginHorizontal: 22,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 14,
    padding: 13,
    paddingHorizontal: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardEyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    color: C.textMuted,
    letterSpacing: 0.1 * 10,
  },
  cardEyebrowTw: {
    fontFamily:    fonts.sansSemiBold,
    fontSize:      10,
    color:         C.gold,
    letterSpacing: 0.1 * 10,
  },
  cardCta: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    color: C.gold,
    letterSpacing: 0.07 * 11,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: C.text,
  },
  cardTick: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: C.textMuted,
  },
  cardMeta: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: C.textMuted,
  },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 22,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
    marginTop: 16,
  },
  tab: {
    paddingVertical: 10,
    marginRight: 24,
    borderBottomWidth: 1.5,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 0.09 * 10,
  },
});
