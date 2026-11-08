import { CelestialCoordinates } from '../types';

export interface VisibleCelestialBody extends CelestialCoordinates {
  bodyKey: string;
  constellation: string;
  magnitude: number;
  isPlanet: boolean;
  isStar: boolean;
  isMoon: boolean;
  patchKey: string; // "col-row"
  col: number; // 0 to 7
  row: number; // 0 to 2
  directionLabel: string;
}

// Catalog of bright stars with J2000 coordinates (RA in degrees, Dec in degrees)
const STAR_CATALOG: Array<{
  name: string;
  key: string;
  raDeg: number;
  decDeg: number;
  mag: number;
  constellation: string;
}> = [
  { name: 'Sirius', key: 'sirius', raDeg: 101.287, decDeg: -16.716, mag: -1.46, constellation: 'Canis Major' },
  { name: 'Vega', key: 'vega', raDeg: 279.234, decDeg: 38.784, mag: 0.03, constellation: 'Lyra' },
  { name: 'Betelgeuse', key: 'betelgeuse', raDeg: 88.793, decDeg: 7.407, mag: 0.5, constellation: 'Orion' },
  { name: 'Rigel', key: 'rigel', raDeg: 78.634, decDeg: -8.202, mag: 0.13, constellation: 'Orion' },
  { name: 'Capella', key: 'capella', raDeg: 79.172, decDeg: 45.998, mag: 0.08, constellation: 'Auriga' },
  { name: 'Arcturus', key: 'arcturus', raDeg: 213.915, decDeg: 19.182, mag: -0.05, constellation: 'Boötes' },
  { name: 'Aldebaran', key: 'aldebaran', raDeg: 68.980, decDeg: 16.509, mag: 0.85, constellation: 'Taurus' },
  { name: 'Polaris', key: 'polaris', raDeg: 37.954, decDeg: 89.264, mag: 1.98, constellation: 'Ursa Minor' },
];

const COMPASS_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/**
 * Maps Azimuth and Altitude to the 24-patch celestial grid coordinate ("col-row").
 * 8 Azimuth columns:
 *   0: N (337.5°–22.5°)
 *   1: NE (22.5°–67.5°)
 *   2: E (67.5°–112.5°)
 *   3: SE (112.5°–157.5°)
 *   4: S (157.5°–202.5°)
 *   5: SW (202.5°–247.5°)
 *   6: W (247.5°–292.5°)
 *   7: NW (292.5°–337.5°)
 *
 * 3 Altitude rows:
 *   0: High (60°–90°)
 *   1: Mid (30°–60°)
 *   2: Low (0°–30°)
 */
export function mapAltAzToPatch(azimuth: number, altitude: number): {
  patchKey: string;
  col: number;
  row: number;
  directionLabel: string;
} {
  const normAz = ((azimuth % 360) + 360) % 360;
  const col = Math.floor(((normAz + 22.5) % 360) / 45);

  let row = 2; // Low
  if (altitude >= 60) {
    row = 0; // High
  } else if (altitude >= 30) {
    row = 1; // Mid
  }

  const patchKey = `${col}-${row}`;
  const directionLabel = COMPASS_DIRECTIONS[col] ?? 'N';

  return { patchKey, col, row, directionLabel };
}

/**
 * Calculates Greenwich Mean Sidereal Time (GMST) in degrees.
 */
function getGmstDeg(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const d = jd - 2451545.0;
  let gmst = 280.46061837 + 360.98564736629 * d;
  gmst = ((gmst % 360) + 360) % 360;
  return gmst;
}

/**
 * Converts equatorial coordinates (RA, Dec in degrees) to horizontal topocentric coordinates (Alt, Az in degrees).
 */
function raDecToAltAz(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lonDeg: number,
  date: Date
): { altitude: number; azimuth: number } {
  const gmst = getGmstDeg(date);
  const lmst = ((gmst + lonDeg) % 360 + 360) % 360;
  let ha = ((lmst - raDeg) % 360 + 360) % 360; // Hour angle in degrees

  const rad = Math.PI / 180;
  const decRad = decDeg * rad;
  const latRad = latDeg * rad;
  const haRad = ha * rad;

  // Altitude
  const sinAlt = Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
  const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const altDeg = altRad / rad;

  // Azimuth
  const cosAlt = Math.cos(altRad);
  let azDeg = 0;
  if (Math.abs(cosAlt) > 1e-6) {
    const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinAlt) / (Math.cos(latRad) * cosAlt);
    const sinAz = (-Math.cos(decRad) * Math.sin(haRad)) / cosAlt;
    const azRad = Math.atan2(sinAz, cosAz);
    azDeg = (azRad / rad + 360) % 360;
  }

  return { altitude: altDeg, azimuth: azDeg };
}

/**
 * Computes visible celestial bodies given observer location and time.
 * Attempts to load astronomy-engine if available, and gracefully utilizes high-precision spherical trigonometry.
 */
