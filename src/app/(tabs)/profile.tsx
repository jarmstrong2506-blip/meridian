import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fonts, MeridianColors as C } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { bottom } = useSafeAreaInsets();

  const handleDevReset = () => {
    Alert.alert(
      'Reset onboarding?',
      'This clears your profile and Test Week state.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase.from('profiles').delete().eq('id', user.id);
              }
              await AsyncStorage.clear();
            } catch (e) {
              console.log('[dev-reset] error:', e);
            }
            router.replace('/onboarding');
          },
        },
      ],
    );
  };

  return (
    <View style={s.container}>
      <SafeAreaView style={s.safe} edges={['top']}>
        <Text style={s.eyebrow}>PROFILE</Text>
        <Text style={s.heading}>Your stats,{'\n'}your story.</Text>

        <View style={s.spacer} />

        {__DEV__ && (
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={handleDevReset}
            style={[s.devBtn, { marginBottom: bottom + 24 }]}
          >
            <Text style={s.devLabel}>Reset onboarding</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  safe:      { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  eyebrow: {
    color:         '#3A3A3A',
    fontSize:      11,
    fontWeight:    '600',
    letterSpacing: 2.5,
    marginBottom:  16,
  },
  heading: {
    color:      '#FFFFFF',
    fontSize:   48,
    fontWeight: '700',
    lineHeight: 52,
  },
  spacer: { flex: 1 },
  devBtn: { alignSelf: 'center' },
  devLabel: {
    fontFamily: fonts.sans,
    fontSize:   12,
    color:      C.textMuted,
  },
});
