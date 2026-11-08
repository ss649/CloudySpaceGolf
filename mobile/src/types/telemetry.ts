export interface OrientationReading {
  heading: number; // Azimuth: 0 to 360 degrees (Compass)
  tilt: number;    // Altitude / Pitch: 0 to 90 degrees above horizon
  roll: number;    // Device roll angle in degrees
  timestamp: number;
}

export interface CelestialCoordinates {
  azimuth: number;  // 0 to 360 degrees
  altitude: number; // -90 to 90 degrees
  name: string;
  magnitude?: number;
}

export interface TargetAlignment {
  target: CelestialCoordinates;
  current: {
    heading: number;
    tilt: number;
  };
  deltaAzimuth: number; // target.azimuth - current.heading (normalized)
  deltaAltitude: number; // target.altitude - current.tilt
  angularOffset: number; // hypot(deltaAz, deltaAlt)
  isLocked: boolean; // offset <= tolerance
  screenOffset: {
    dx: number;
    dy: number;
  };
}
