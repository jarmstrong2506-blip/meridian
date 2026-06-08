import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NutritionScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Text style={styles.eyebrow}>NUTRITION</Text>
        <Text style={styles.heading}>Fuel your{'\n'}performance.</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  eyebrow: {
    color: '#3A3A3A',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.5,
    marginBottom: 16,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 52,
  },
});
