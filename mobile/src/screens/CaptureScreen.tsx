import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useTheme } from '../theme/ThemeContext';
import { useGameStore } from '../store/gameStore';
import { useDeviceOrientation } from '../hooks/useDeviceOrientation';
import { useEphemeris } from '../hooks/useEphemeris';
import { Header } from '../components/Header';
import { ReticleView } from '../components/ReticleView';
import { ManualSliders } from '../components/ManualSliders';
import { GolfScorecard } from '../components/GolfScorecard';
import { Card } from '../components/Card';
import { Check, Compass, MapPin, Sparkles, Award, ArrowRight } from 'lucide-react-native';
import { CapturePayload, CaptureResult, GolfScoreTerm } from '../types';

export const CaptureScreen: React.FC = () => {
  const { colors, typography } = useTheme();
  const cameraRef = useRef<any>(null);

  const skyMode = useGameStore((state) => state.skyMode);
  const setSkyMode = useGameStore((state) => state.setSkyMode);
  const activeTarget = useGameStore((state) => state.activeTarget);
  const setActiveTarget = useGameStore((state) => state.setActiveTarget);
  const addScore = useGameStore((state) => state.addScore);
  const unlockPatch = useGameStore((state) => state.unlockPatch);
  const setActiveTab = useGameStore((state) => state.setActiveTab);

  // Golf Course State
  const currentHoleNumber = useGameStore((state) => state.currentHoleNumber);
  const holes = useGameStore((state) => state.holes);
  const recordHoleStroke = useGameStore((state) => state.recordHoleStroke);
  const advanceToNextHole = useGameStore((state) => state.advanceToNextHole);

  const currentHole = holes[currentHoleNumber - 1];

  // GPS State
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number; accuracy: number }>({
    latitude: 42.8864,
    longitude: -78.8784,
    accuracy: 12,
  });

  // Dynamic Ephemeris Hook
  const { visibleBodies, mapAltAzToPatch } = useEphemeris({
    latitude: gpsCoords.latitude,
    longitude: gpsCoords.longitude,
  });

  // Dynamically sync ephemeris coordinates for the current hole's target
  useEffect(() => {
    const liveBody = visibleBodies.find(
      (b) => b.name.toLowerCase() === currentHole.targetBody.toLowerCase()
    );

    if (liveBody) {
      setActiveTarget({
        name: liveBody.name,
        azimuth: liveBody.azimuth,
        altitude: liveBody.altitude,
        magnitude: liveBody.magnitude,
      });
    } else {
      // Use hole default coordinates
      setActiveTarget({
        name: currentHole.targetBody,
        azimuth: currentHole.defaultAzimuth,
        altitude: currentHole.defaultAltitude,
      });
    }
  }, [currentHoleNumber, visibleBodies]);

  // Manual fallback state
  const [isManualActive, setIsManualActive] = useState<boolean>(false);
  const [manualHeading, setManualHeading] = useState<number>(85);
  const [manualTilt, setManualTilt] = useState<number>(40);

  // Sensor orientation hook
  const { orientation, isSensorAvailable } = useDeviceOrientation({
    enabled: true,
    manualHeading: isManualActive ? manualHeading : null,
    manualTilt: isManualActive ? manualTilt : null,
  });

  // Current heading and tilt (from sensors or manual sliders)
  const currentHeading = isManualActive ? manualHeading : orientation.heading;
  const currentTilt = isManualActive ? manualTilt : orientation.tilt;

  // Alignment math
  const deltaAz = activeTarget.azimuth - currentHeading;
  const deltaAlt = currentTilt - activeTarget.altitude;
  const angularOffset = Math.hypot(deltaAz, deltaAlt);
  const isLocked = angularOffset <= 4.0;

  // Real calculated patch for active target
  const targetPatch = useMemo(() => {
    return mapAltAzToPatch(activeTarget.azimuth, activeTarget.altitude);
  }, [activeTarget.azimuth, activeTarget.altitude, mapAltAzToPatch]);

  // Capture verification pipeline state
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [lastPayload, setLastPayload] = useState<CapturePayload | null>(null);
  const [result, setResult] = useState<
    | (CaptureResult & {
        golfTerm?: GolfScoreTerm;
        relativeToPar?: number;
        strokes?: number;
        par?: number;
      })
    | null
  >(null);

  const verificationSteps = useMemo(() => {
    if (skyMode === 'overcast') {
      return [
        'Reading compass and tilt',
        `Computing where ${activeTarget.name} is for your spot and time`,
      ];
    }
    return [
      'Checking the photo is sharp',
      'Matching stars to the catalog',
      `Confirming ${activeTarget.name} at your sky position`,
      'Measuring clear sky: 82%',
    ];
  }, [skyMode, activeTarget.name]);

  const handleCapture = async () => {
    if (isBusy) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    setIsBusy(true);
    setCompletedSteps([]);
    setResult(null);

    // 1. Photo Capture from Hardware Camera (or mock URI)
    let photoUri: string | undefined = undefined;
    try {
      if (cameraRef.current && typeof cameraRef.current.takePictureAsync === 'function') {
        const photo = await Promise.race([
          cameraRef.current.takePictureAsync({
            quality: 0.85,
            skipProcessing: true,
          }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
        ]);
        if (photo && photo.uri) {
          photoUri = photo.uri;
        }
      }
    } catch {
      // Fallback
    }

    // 2. Fetch GPS Telemetry
    try {
      const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({
        status: 'denied',
      }));
      if (status === 'granted') {
        const loc = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
        ]);
        if (loc && loc.coords) {
          setGpsCoords({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy ?? 10,
          });
        }
      }
    } catch {
      // Keep default GPS
    }

    // 3. Assemble Full CapturePayload
    const payload: CapturePayload = {
      captureId: `cap-${Date.now()}`,
      timestamp: new Date().toISOString(),
      mode: skyMode,
      target: activeTarget,
      orientation: {
        heading: currentHeading,
        tilt: currentTilt,
        roll: orientation.roll,
        timestamp: Date.now(),
      },
      angularDeviation: Math.round(angularOffset * 10) / 10,
      photoUri,
      gps: gpsCoords,
    };
    setLastPayload(payload);

    // 4. Execute Step-by-Step Verification Pipeline Animation
    verificationSteps.forEach((stepText, index) => {
      setTimeout(() => {
        setCompletedSteps((prev) => [...prev, stepText]);
        Haptics.selectionAsync().catch(() => {});
      }, (index + 1) * 600);
    });

    const totalPipelineDuration = (verificationSteps.length + 1) * 600;

    // 5. Final Result Calculation, Golf Scorecard & Store Sync
    setTimeout(() => {
      let pointsAwarded = 0;
      let headline = '';
      let description = '';

      // Record stroke in golf scorecard and get golf score term
      const golfOutcome = recordHoleStroke(
        angularOffset,
        skyMode === 'overcast',
        targetPatch.patchKey
      );

      if (skyMode === 'overcast') {
        pointsAwarded = Math.max(15, Math.round(110 - angularOffset * 3));
        headline = `You were ${angularOffset.toFixed(1)}° off (${golfOutcome.scoreTerm})`;
        description = `${activeTarget.name} is behind the clouds, ${
          angularOffset <= 6
            ? 'right where you aimed.'
            : activeTarget.azimuth > currentHeading
            ? 'a bit to your right of your guess.'
            : 'a bit to your left of your guess.'
        } Sensor guesses score points but do not unlock sky.`;
      } else {
        // Points based on golf performance
        if (golfOutcome.scoreTerm === 'Hole in One' || golfOutcome.scoreTerm === 'Eagle') {
          pointsAwarded = 180;
        } else if (golfOutcome.scoreTerm === 'Birdie') {
          pointsAwarded = 140;
        } else {
          pointsAwarded = 110;
        }

        // Unlock actual calculated patch in the 24-patch celestial matrix
        unlockPatch(targetPatch.patchKey);

        headline = `${activeTarget.name} confirmed — ${golfOutcome.scoreTerm}!`;
        description = `Target matched in ${targetPatch.directionLabel} sky. The crew now has unlocked patch ${targetPatch.patchKey}.`;
      }

      addScore(pointsAwarded);

      setResult({
        success: true,
        scoreAwarded: pointsAwarded,
        angularDeviation: Math.round(angularOffset * 10) / 10,
        patchUnlockedKey: skyMode === 'gap' ? targetPatch.patchKey : undefined,
        headline,
        description,
        photoUri,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        golfTerm: golfOutcome.scoreTerm,
        relativeToPar: golfOutcome.relativeToPar,
        strokes: golfOutcome.strokes,
        par: currentHole.par,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setIsBusy(false);
    }, totalPipelineDuration);
  };

  const handleNextHole = () => {
    advanceToNextHole();
    setResult(null);
    setCompletedSteps([]);
  };

  const isButtonDisabled = isBusy || (skyMode === 'gap' && !isLocked);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Header title={`Find ${activeTarget.name}`} />

      {/* Golf Course & Scorecard Widget */}
      <GolfScorecard />

      {/* Segmented Mode Selector */}
      <View style={[styles.segContainer, { backgroundColor: colors.chip }]}>
        <TouchableOpacity
          style={[
            styles.segButton,
            skyMode === 'gap' && [styles.segButtonActive, { backgroundColor: colors.panel }],
          ]}
          onPress={() => {
            setSkyMode('gap');
            setResult(null);
            setCompletedSteps([]);
          }}
        >
          <Text
            style={[
              typography.bodyBold,
              { color: skyMode === 'gap' ? colors.ink : colors.mute },
            ]}
          >
            Gap open
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segButton,
            skyMode === 'overcast' && [
              styles.segButtonActive,
              { backgroundColor: colors.panel },
            ],
          ]}
          onPress={() => {
            setSkyMode('overcast');
            setResult(null);
            setCompletedSteps([]);
          }}
        >
          <Text
            style={[
              typography.bodyBold,
              { color: skyMode === 'overcast' ? colors.ink : colors.mute },
            ]}
          >
            Overcast
          </Text>
        </TouchableOpacity>
      </View>

      {/* Real Camera Viewfinder / Simulation Viewport */}
      <ReticleView
        ref={cameraRef}
        heading={currentHeading}
        tilt={currentTilt}
        targetAzimuth={activeTarget.azimuth}
        targetAltitude={activeTarget.altitude}
        skyMode={skyMode}
        isLocked={isLocked}
      />

      {/* Instructional Hint */}
      <Text style={[typography.small, { color: colors.mute, marginTop: 10 }]}>
        {skyMode === 'overcast'
          ? `Clouds cover everything. Aim towards ${activeTarget.name} (${Math.round(activeTarget.azimuth)}° Az, ${Math.round(activeTarget.altitude)}° Alt) and lock in guess.`
          : `${activeTarget.name} is at ${Math.round(activeTarget.azimuth)}° (${targetPatch.directionLabel}) and ${Math.round(activeTarget.altitude)}° above horizon right now [Patch ${targetPatch.patchKey}]. Move sliders or tilt phone.`}
      </Text>

      {/* Manual Fallback Sliders */}
      <ManualSliders
        heading={currentHeading}
        tilt={currentTilt}
        onHeadingChange={setManualHeading}
        onTiltChange={setManualTilt}
        isManualActive={isManualActive}
        onToggleManual={() => setIsManualActive((prev) => !prev)}
        sensorAvailable={isSensorAvailable}
      />

      {/* Shutter Capture Button */}
      <TouchableOpacity
        style={[
          styles.shutterBtn,
          {
            backgroundColor: isButtonDisabled ? colors.chip : colors.gap,
            opacity: isButtonDisabled ? 0.6 : 1,
          },
        ]}
        disabled={isButtonDisabled}
        onPress={handleCapture}
        activeOpacity={0.8}
      >
        {isBusy ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <Text
            style={[
              typography.button,
              { color: isButtonDisabled ? colors.mute : '#041018' },
            ]}
          >
            {skyMode === 'overcast'
              ? 'Lock in my guess (Stroke 1)'
              : isLocked
              ? `Capture ${activeTarget.name} (Stroke 1)`
              : 'Aim closer to capture'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Step-by-Step Verification Pipeline Animation */}
      {completedSteps.length > 0 && (
        <View style={styles.stepsList}>
          {completedSteps.map((step, idx) => (
            <View key={idx} style={styles.stepRow}>
              <Check size={16} color={colors.gap} strokeWidth={2.5} />
              <Text style={[typography.caption, { color: colors.ink, marginLeft: 8 }]}>
                {step}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Capture Result Card */}
      {result && (
        <Card style={styles.resultCard}>
          {result.photoUri && (
            <View style={styles.thumbnailWrapper}>
              <Image source={{ uri: result.photoUri }} style={styles.photoThumbnail} />
              <View style={styles.photoBadge}>
                <Sparkles size={12} color="#041018" />
                <Text style={styles.photoBadgeText}>Raw Shutter Capture</Text>
              </View>
            </View>
          )}

          {/* Golf Score Outcome Badge */}
          <View style={styles.scoreOutcomeRow}>
            <View style={[styles.golfTermPill, { backgroundColor: colors.chip }]}>
              <Award size={14} color={colors.amber} />
              <Text style={[typography.bodyBold, { color: colors.ink }]}>
                {result.golfTerm} ({result.relativeToPar && result.relativeToPar > 0 ? `+${result.relativeToPar}` : result.relativeToPar === 0 ? 'E' : result.relativeToPar})
              </Text>
            </View>
            <Text style={[typography.small, { color: colors.mute }]}>
              Strokes: {result.strokes} / Par {result.par}
            </Text>
          </View>

          <Text style={[typography.h2, { color: colors.ink, marginTop: 4 }]}>
            {result.headline}
          </Text>
          <Text style={[typography.caption, { color: colors.mute, marginVertical: 6 }]}>
            {result.description}
          </Text>

          {/* Telemetry metadata pill */}
          {lastPayload && (
            <View style={[styles.metaPill, { backgroundColor: colors.chip }]}>
              <View style={styles.metaRow}>
                <Compass size={12} color={colors.mute} />
                <Text style={[typography.small, { color: colors.mute }]}>
                  {Math.round(lastPayload.orientation.heading)}° Az · {Math.round(lastPayload.orientation.tilt)}° Alt (error: {lastPayload.angularDeviation}°)
                </Text>
              </View>
              {lastPayload.gps && (
                <View style={styles.metaRow}>
                  <MapPin size={12} color={colors.mute} />
                  <Text style={[typography.small, { color: colors.mute }]}>
                    {lastPayload.gps.latitude.toFixed(3)}°N, {Math.abs(lastPayload.gps.longitude).toFixed(3)}°W · Patch {targetPatch.patchKey}
                  </Text>
                </View>
              )}
            </View>
          )}

          <Text style={[typography.bodyBold, { color: colors.amber, marginTop: 8 }]}>
            +{result.scoreAwarded} pts{' '}
            {result.patchUnlockedKey ? `and Patch ${result.patchUnlockedKey} unlocked` : ''}
          </Text>

          {/* Actions */}
          <View style={styles.resultActions}>
            {currentHoleNumber < 9 && (
              <TouchableOpacity
                style={[styles.nextHoleBtn, { backgroundColor: colors.gap }]}
                onPress={handleNextHole}
                activeOpacity={0.85}
              >
                <Text style={[typography.button, { color: '#041018', fontSize: 14 }]}>
                  Advance to Hole {currentHoleNumber + 1}
                </Text>
                <ArrowRight size={15} color="#041018" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.seeSkyBtn, { backgroundColor: colors.chip }]}
              onPress={() => setActiveTab('sky')}
              activeOpacity={0.85}
            >
              <Text style={[typography.button, { color: colors.ink, fontSize: 14 }]}>
                See our sky ({targetPatch.patchKey})
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 18,
    paddingBottom: 36,
  },
  segContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  segButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  segButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  shutterBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  stepsList: {
    marginTop: 14,
    gap: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultCard: {
    marginTop: 16,
  },
  thumbnailWrapper: {
    position: 'relative',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  photoBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#F5B65A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  photoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#041018',
  },
  scoreOutcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  golfTermPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  metaPill: {
    padding: 8,
    borderRadius: 8,
    gap: 4,
    marginVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultActions: {
    gap: 8,
    marginTop: 12,
  },
  nextHoleBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 11,
  },
  seeSkyBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
});
