import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useGameStore } from '../store/gameStore';
import { Sun, Moon } from 'lucide-react-native';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const { colors, typography, theme, toggleTheme } = useTheme();
  const score = useGameStore((state) => state.score);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={[typography.h1, { color: colors.ink }]}>{title}</Text>
        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.themeBtn, { backgroundColor: colors.chip }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Toggle dark/light theme"
        >
          {theme === 'dark' ? (
            <Sun size={15} color={colors.amber} />
          ) : (
            <Moon size={15} color={colors.mute} />
          )}
        </TouchableOpacity>
      </View>
      <View style={[styles.ptsBadge, { backgroundColor: colors.chip }]}>
        <Text style={[typography.caption, { color: colors.ink, fontWeight: '700' }]}>
          {score} pts
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeBtn: {
    padding: 6,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ptsBadge: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
});
