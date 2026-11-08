import React, { forwardRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { SkyMode } from '../types';

interface ReticleViewProps {
  heading: number;
  tilt: number;
  targetAzimuth: number;
  targetAltitude: number;
  skyMode: SkyMode;
  isLocked: boolean;
  onCameraReady?: () => void;
}

// Pseudo-random star distribution for simulated sky
const STAR_COUNT = 38;
const STARS = Array.from({ length: STAR_COUNT }).map((_, i) => ({
  id: i,
  left: `${((i * 37) % 94) + 3}%`,
  top: `${((i * 53) % 90) + 5}%`,
  size: (i % 3) + 1.2,
  opacity: 0.35 + (i % 5) * 0.15,
}));

export const ReticleView = forwardRef<any, ReticleViewProps>(
  (
    {
      heading,
      tilt,
      targetAzimuth,
      targetAltitude,
      skyMode,
      isLocked,
      onCameraReady,
    },
    ref
  ) => {
    const { colors, typography } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [forceSimulatedMode, setForceSimulatedMode] = useState<boolean>(false);

    // Position deltas in pixels (3.2 px per degree)
    const dx = (targetAzimuth - heading) * 3.2;
    const dy = (tilt - targetAltitude) * 3.2;

    const isOvercast = skyMode === 'overcast';
    const isCameraUsable =
      !forceSimulatedMode &&
      permission?.granted &&
      Platform.OS !== 'web';

    return (
      <View
        style={[
          styles.viewport,
          {
            backgroundColor: colors.sky,
            borderColor: colors.line,
          },
        ]}
      >
        {/* Real Live Camera Feed */}
        {isCameraUsable ? (
          <CameraView
            ref={ref}
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onCameraReady={onCameraReady}
          />
        ) : (
          /* Fallback Star Field (Simulated Night Sky) */
          !isOvercast &&
          STARS.map((star) => (
            <View
              key={star.id}
              style={[
                styles.star,
                {
                  left: star.left as any,
                  top: star.top as any,
                  width: star.size,
                  height: star.size,
                  opacity: star.opacity,
                },
              ]}
            />
          ))
        )}

        {/* Camera Permission Request Banner (if unprompted) */}
        {!permission?.granted && !forceSimulatedMode && Platform.OS !== 'web' && (
          <View style={styles.permissionOverlay}>
            <TouchableOpacity
              style={[styles.permBtn, { backgroundColor: colors.chip }]}
              onPress={requestPermission}
              activeOpacity={0.8}
            >
              <Camera size={14} color={colors.gap} />
              <Text style={[typography.small, { color: colors.ink, fontWeight: '600' }]}>
                Enable Camera
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Mode & Camera Simulation Toggle */}
        <View style={styles.topControls}>
          <TouchableOpacity
            style={[styles.iconPill, { backgroundColor: 'rgba(7, 13, 24, 0.65)' }]}
            onPress={() => setForceSimulatedMode((prev) => !prev)}
            activeOpacity={0.8}
            accessibilityLabel="Toggle Camera vs Simulation"
          >
            {isCameraUsable ? (
              <Camera size={13} color={colors.gap} />
            ) : (
              <Eye size={13} color={colors.amber} />
            )}
            <Text style={[typography.small, styles.toggleText]}>
              {isCameraUsable ? 'Live Cam' : 'Simulated'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Celestial Targets (Jupiter & Mars) */}
        {!isOvercast && (
          <>
            {/* Mars target marker */}
            <View
              style={[
                styles.marsTarget,
                {
                  transform: [{ translateX: dx + 8 }, { translateY: dy - 7 }],
                },
              ]}
            />
            {/* Jupiter target marker */}
            <View
              style={[
                styles.jupiterTarget,
                {
                  transform: [{ translateX: dx }, { translateY: dy }],
                },
              ]}
            />
          </>
        )}

        {/* Cloud Veil for Overcast Mode */}
        {isOvercast && (
          <View style={styles.cloudVeil}>
            <Text style={[typography.caption, styles.veilLabel]}>
              Heavy Cloud Deck Overhead — Blind Sensor Navigation
            </Text>
            <Text style={[typography.small, styles.veilSublabel]}>
              Point phone towards target coordinates and lock in guess
            </Text>
          </View>
        )}

        {/* Reticle Crosshair */}
        <View
          style={[
            styles.crosshair,
            isLocked && !isOvercast && styles.crosshairLocked,
            isLocked && !isOvercast && { borderColor: colors.amber },
          ]}
        >
          {isLocked && !isOvercast && (
            <View style={[styles.lockedCenterDot, { backgroundColor: colors.amber }]} />
          )}
        </View>

        {/* HUD Telemetry Bar */}
        <View style={styles.hud}>
          <Text style={[typography.hud, styles.hudText]}>
            Heading {Math.round(heading)}°
          </Text>
          {isLocked && !isOvercast && (
            <Text style={[typography.hud, { color: colors.amber, fontWeight: '700' }]}>
              TARGET LOCKED
            </Text>
          )}
          <Text style={[typography.hud, styles.hudText]}>
            Tilt {Math.round(tilt)}°
          </Text>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  viewport: {
    position: 'relative',
    height: 250,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  star: {
    position: 'absolute',
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
  },
  permissionOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
  },
  permBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  topControls: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  iconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  toggleText: {
    color: '#DCE7F0',
    fontSize: 11,
    fontWeight: '600',
  },
  jupiterTarget: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F5B65A',
    shadowColor: '#F5B65A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 7,
    elevation: 8,
  },
  marsTarget: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E98A6B',
    shadowColor: '#E98A6B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
    elevation: 6,
  },
  crosshair: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairLocked: {
    borderWidth: 2.5,
    shadowColor: '#F5B65A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 10,
  },
  lockedCenterDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  cloudVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(60, 73, 88, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  veilLabel: {
    color: '#DCE7F0',
    textAlign: 'center',
    fontWeight: '600',
  },
  veilSublabel: {
    color: '#97A8BC',
    textAlign: 'center',
    marginTop: 4,
  },
  hud: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hudText: {
    color: '#D9E6F2',
  },
});
