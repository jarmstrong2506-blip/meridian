import { TabList, TabSlot, TabTrigger, TabTriggerSlotProps, Tabs } from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MeridianColors } from '@/constants/theme';

type TabConfig = {
  name: string;
  href: string;
  label: string;
  symbol: { ios: string; android: string; web: string };
};

const TABS: TabConfig[] = [
  {
    name: 'nutrition',
    href: '/nutrition',
    label: 'Nutrition',
    symbol: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
  },
  {
    name: 'train',
    href: '/train',
    label: 'Train',
    symbol: { ios: 'figure.run', android: 'directions_run', web: 'directions_run' },
  },
  {
    name: 'index',
    href: '/',
    label: 'Home',
    symbol: { ios: 'house.fill', android: 'home', web: 'home' },
  },
  {
    name: 'progress',
    href: '/progress',
    label: 'Progress',
    symbol: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' },
  },
  {
    name: 'profile',
    href: '/profile',
    label: 'Profile',
    symbol: { ios: 'person.fill', android: 'person', web: 'person' },
  },
];

export default function AppTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs style={styles.container}>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <View style={StyleSheet.flatten([styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }])}>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href as any} asChild>
              <TabButton label={tab.label} symbol={tab.symbol} />
            </TabTrigger>
          ))}
        </View>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  label: string;
  symbol: TabConfig['symbol'];
};

function TabButton({ label, symbol, isFocused, ...props }: TabButtonProps) {
  const color = isFocused ? '#FFFFFF' : '#454545';

  return (
    <Pressable {...props} style={styles.tabButton}>
      {isFocused && <View style={styles.activeBar} />}
      <SymbolView name={symbol as any} size={22} tintColor={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slot: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: MeridianColors.tabBar,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: MeridianColors.border,
    paddingTop: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  activeBar: {
    position: 'absolute',
    top: -10,
    width: 28,
    height: 2,
    backgroundColor: MeridianColors.accent,
    borderRadius: 1,
  },
});
