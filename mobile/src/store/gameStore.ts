import { create } from 'zustand';
import {
  CelestialCoordinates,
  GapItem,
  CrewReport,
  LeaderboardEntry,
  SkyMode,
  GolfHole,
  GolfScoreTerm,
} from '../types';

interface GameState {
  score: number;
  activeTab: 'gaps' | 'capture' | 'sky' | 'crew';
  skyMode: SkyMode;
  unlockedPatches: Record<string, boolean>;
  newlyUnlockedKey: string | null;
  activeTarget: CelestialCoordinates;
  nearbyGaps: GapItem[];
  crewReports: CrewReport[];
  leaderboard: LeaderboardEntry[];

  // Golf Course & Scorecard
  currentHoleNumber: number; // 1 to 9
  holes: GolfHole[];
  totalStrokes: number;
  totalRelativeToPar: number;

  // Actions
  addScore: (points: number) => void;
  setActiveTab: (tab: 'gaps' | 'capture' | 'sky' | 'crew') => void;
  setSkyMode: (mode: SkyMode) => void;
  unlockPatch: (patchKey: string) => void;
  clearNewlyUnlockedKey: () => void;
  setActiveTarget: (target: CelestialCoordinates) => void;
  recordHoleStroke: (
    angularDeviation: number,
    isOvercast: boolean,
    unlockedPatchKey?: string
  ) => { scoreTerm: GolfScoreTerm; relativeToPar: number; strokes: number };
  advanceToNextHole: () => void;
  selectHole: (holeNumber: number) => void;
}

const INITIAL_OPEN_PATCHES: Record<string, boolean> = {
  '0-1': true,
  '3-1': true,
  '5-0': true,
  '6-2': true,
};

const INITIAL_GAPS: GapItem[] = [
  {
    id: 'hamburg',
    name: 'Hamburg gap',
    description: 'Open now, closes in about 25 min',
    distanceMiles: 14,
    openEtaMinutes: 0,
    closesEtaMinutes: 25,
    isOpenNow: true,
    coordinates: { latitude: 42.7159, longitude: -78.8295 },
  },
  {
    id: 'beaver-meadow',
    name: 'Beaver Meadow',
    description: 'Forecast to open in about 50 min',
    distanceMiles: 31,
    openEtaMinutes: 50,
    isOpenNow: false,
    coordinates: { latitude: 42.6712, longitude: -78.3985 },
  },
];

const INITIAL_CREW_REPORTS: CrewReport[] = [
  {
    id: '1',
    author: 'Maya in Orchard Park',
    avatarInitial: 'M',
    location: 'Orchard Park',
    description: 'Clear to the south, about 20% cloud',
    cloudCoveragePercent: 20,
    timestampMinutesAgo: 4,
  },
  {
    id: '2',
    author: 'Dev in Lockport',
    avatarInitial: 'D',
    location: 'Lockport',
    description: 'Snow band overhead, no gap',
    cloudCoveragePercent: 95,
    timestampMinutesAgo: 9,
  },
  {
    id: '3',
    author: 'Tess in Hamburg',
    avatarInitial: 'T',
    location: 'Hamburg',
    description: 'Gap is shrinking toward the lake',
    cloudCoveragePercent: 55,
    timestampMinutesAgo: 12,
  },
];

const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: 'Maya', points: 640, isCurrentUser: false },
  { rank: 2, name: 'Dev', points: 520, isCurrentUser: false },
  { rank: 3, name: 'Tess', points: 410, isCurrentUser: false },
  { rank: 4, name: 'You', points: 0, isCurrentUser: true },
  { rank: 5, name: 'Jordan', points: 260, isCurrentUser: false },
];

const INITIAL_HOLES: GolfHole[] = [
  {
    holeNumber: 1,
    name: 'Hole 1: Jupiter in the Gap',
    targetBody: 'Jupiter',
    par: 3,
    description: 'Chasing the gas giant through coastal cloud openings',
    defaultAzimuth: 118,
    defaultAltitude: 24,
    strokes: 0,
    completed: false,
    unlockedPatchKey: '2-1',
  },
  {
    holeNumber: 2,
    name: "Hole 2: Orion's Shoulder",
    targetBody: 'Betelgeuse',
    par: 4,
    description: 'Red supergiant in the constellation Orion',
    defaultAzimuth: 89,
    defaultAltitude: 32,
    strokes: 0,
    completed: false,
    unlockedPatchKey: '2-1',
  },
  {
    holeNumber: 3,
    name: 'Hole 3: The Dog Star',
    targetBody: 'Sirius',
    par: 3,
    description: 'The brightest star in the night sky',
    defaultAzimuth: 155,
    defaultAltitude: 18,
    strokes: 0,
    completed: false,
    unlockedPatchKey: '3-2',
  },
  {
    holeNumber: 4,
    name: 'Hole 4: The Red Planet',
    targetBody: 'Mars',
    par: 4,
    description: 'Trailing beside Jupiter in the east-southeast',
    defaultAzimuth: 125,
    defaultAltitude: 26,
    strokes: 0,
    completed: false,
    unlockedPatchKey: '3-2',
  },
  {
    holeNumber: 5,
    name: 'Hole 5: Vega at Zenith',
    targetBody: 'Vega',
    par: 3,
    description: 'Summer triangle jewel shining high overhead',
    defaultAzimuth: 280,
    defaultAltitude: 68,
    strokes: 0,
    completed: false,
    unlockedPatchKey: '6-0',
  },
  {
    holeNumber: 6,
    name: 'Hole 6: Ringed Giant',
    targetBody: 'Saturn',
    par: 4,
    description: 'Low in the southwestern evening sky',
    defaultAzimuth: 215,
    defaultAltitude: 22,
    strokes: 0,
    completed: false,
    unlockedPatchKey: '5-2',
  },
  {
    holeNumber: 7,
    name: "Hole 7: The Bull's Eye",
    targetBody: 'Aldebaran',
    par: 3,
    description: 'Fiery orange eye of Taurus the Bull',
    defaultAzimuth: 75,
    defaultAltitude: 28,
    strokes: 0,
    completed: false,
    unlockedPatchKey: '2-2',
  },
  {
    holeNumber: 8,
    name: 'Hole 8: Polaris North Star',
    targetBody: 'Polaris',
    par: 3,
    description: 'True celestial north pivot for all navigation',
    defaultAzimuth: 0,
    defaultAltitude: 43,
    strokes: 0,
    completed: false,
    unlockedPatchKey: '0-1',
  },
  {
    holeNumber: 9,
    name: 'Hole 9: Midnight Moon',
    targetBody: 'Moon',
    par: 3,
    description: 'Finishing round on Earth’s natural satellite',
    defaultAzimuth: 42,
    defaultAltitude: 35,
    strokes: 0,
    completed: false,
    unlockedPatchKey: '1-1',
  },
];

