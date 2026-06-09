import { StyleSheet, Text, View } from 'react-native';
import { fonts, MeridianColors } from '@/constants/theme';

type BriefingHeroProps = {
  readiness: number;
};

function getVariant(readiness: number): {
  sentences: string[];
  fontSize: number;
} {
  if (readiness >= 75) {
    return {
      sentences: ["You're well recovered. Make today count."],
      fontSize: 24,
    };
  }
  if (readiness >= 50) {
    return {
      sentences: [
        "Lighter session today. Your HRV dropped 18% overnight — recover now, push tomorrow.",
      ],
      fontSize: 28,
    };
  }
  return {
    sentences: [
      "Your body is asking for rest.",
      "HRV is down sharply and sleep quality was poor. A hard session today risks a longer hole.",
      "Move lightly, eat well, sleep early.",
    ],
    fontSize: 24,
  };
}

export function BriefingHero({ readiness }: BriefingHeroProps) {
  const { sentences, fontSize } = getVariant(readiness);

  const lineHeight = Math.round(fontSize * 1.35);

  return (
    <View style={s.container}>
      {sentences.map((sentence, i) => (
        <Text
          key={i}
          style={[
            s.text,
            { fontSize, lineHeight },
            i > 0 && s.subsequent,
          ]}
        >
          {sentence}
        </Text>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    gap: 10,
  },
  text: {
    fontFamily: fonts.serif,
    color: MeridianColors.text,
  },
  subsequent: {
    color: MeridianColors.textMuted,
  },
});