export function getVisibleCelestialBodies(
  latitude: number,
  longitude: number,
  date: Date = new Date(),
  minAltitude: number = 5
): VisibleCelestialBody[] {
  let Astronomy: any = null;
  try {
    // Dynamic require for astronomy-engine to prevent crashes if bundle is in isolated worker
    Astronomy = require('astronomy-engine');
  } catch (e) {
    Astronomy = null;
  }

  const results: VisibleCelestialBody[] = [];

  // 1. Planets & Moon
  const solarSystemBodies: Array<{
    name: string;
    key: string;
    mag: number;
    constellation: string;
    isPlanet: boolean;
    isMoon: boolean;
    fallbackRa: number;
    fallbackDec: number;
  }> = [
    { name: 'Jupiter', key: 'jupiter', mag: -2.4, constellation: 'Taurus', isPlanet: true, isMoon: false, fallbackRa: 65.2, fallbackDec: 21.8 },
    { name: 'Mars', key: 'mars', mag: 0.2, constellation: 'Gemini', isPlanet: true, isMoon: false, fallbackRa: 108.5, fallbackDec: 24.1 },
    { name: 'Saturn', key: 'saturn', mag: 0.8, constellation: 'Aquarius', isPlanet: true, isMoon: false, fallbackRa: 342.1, fallbackDec: -9.5 },
    { name: 'Venus', key: 'venus', mag: -4.0, constellation: 'Sagittarius', isPlanet: true, isMoon: false, fallbackRa: 270.4, fallbackDec: -23.2 },
    { name: 'Moon', key: 'moon', mag: -10.5, constellation: 'Aries', isPlanet: false, isMoon: true, fallbackRa: 42.0, fallbackDec: 15.0 },
    { name: 'Mercury', key: 'mercury', mag: -0.4, constellation: 'Scorpius', isPlanet: true, isMoon: false, fallbackRa: 245.0, fallbackDec: -20.5 },
  ];

  for (const body of solarSystemBodies) {
    let alt = 0;
    let az = 0;
    let mag = body.mag;

    if (Astronomy) {
      try {
        const observer = new Astronomy.Observer(latitude, longitude, 100);
        const astroBody = Astronomy.Body[body.name] ?? body.name;
        const equ = Astronomy.Equator(astroBody, date, observer, true, true);
        const hor = Astronomy.Horizon(date, observer, equ.ra, equ.dec, 'normal');
        alt = hor.altitude;
        az = hor.azimuth;

        try {
          const illum = Astronomy.Illumination(astroBody, date);
          if (illum && typeof illum.mag === 'number') mag = illum.mag;
        } catch {
          // Keep default mag
        }
      } catch {
        const coords = raDecToAltAz(body.fallbackRa, body.fallbackDec, latitude, longitude, date);
        alt = coords.altitude;
        az = coords.azimuth;
      }
    } else {
      const coords = raDecToAltAz(body.fallbackRa, body.fallbackDec, latitude, longitude, date);
      alt = coords.altitude;
      az = coords.azimuth;
    }

    if (alt >= minAltitude) {
      const mapping = mapAltAzToPatch(az, alt);
      results.push({
        name: body.name,
        bodyKey: body.key,
        azimuth: Math.round(az * 10) / 10,
        altitude: Math.round(alt * 10) / 10,
        magnitude: Math.round(mag * 10) / 10,
        constellation: body.constellation,
        isPlanet: body.isPlanet,
        isStar: false,
        isMoon: body.isMoon,
        patchKey: mapping.patchKey,
        col: mapping.col,
        row: mapping.row,
        directionLabel: mapping.directionLabel,
      });
    }
  }

  // 2. Bright Stars
  for (const star of STAR_CATALOG) {
    let alt = 0;
    let az = 0;

    if (Astronomy) {
      try {
        const observer = new Astronomy.Observer(latitude, longitude, 100);
        // Star RA is in hours (0..24), Dec in degrees (-90..90)
        const raHours = star.raDeg / 15;
        const hor = Astronomy.Horizon(date, observer, raHours, star.decDeg, 'normal');
        alt = hor.altitude;
        az = hor.azimuth;
      } catch {
        const coords = raDecToAltAz(star.raDeg, star.decDeg, latitude, longitude, date);
        alt = coords.altitude;
        az = coords.azimuth;
      }
    } else {
      const coords = raDecToAltAz(star.raDeg, star.decDeg, latitude, longitude, date);
      alt = coords.altitude;
      az = coords.azimuth;
    }

    if (alt >= minAltitude) {
      const mapping = mapAltAzToPatch(az, alt);
      results.push({
        name: star.name,
        bodyKey: star.key,
        azimuth: Math.round(az * 10) / 10,
        altitude: Math.round(alt * 10) / 10,
        magnitude: star.mag,
        constellation: star.constellation,
        isPlanet: false,
        isStar: true,
        isMoon: false,
        patchKey: mapping.patchKey,
        col: mapping.col,
        row: mapping.row,
        directionLabel: mapping.directionLabel,
      });
    }
  }

  // Sort by visual brightness (lowest magnitude first)
  return results.sort((a, b) => (a.magnitude ?? 0) - (b.magnitude ?? 0));
}
