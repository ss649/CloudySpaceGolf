import React, { createContext, useContext, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeColors, lightColors, darkColors, ColorTheme } from './colors';
import { typography } from './typography';

interface ThemeContextType {
  colors: ThemeColors;
  theme: ColorTheme;
  setTheme: (theme: ColorTheme) => void;
  toggleTheme: () => void;
  typography: typeof typography;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<ColorTheme>(systemScheme === 'light' ? 'light' : 'dark');

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const colors = useMemo(() => (theme === 'light' ? lightColors : darkColors), [theme]);

  const value = useMemo(
    () => ({
      colors,
      theme,
      setTheme,
      toggleTheme,
      typography,
    }),
    [colors, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
