import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { fonts, MeridianColors } from '@/constants/theme';

type DataItem = {
  label: string;
  value: string;
  accent?: boolean;
  route?: string;
};

type DataTrioProps = {
  items: [DataItem, DataItem, DataItem];
};

export function DataTrio({ items }: DataTrioProps) {
  return (
    <View style={s.row}>
      {items.map((item, i) => (
        <TouchableOpacity
          key={i}
          style={s.col}
          activeOpacity={0.6}
          onPress={() => item.route && router.push(item.route as never)}
        >
          <Text style={s.label}>{item.label}</Text>
          <View style={s.gap} />
          <Text style={[s.value, item.accent && s.accentValue]}>
            {item.value}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: MeridianColors.textFaint,
    textAlign: 'center',
  },
  gap: {
    height: 8,
  },
  value: {
    fontFamily: fonts.sans,
    fontSize: 18,
    color: MeridianColors.text,
    textAlign: 'center',
  },
  accentValue: {
    color: MeridianColors.accent,
  },
});
