import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { fonts, MeridianColors } from '@/constants/theme';

type SessionCardProps = {
  title: string;
  subtitle: string;
};

export function SessionCard({ title, subtitle }: SessionCardProps) {
  return (
    <View style={s.card}>
      <View style={s.topRow}>
        <Text style={s.label}>TODAY</Text>
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={() => router.push('/session')}
        >
          <Text style={s.begin}>BEGIN →</Text>
        </TouchableOpacity>
      </View>

      <View style={s.gap} />

      <Text style={s.title}>{title}</Text>
      <Text style={s.subtitle}>{subtitle}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: 24,
    borderWidth: 1,
    borderColor: MeridianColors.border,
    backgroundColor: MeridianColors.card,
    borderRadius: 12,
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: MeridianColors.textMuted,
  },
  begin: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: MeridianColors.accent,
  },
  gap: {
    height: 12,
  },
  title: {
    fontFamily: fonts.serifMedium,
    fontSize: 20,
    color: MeridianColors.text,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: MeridianColors.textMuted,
    marginTop: 4,
  },
});
