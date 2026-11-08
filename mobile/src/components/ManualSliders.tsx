import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTheme } from '../theme/ThemeContext';
import { Sliders, Compass } from 'lucide-react-native';

interface ManualSlidersProps {
  heading: number;
  tilt: number;
  onHeadingChange: (val: number) => void;
  onTiltChange: (val: number) => void;
  isManualActive: boolean;
  onToggleManual: () => void;
  sensorAvailable: boolean;
}

export const ManualSliders: React.FC<ManualSlidersProps> = ({
  heading,
  tilt,
  onHeadingChange,
  onTiltChange,
  isManualActive,
  onToggleManual,
  sensorAvailable,
}) => {
  const { colors, typography } = useTheme();

  return (
    <View style={styles.container}>
      {/* Mode Toggle Header */}
      <View style={styles.headerRow}>
        <Text style={[typography.caption, { color: colors.mute }]}>
          {isManualActive
            ? 'Manual controls (Move sliders as if turning your phone)'
            : sensorAvailable
            ? 'Live hardware IMU active'
            : 'Sensors unavailable — using manual controls'}
        </Text>
        <TouchableOpacity
          onPress={onToggleManual}
          style={[styles.modeToggle, { backgroundColor: colors.chip }]}
        >
          {isManualActive ? (
            <Compass size={14} color={colors.gap} />
          ) : (
            <Sliders size={14} color={colors.amber} />
          )}
          <Text style={[typography.small, { color: colors.ink, fontWeight: '600' }]}>
            {isManualActive ? 'Use Sensors' : 'Manual Sliders'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sliders Container (collapsible or dimmed if sensors active) */}
      <View style={[styles.sliderControls, !isManualActive && styles.dimmed]}>
        {/* Azimuth / Heading Slider */}
        <View style={styles.ctl}>
          <View style={styles.labelRow}>
            <Text style={[typography.body, { color: colors.mute }]}>Compass heading</Text>
            <Text style={[typography.hud, { color: colors.ink }]}>{Math.round(heading)}°</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={60}
            maximumValue={180}
            step={0.5}
            value={heading}
            onValueChange={onHeadingChange}
            minimumTrackTintColor={colors.gap}
            maximumTrackTintColor={colors.line}
            thumbTintColor={colors.gap}
            disabled={!isManualActive}
          />
        </View>

        {/* Altitude / Tilt Slider */}
        <View style={styles.ctl}>
          <View style={styles.labelRow}>
            <Text style={[typography.body, { color: colors.mute }]}>Tilt above horizon</Text>
            <Text style={[typography.hud, { color: colors.ink }]}>{Math.round(tilt)}°</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={70}
            step={0.5}
            value={tilt}
            onValueChange={onTiltChange}
            minimumTrackTintColor={colors.gap}
            maximumTrackTintColor={colors.line}
            thumbTintColor={colors.gap}
            disabled={!isManualActive}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  sliderControls: {
    gap: 8,
  },
  dimmed: {
    opacity: 0.5,
  },
  ctl: {
    marginVertical: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  slider: {
    width: '100%',
    height: 36,
  },
});
