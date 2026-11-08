import { useState, useEffect, useMemo } from 'react';
import { getVisibleCelestialBodies, VisibleCelestialBody, mapAltAzToPatch } from '../services/astronomy';

interface UseEphemerisOptions {
  latitude?: number;
  longitude?: number;
  refreshIntervalMs?: number;
}

export const useEphemeris = (options: UseEphemerisOptions = {}) => {
  const {
    latitude = 42.8864, // Default Buffalo, NY
    longitude = -78.8784,
    refreshIntervalMs = 60000, // 1 minute
  } = options;

  const [visibleBodies, setVisibleBodies] = useState<VisibleCelestialBody[]>([]);
  const [lastCalculatedAt, setLastCalculatedAt] = useState<Date>(new Date());

  const updateEphemeris = () => {
    const now = new Date();
    const bodies = getVisibleCelestialBodies(latitude, longitude, now, 5);
    setVisibleBodies(bodies);
    setLastCalculatedAt(now);
  };

  useEffect(() => {
    updateEphemeris();
    const timer = setInterval(updateEphemeris, refreshIntervalMs);
    return () => clearInterval(timer);
  }, [latitude, longitude, refreshIntervalMs]);

  // Primary celestial target (default Jupiter, or brightest visible planet/star)
  const primaryTarget = useMemo<VisibleCelestialBody>(() => {
    const jupiter = visibleBodies.find((b) => b.name === 'Jupiter');
    if (jupiter) return jupiter;
    if (visibleBodies.length > 0) return visibleBodies[0];

    // Fallback baseline Jupiter
    const mapping = mapAltAzToPatch(118, 24);
    return {
      name: 'Jupiter',
      bodyKey: 'jupiter',
      azimuth: 118,
      altitude: 24,
      magnitude: -2.4,
      constellation: 'Taurus',
      isPlanet: true,
      isStar: false,
      isMoon: false,
      patchKey: mapping.patchKey,
      col: mapping.col,
      row: mapping.row,
      directionLabel: mapping.directionLabel,
    };
  }, [visibleBodies]);

  return {
    visibleBodies,
    primaryTarget,
    lastCalculatedAt,
    refresh: updateEphemeris,
    mapAltAzToPatch,
  };
};
