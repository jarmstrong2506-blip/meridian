import { useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { MeridianColors as C } from '@/constants/theme';

let _uid = 0;

export function BackgroundWash() {
  const id  = useRef(++_uid).current;
  const { width, height } = useWindowDimensions();
  const r   = Math.max(width, height) * 0.65;
  const wId = `bw${id}`;
  const cId = `bc${id}`;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id={wId} cx={width * 0.8} cy={height * 0.12} r={r} gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor={C.gold} stopOpacity={0.045} />
            <Stop offset="100%" stopColor={C.gold} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={cId} cx={width * 0.15} cy={height * 0.85} r={r * 0.9} gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor={C.blue} stopOpacity={0.03} />
            <Stop offset="100%" stopColor={C.blue} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${wId})`} />
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${cId})`} />
      </Svg>
    </View>
  );
}
