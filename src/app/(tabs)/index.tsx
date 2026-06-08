import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Data ─────────────────────────────────────────────────────────────────────

const REPORT = {
  readiness: 82,
  sleep: 76,
  hrv: 62,
  rhr: 58,
  summary: "Recovery is solid. You're primed to perform.",
} as const;

const WORKOUT = {
  type: 'Lower Body',
  focus: 'Strength',
  duration: '52 min',
  intensity: 'Moderate' as const,
} as const;

// ─── Colour system ────────────────────────────────────────────────────────────
// Muted, refined tones — sage green, warm amber, dusty rose.

const PALETTE = {
  green:  '#5CAD83',
  amber:  '#C49A50',
  red:    '#B86262',
  bg:     '#0A0A0A',
  card:   '#181818',
  border: '#2A2A2A',
} as const;

function scoreColor(score: number): string {
  if (score >= 80) return PALETTE.green;
  if (score >= 50) return PALETTE.amber;
  return PALETTE.red;
}

const INTENSITY_COLOR: Record<string, string> = {
  Light:    PALETTE.green,
  Moderate: PALETTE.amber,
  High:     PALETTE.red,
};

// ─── SVG ring geometry ────────────────────────────────────────────────────────

const SVG_SIZE = 210;
const SVG_CX   = SVG_SIZE / 2;
const SVG_CY   = SVG_SIZE / 2;
const RADIUS   = 90;   // centre of stroke
const STROKE_W = 12;
const CIRCUM   = 2 * Math.PI * RADIUS;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  return (
    <View style={s.screen}>
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          <Header />
          <RingSection />
          <Text style={s.summary}>{REPORT.summary}</Text>
          <MetricRow />
          <WorkoutCard />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header() {
  return (
    <View style={s.header}>
      <Text style={s.date}>MON · JUN 8</Text>
      <Text style={s.greeting}>Good morning.</Text>
    </View>
  );
}

// ─── Ring section ─────────────────────────────────────────────────────────────

function RingSection() {
  const color      = scoreColor(REPORT.readiness);
  const dashOffset = CIRCUM * (1 - REPORT.readiness / 100);

  return (
    <View style={s.ringSection}>
      {/* SVG ring */}
      <View style={s.ringContainer}>
        <Svg width={SVG_SIZE} height={SVG_SIZE}>
          {/* Track */}
          <Circle
            cx={SVG_CX}
            cy={SVG_CY}
            r={RADIUS}
            stroke="#1C1C1C"
            strokeWidth={STROKE_W}
            fill="none"
          />

          {/* Progress arc — group rotated -90° so arc starts at 12 o'clock */}
          <G transform={`rotate(-90, ${SVG_CX}, ${SVG_CY})`}>
            {/* Soft glow behind the arc */}
            <Circle
              cx={SVG_CX}
              cy={SVG_CY}
              r={RADIUS}
              stroke={color}
              strokeWidth={STROKE_W + 10}
              fill="none"
              opacity={0.08}
              strokeLinecap="round"
              strokeDasharray={CIRCUM}
              strokeDashoffset={dashOffset}
            />
            {/* Main arc */}
            <Circle
              cx={SVG_CX}
              cy={SVG_CY}
              r={RADIUS}
              stroke={color}
              strokeWidth={STROKE_W}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRCUM}
              strokeDashoffset={dashOffset}
            />
          </G>
        </Svg>

        {/* Centre label — absolute over the SVG */}
        <View style={s.ringCentre}>
          <Text style={s.ringScore}>{REPORT.readiness}</Text>
          <Text style={s.ringSubLabel}>READINESS</Text>
        </View>
      </View>

      {/* Sub-metrics strip — 3 key inputs that form the readiness score */}
      <View style={s.ringMetrics}>
        <RingMetric value={`${REPORT.hrv}ms`}  label="HRV" />
        <View style={s.metricDivider} />
        <RingMetric value={`${REPORT.rhr}bpm`} label="RESTING HR" />
        <View style={s.metricDivider} />
        <RingMetric
          value={`${REPORT.sleep}%`}
          label="SLEEP"
          color={scoreColor(REPORT.sleep)}
        />
      </View>
    </View>
  );
}

function RingMetric({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color?: string;
}) {
  return (
    <View style={s.ringMetric}>
      <Text style={[s.ringMetricValue, color ? { color } : undefined]}>{value}</Text>
      <Text style={s.ringMetricLabel}>{label}</Text>
    </View>
  );
}

