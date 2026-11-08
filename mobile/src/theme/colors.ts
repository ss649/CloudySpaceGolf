export interface ThemeColors {
  bg: string;
  panel: string;
  ink: string;
  mute: string;
  line: string;
  water: string;
  land: string;
  cloud: string;
  gap: string;
  amber: string;
  sky: string;
  chip: string;
  cardShadow: string;
}

export const lightColors: ThemeColors = {
  bg: '#EAF0F5',
  panel: '#FFFFFF',
  ink: '#13243A',
  mute: '#5A6C82',
  line: '#D3DEE8',
  water: '#C5DAEA',
  land: '#F4F7FA',
  cloud: '#8497AD',
  gap: '#0E8FA8',
  amber: '#B9700E',
  sky: '#0A1424',
  chip: '#DCE7F0',
  cardShadow: 'rgba(5, 15, 35, 0.08)',
};

export const darkColors: ThemeColors = {
  bg: '#070D18',
  panel: '#122036',
  ink: '#E6EEF6',
  mute: '#97A8BC',
  line: '#22364F',
  water: '#0F2A44',
  land: '#0E1A2C',
  cloud: '#52657C',
  gap: '#5ED0E6',
  amber: '#F5B65A',
  sky: '#050A14',
  chip: '#1B2E48',
  cardShadow: 'rgba(0, 0, 0, 0.4)',
};

export type ColorTheme = 'light' | 'dark';
