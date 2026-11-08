import { OrientationReading, CelestialCoordinates } from './telemetry';

export type SkyMode = 'gap' | 'overcast';

export interface VerificationStep {
  id: string;
  label: string;
  completed: boolean;
}

export interface CapturePayload {
  captureId: string;
  timestamp: string;
  mode: SkyMode;
  target: CelestialCoordinates;
  orientation: OrientationReading;
  angularDeviation: number;
  photoUri?: string;
  gps?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
}

export interface CaptureResult {
  success: boolean;
  scoreAwarded: number;
  angularDeviation: number;
  patchUnlockedKey?: string;
  headline: string;
  description: string;
  photoUri?: string;
  timestamp: string;
  modelPrediction?: {
    identifiedBody: string;
    confidence: number;
    isConfirmed: boolean;
    opticalOffset: { dxPixels: number; dyPixels: number };
    cloudCoverPercentage: number;
    inferenceTimeMs: number;
    modelSource: string;
  };
}