// ─── Metric tiles ─────────────────────────────────────────────────────────────

function MetricRow() {
  return (
    <View style={m.row}>
      <MetricTile
        label="SLEEP"
        value={`${REPORT.sleep}%`}
        sub="7h 20m recorded"
        color={scoreColor(REPORT.sleep)}
      />
      <MetricTile
        label="HRV"
        value={`${REPORT.hrv}ms`}
        sub="+4ms vs 30-day avg"
        color="#CCCCCC"
      />
    </View>
  );
}

function MetricTile({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <Pressable style={({ pressed }) => [m.tile, pressed && m.pressed]}>
      <View style={m.tileLeft}>
        <Text style={m.tileLabel}>{label}</Text>
        <Text style={[m.tileValue, { color }]}>{value}</Text>
        <Text style={m.tileSub}>{sub}</Text>
      </View>
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={11}
        tintColor="#363636"
      />
    </Pressable>
  );
}

const m = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  tile: {
    flex: 1,
    backgroundColor: PALETTE.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PALETTE.border,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pressed: {
    opacity: 0.72,
  },
  tileLeft: {
    flex: 1,
    gap: 4,
  },
  tileLabel: {
    color: '#444',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.8,
  },
  tileValue: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  tileSub: {
    color: '#3A3A3A',
    fontSize: 10,
    fontWeight: '400',
  },
});

// ─── Workout card ─────────────────────────────────────────────────────────────

function WorkoutCard() {
  const accent = INTENSITY_COLOR[WORKOUT.intensity];

  return (
    <View style={w.card}>
      <View style={[w.accentBar, { backgroundColor: accent }]} />

      <View style={w.body}>
        <Text style={w.cardLabel}>TODAY'S WORKOUT</Text>

        <View style={w.titleBlock}>
          <Text style={w.type}>{WORKOUT.type}</Text>
          <Text style={w.focus}>{WORKOUT.focus}</Text>
        </View>

        <View style={w.pillRow}>
          <StatPill label="DURATION"  value={WORKOUT.duration} />
          <StatPill label="INTENSITY" value={WORKOUT.intensity} valueColor={accent} />
        </View>

        <Pressable
          style={({ pressed }) => [w.cta, pressed && w.ctaPressed]}
          onPress={() => router.push('/session')}
        >
          <Text style={w.ctaText}>Start Session</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StatPill({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={w.pill}>
      <Text style={[w.pillValue, valueColor ? { color: valueColor } : undefined]}>
        {value}
      </Text>
      <Text style={w.pillLabel}>{label}</Text>
    </View>
  );
}

const w = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: PALETTE.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PALETTE.border,
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
  },
  body: {
    flex: 1,
    padding: 20,
  },
  cardLabel: {
    color: '#383838',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 14,
  },
  titleBlock: {
    gap: 4,
    marginBottom: 20,
  },
  type: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  focus: {
    color: '#666',
    fontSize: 13,
    fontWeight: '400',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  pill: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4,
  },
  pillValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  pillLabel: {
    color: '#383838',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  cta: {
    backgroundColor: PALETTE.green,
    borderRadius: 11,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaPressed: {
    opacity: 0.8,
  },
  ctaText: {
    color: '#0A0A0A',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

// ─── Screen-level styles ──────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PALETTE.bg,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 44,
    gap: 16,
  },

  // Header
  header: {
    paddingTop: 12,
    paddingBottom: 4,
    gap: 5,
  },
  date: {
    color: '#383838',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 2,
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '600',
    letterSpacing: -0.5,
  },

  // Ring
  ringSection: {
    alignItems: 'center',
    gap: 22,
    paddingVertical: 6,
  },
  ringContainer: {
    width: SVG_SIZE,
    height: SVG_SIZE,
  },
  ringCentre: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ringScore: {
    color: '#FFFFFF',
    fontSize: 62,
    fontWeight: '700',
    lineHeight: 66,
    letterSpacing: -2,
  },
  ringSubLabel: {
    color: '#3C3C3C',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2.5,
  },

  // Ring sub-metrics
  ringMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    width: SVG_SIZE,
  },
  ringMetric: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  ringMetricValue: {
    color: '#C8C8C8',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  ringMetricLabel: {
    color: '#3C3C3C',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  metricDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#1E1E1E',
  },

  // Summary
  summary: {
    color: '#555',
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    marginTop: -4,
  },
});
