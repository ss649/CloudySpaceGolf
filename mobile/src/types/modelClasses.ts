export const TARGET_CLASSES = [
  'Jupiter',
  'Mars',
  'Saturn',
  'Venus',
  'Sirius',
  'Vega',
  'Betelgeuse',
  'Rigel',
  'Capella',
  'Arcturus',
  'Background_Noise'
] as const;

export type TargetClass = typeof TARGET_CLASSES[number];
