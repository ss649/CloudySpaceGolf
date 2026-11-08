import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Magnetometer, Accelerometer } from 'expo-sensors';
import { OrientationReading } from '../types';

interface UseDeviceOrientationOptions {
  enabled?: boolean;
  updateIntervalMs?: number;
  smoothingFactor?: number; // 0 (no smoothing) to 0.95 (heavy smoothing)
  manualHeading?: number | null;
  manualTilt?: number | null;
}

export const useDeviceOrientation = (options: UseDeviceOrientationOptions = {}) => {
  const {
    enabled = true,
    updateIntervalMs = 50, // 20 Hz
    smoothingFactor = 0.75, // responsive yet jitter-free
    manualHeading = null,
    manualTilt = null,
  } = options;

  const [orientation, setOrientation] = useState<OrientationReading>({
    heading: manualHeading ?? 85,
    tilt: manualTilt ?? 40,
    roll: 0,
    timestamp: Date.now(),
  });

  const [isSensorAvailable, setIsSensorAvailable] = useState<boolean>(false);

  // EMA state refs to handle 360° circular wraparound
  const smoothedCosRef = useRef<number>(Math.cos((85 * Math.PI) / 180));
  const smoothedSinRef = useRef<number>(Math.sin((85 * Math.PI) / 180));
  const smoothedTiltRef = useRef<number>(40);
  const smoothedRollRef = useRef<number>(0);

  // When manual values are provided, override
  useEffect(() => {
    if (manualHeading !== null || manualTilt !== null) {
      setOrientation((prev) => ({
        heading: manualHeading !== null ? manualHeading : prev.heading,
        tilt: manualTilt !== null ? manualTilt : prev.tilt,
        roll: 0,
        timestamp: Date.now(),
      }));
    }
  }, [manualHeading, manualTilt]);

  useEffect(() => {
    // If manual override is fully set, don't listen to hardware
    if (manualHeading !== null && manualTilt !== null) {
      return;
    }

    if (!enabled) return;

    let magSubscription: { remove: () => void } | null = null;
    let accelSubscription: { remove: () => void } | null = null;
    let isMounted = true;

    async function setupSensors() {
      try {
        const [hasMag, hasAccel] = await Promise.all([
          Magnetometer.isAvailableAsync().catch(() => false),
          Accelerometer.isAvailableAsync().catch(() => false),
        ]);

        if (!isMounted) return;

        if (!hasMag && !hasAccel) {
          setIsSensorAvailable(false);
          return;
        }

        setIsSensorAvailable(true);

        Magnetometer.setUpdateInterval(updateIntervalMs);
        Accelerometer.setUpdateInterval(updateIntervalMs);

        let latestHeading = manualHeading ?? 85;
        let latestTilt = manualTilt ?? 40;
        let latestRoll = 0;

        // Magnetometer listener for Compass Heading
        magSubscription = Magnetometer.addListener((data) => {
          if (manualHeading !== null) return;

          const { x, y } = data;
          let angleRad = Math.atan2(-x, y); // Heading relative to top of device
          let angleDeg = (angleRad * 180) / Math.PI;
          if (angleDeg < 0) {
            angleDeg += 360;
          }

          // Circular EMA smoothing via unit vectors
          const rad = (angleDeg * Math.PI) / 180;
          smoothedCosRef.current =
            smoothingFactor * smoothedCosRef.current + (1 - smoothingFactor) * Math.cos(rad);
          smoothedSinRef.current =
            smoothingFactor * smoothedSinRef.current + (1 - smoothingFactor) * Math.sin(rad);

          const smoothedRad = Math.atan2(smoothedSinRef.current, smoothedCosRef.current);
          let smoothedDeg = (smoothedRad * 180) / Math.PI;
          if (smoothedDeg < 0) smoothedDeg += 360;

          latestHeading = Math.round(smoothedDeg * 10) / 10;

          setOrientation({
            heading: latestHeading,
            tilt: latestTilt,
            roll: latestRoll,
            timestamp: Date.now(),
          });
        });

        // Accelerometer listener for Pitch/Tilt above horizon
        accelSubscription = Accelerometer.addListener((data) => {
          if (manualTilt !== null) return;

          const { x, y, z } = data;
          // When holding phone upright looking at horizon: y ≈ -1, z ≈ 0 -> Tilt ≈ 0°
          // When angling phone up to zenith: z ≈ -1, y ≈ 0 -> Tilt ≈ 90°
          const pitchRad = Math.atan2(-z, -y);
          let pitchDeg = (pitchRad * 180) / Math.PI;

          // Clamp tilt between 0° (horizontal) and 90° (zenith)
          pitchDeg = Math.max(0, Math.min(90, pitchDeg));

          // Scalar EMA smoothing for tilt
          smoothedTiltRef.current =
            smoothingFactor * smoothedTiltRef.current + (1 - smoothingFactor) * pitchDeg;

          latestTilt = Math.round(smoothedTiltRef.current * 10) / 10;

          // Roll calculation
          const rollRad = Math.atan2(x, -y);
          const rollDeg = (rollRad * 180) / Math.PI;
          smoothedRollRef.current =
            smoothingFactor * smoothedRollRef.current + (1 - smoothingFactor) * rollDeg;
          latestRoll = Math.round(smoothedRollRef.current * 10) / 10;

          setOrientation({
            heading: latestHeading,
            tilt: latestTilt,
            roll: latestRoll,
            timestamp: Date.now(),
          });
        });
      } catch (e) {
        if (isMounted) setIsSensorAvailable(false);
      }
    }

    setupSensors();

    return () => {
      isMounted = false;
      magSubscription?.remove();
      accelSubscription?.remove();
    };
  }, [enabled, updateIntervalMs, smoothingFactor, manualHeading, manualTilt]);

  return {
    orientation,
    isSensorAvailable,
  };
};
