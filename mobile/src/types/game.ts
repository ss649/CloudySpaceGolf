export interface GapItem {
  id: string;
  name: string;
  description: string;
  distanceMiles: number;
  openEtaMinutes: number;
  closesEtaMinutes?: number;
  isOpenNow: boolean;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface SkyPatch {
  id: string; // e.g. "col-row" e.g. "2-1"
  col: number; // 0 to 7 (8 azimuthal columns: N, NE, E, SE, S, SW, W, NW)
  row: number; // 0 to 2 (0: high, 1: mid, 2: low)
  unlocked: boolean;
  unlockedAt?: string;
  unlockedBy?: string;
  targetCaptured?: string;
}

export interface CrewReport {
  id: string;
  author: string;
  avatarInitial: string;
  location: string;
  description: string;
  cloudCoveragePercent: number;
  timestampMinutesAgo: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  isCurrentUser: boolean;
}

export type GolfScoreTerm =
  | 'Hole in One'
  | 'Eagle'
  | 'Birdie'
  | 'Par'
  | 'Bogey'
  | 'Double Bogey';

export interface GolfHole {
  holeNumber: number; // 1 to 9
  name: string;
  targetBody: string;
  par: number; // 3 or 4
  description: string;
  defaultAzimuth: number;
  defaultAltitude: number;
  strokes: number;
  completed: boolean;
  scoreTerm?: GolfScoreTerm;
  relativeToPar?: number; // e.g. -2, -1, 0, +1
  unlockedPatchKey?: string;
}

export interface GolfScorecard {
  currentHoleNumber: number;
  totalStrokes: number;
  totalRelativeToPar: number;
  holes: GolfHole[];
}