export const useGameStore = create<GameState>((set, get) => ({
  score: 0,
  activeTab: 'gaps',
  skyMode: 'gap',
  unlockedPatches: INITIAL_OPEN_PATCHES,
  newlyUnlockedKey: null,
  activeTarget: {
    name: 'Jupiter',
    azimuth: 118,
    altitude: 24,
  },
  nearbyGaps: INITIAL_GAPS,
  crewReports: INITIAL_CREW_REPORTS,
  leaderboard: INITIAL_LEADERBOARD,

  // 9-Hole Course
  currentHoleNumber: 1,
  holes: INITIAL_HOLES,
  totalStrokes: 0,
  totalRelativeToPar: 0,

  addScore: (points: number) =>
    set((state) => {
      const newScore = state.score + points;
      const updatedLeaderboard = state.leaderboard
        .map((entry) => (entry.isCurrentUser ? { ...entry, points: newScore } : entry))
        .sort((a, b) => b.points - a.points)
        .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

      return {
        score: newScore,
        leaderboard: updatedLeaderboard,
      };
    }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setSkyMode: (mode) => set({ skyMode: mode }),

  setActiveTarget: (target) => set({ activeTarget: target }),

  unlockPatch: (patchKey: string) =>
    set((state) => ({
      unlockedPatches: {
        ...state.unlockedPatches,
        [patchKey]: true,
      },
      newlyUnlockedKey: patchKey,
    })),

  clearNewlyUnlockedKey: () => set({ newlyUnlockedKey: null }),

  recordHoleStroke: (angularDeviation, isOvercast, patchKey) => {
    const state = get();
    const holeIdx = state.currentHoleNumber - 1;
    const currentHole = state.holes[holeIdx];

    const newStrokes = currentHole.strokes + 1;
    let scoreTerm: GolfScoreTerm = 'Par';
    let relativeToPar = 0;

    if (isOvercast) {
      scoreTerm = 'Bogey';
      relativeToPar = 1;
    } else {
      if (angularDeviation <= 1.5 && newStrokes === 1) {
        scoreTerm = 'Hole in One';
        relativeToPar = -2;
      } else if (angularDeviation <= 1.5) {
        scoreTerm = 'Eagle';
        relativeToPar = -2;
      } else if (angularDeviation <= 3.0) {
        scoreTerm = 'Birdie';
        relativeToPar = -1;
      } else if (angularDeviation <= 4.5) {
        scoreTerm = 'Par';
        relativeToPar = 0;
      } else {
        scoreTerm = 'Bogey';
        relativeToPar = 1;
      }
    }

    const updatedHole: GolfHole = {
      ...currentHole,
      strokes: newStrokes,
      completed: true,
      scoreTerm,
      relativeToPar,
      unlockedPatchKey: patchKey ?? currentHole.unlockedPatchKey,
    };

    const updatedHoles = [...state.holes];
    updatedHoles[holeIdx] = updatedHole;

    const totalStrokes = updatedHoles.reduce((acc, h) => acc + h.strokes, 0);
    const totalRelativeToPar = updatedHoles
      .filter((h) => h.completed)
      .reduce((acc, h) => acc + (h.relativeToPar ?? 0), 0);

    set({
      holes: updatedHoles,
      totalStrokes,
      totalRelativeToPar,
    });

    return { scoreTerm, relativeToPar, strokes: newStrokes };
  },

  advanceToNextHole: () => {
    const state = get();
    if (state.currentHoleNumber < 9) {
      const nextHoleNum = state.currentHoleNumber + 1;
      const nextHole = state.holes[nextHoleNum - 1];
      set({
        currentHoleNumber: nextHoleNum,
        activeTarget: {
          name: nextHole.targetBody,
          azimuth: nextHole.defaultAzimuth,
          altitude: nextHole.defaultAltitude,
        },
      });
    }
  },

  selectHole: (holeNumber) => {
    const state = get();
    if (holeNumber >= 1 && holeNumber <= 9) {
      const hole = state.holes[holeNumber - 1];
      set({
        currentHoleNumber: holeNumber,
        activeTarget: {
          name: hole.targetBody,
          azimuth: hole.defaultAzimuth,
          altitude: hole.defaultAltitude,
        },
      });
    }
  },
}));
