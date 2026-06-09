import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, MeridianColors } from '@/constants/theme';
import { BriefingHero } from '@/components/briefing-hero';
import { SessionCard } from '@/components/session-card';
import { DataTrio } from '@/components/data-trio';

const READINESS = 62;

export default function HomeScreen() {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <View style={s.screen}>
      <SafeAreaView style={s.safe} edges={['top']}>
        <Animated.View style={[s.animated, { opacity }]}>
          <View style={s.topSpacer} />

          <View style={s.dateStrip}>
            <Text style={s.date}>Tuesday · 9 June</Text>
          </View>

          <View style={s.gap56} />
          <BriefingHero readiness={READINESS} />

          <View style={s.gap32} />
          <SessionCard
            title="Upper Body"
            subtitle="Moderate · 40 min · 4 exercises"
          />

          <View style={s.gap56} />
          <DataTrio
            items={[
              { label: 'READINESS', value: '62', accent: true },
              { label: 'SLEEP',     value: '5h 48m' },
              { label: 'HRV',       value: '↓ 18%' },
            ]}
          />

          <View style={s.bottomSpacer} />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: MeridianColors.bg,
  },
  safe: {
    flex: 1,
  },
  animated: {
    flex: 1,
  },
  topSpacer: {
    flex: 1,
  },
  bottomSpacer: {
    flex: 0.6,
  },
  dateStrip: {
    paddingHorizontal: 24,
  },
  date: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: MeridianColors.textMuted,
    letterSpacing: 0.5,
  },
  gap56: {
    height: 56,
  },
  gap32: {
    height: 32,
  },
});
