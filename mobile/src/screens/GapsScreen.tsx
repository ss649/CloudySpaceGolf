import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Path, Text as SvgText, G, Ellipse, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { useGameStore } from '../store/gameStore';
import { Header } from '../components/Header';
import { GolfScorecard } from '../components/GolfScorecard';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

export const GapsScreen: React.FC = () => {
  const { colors, typography } = useTheme();
  const setActiveTab = useGameStore((state) => state.setActiveTab);
  const setSkyMode = useGameStore((state) => state.setSkyMode);
  const nearbyGaps = useGameStore((state) => state.nearbyGaps);
  const currentHoleNumber = useGameStore((state) => state.currentHoleNumber);
  const holes = useGameStore((state) => state.holes);

  const currentHole = holes[currentHoleNumber - 1];

  // Reanimated cloud drift and pulse animation
  const driftA = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.25);

  useEffect(() => {
    driftA.value = withRepeat(
      withTiming(15, { duration: 18000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    pulseScale.value = withRepeat(
      withTiming(1.25, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    pulseOpacity.value = withRepeat(
      withTiming(0.45, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedCloudProps = useAnimatedProps(() => ({
    transform: [{ translateX: driftA.value }],
  }));

  const animatedPulseProps = useAnimatedProps(() => ({
    r: 30 * pulseScale.value,
    opacity: pulseOpacity.value,
  }));

  const handleChaseGap = () => {
    setSkyMode('gap');
    setActiveTab('capture');
  };

  const handleOvercast = () => {
    setSkyMode('overcast');
    setActiveTab('capture');
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Header title="Gap Hunter" />
      <Text style={[typography.small, { color: colors.mute, marginBottom: 4 }]}>
        Live satellite gap radar and 9-hole celestial course for Western New York.
      </Text>

      {/* Golf Course Scorecard Widget */}
      <GolfScorecard compact />

      {/* Active Gap Alert Box */}
      <View
        style={[
          styles.alert,
          {
            backgroundColor: colors.panel,
            borderColor: colors.line,
            borderLeftColor: colors.gap,
          },
        ]}
      >
        <Text style={[typography.bodyBold, { color: colors.ink }]}>
          A gap is open near Hamburg — {currentHole.name}
        </Text>
        <Text style={[typography.caption, { color: colors.mute, marginTop: 2 }]}>
          Target: {currentHole.targetBody} (Par {currentHole.par}). About 25 minutes left.
        </Text>
      </View>

      {/* Cloud Radar Map */}
      <View
        style={[
          styles.mapContainer,
          {
            backgroundColor: colors.land,
            borderColor: colors.line,
          },
        ]}
      >
        <Svg viewBox="0 0 340 290" width="100%" height={260}>
          {/* Water Bodies */}
          <Path d="M0 0H340V42L214 72 192 106 0 252Z" fill={colors.water} />
          <SvgText fill={colors.ink} fontSize={11} x="14" y="22" opacity={0.8}>
            Lake Ontario & Lake Erie
          </SvgText>

          {/* Drifting Clouds */}
          <AnimatedG animatedProps={animatedCloudProps}>
            <G fill={colors.cloud} opacity={0.65}>
              <Ellipse cx={230} cy={120} rx={100} ry={46} />
              <Ellipse cx={90} cy={250} rx={90} ry={38} />
              <Ellipse cx={270} cy={200} rx={70} ry={34} />
              <Ellipse cx={170} cy={60} rx={80} ry={22} />
              <Ellipse cx={60} cy={150} rx={46} ry={26} />
            </G>
          </AnimatedG>

          {/* Pulsating Gap Target 1: Hamburg */}
          <AnimatedCircle
            cx={120}
            cy={196}
            fill={colors.gap}
            animatedProps={animatedPulseProps}
          />
          <Circle
            cx={120}
            cy={196}
            r={28}
            stroke={colors.gap}
            strokeWidth={2.5}
            strokeDasharray="5,4"
            fill="none"
          />
          <SvgText fill={colors.ink} fontSize={11} fontWeight="bold" x="78" y="244">
            Hamburg gap (Open)
          </SvgText>

          {/* Forecast Gap Target 2: Beaver Meadow */}
          <Circle
            cx={262}
            cy={248}
            r={22}
            stroke={colors.gap}
            strokeWidth={2}
            strokeDasharray="5,4"
            fill="none"
            opacity={0.6}
          />
          <SvgText fill={colors.ink} fontSize={10} x="204" y="282">
            Beaver Meadow, soon
          </SvgText>

          {/* Current Player GPS Marker: Buffalo */}
          <Circle cx={198} cy={104} r={6} fill={colors.amber} />
          <SvgText fill={colors.ink} fontSize={11} fontWeight="600" x="208" y="102">
            You, Buffalo
          </SvgText>
        </Svg>
      </View>

      {/* Gap Opportunities List */}
      <View style={styles.gapList}>
        {nearbyGaps.map((gap, index) => (
          <View
            key={gap.id}
            style={[
              styles.gapRow,
              { borderTopColor: colors.line },
              index === 0 && { borderTopWidth: 0 },
            ]}
          >
            <View style={styles.gapInfo}>
              <Text style={[typography.bodyBold, { color: colors.ink }]}>{gap.name}</Text>
              <Text style={[typography.small, { color: colors.mute }]}>
                {gap.description}
              </Text>
            </View>
            <Text style={[typography.caption, { color: colors.ink, fontWeight: '700' }]}>
              {gap.distanceMiles} mi
            </Text>
          </View>
        ))}
      </View>

      {/* Call to Actions */}
      <TouchableOpacity
        style={[styles.btnPrimary, { backgroundColor: colors.gap }]}
        onPress={handleChaseGap}
        activeOpacity={0.85}
      >
        <Text style={[typography.button, { color: '#041018' }]}>
          Play Hole {currentHole.holeNumber}: Chase the gap
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btnSecondary, { backgroundColor: colors.chip }]}
        onPress={handleOvercast}
        activeOpacity={0.85}
      >
        <Text style={[typography.button, { color: colors.ink }]}>
          Fully overcast? Play from indoors
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 18,
    paddingBottom: 32,
  },
  alert: {
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 5,
    padding: 12,
    marginVertical: 10,
  },
  mapContainer: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gapList: {
    marginTop: 12,
  },
  gapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  gapInfo: {
    flex: 1,
  },
  btnPrimary: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  btnSecondary: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
});
