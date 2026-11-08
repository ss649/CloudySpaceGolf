import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { useGameStore } from '../store/gameStore';

export type TabKey = 'gaps' | 'capture' | 'sky' | 'crew';

interface TabItem {
  key: TabKey;
  label: string;
}

const TABS: TabItem[] = [
  { key: 'gaps', label: 'Gaps' },
  { key: 'capture', label: 'Capture' },
  { key: 'sky', label: 'Our sky' },
  { key: 'crew', label: 'Crew' },
];

export const TabBar: React.FC = () => {
  const { colors, typography } = useTheme();
  const activeTab = useGameStore((state) => state.activeTab);
  const setActiveTab = useGameStore((state) => state.setActiveTab);

  const renderIcon = (key: TabKey, active: boolean) => {
    const strokeColor = active ? colors.gap : colors.mute;
    const strokeWidth = 2;

    switch (key) {
      case 'gaps':
        // Cloud outline icon from gap1.html
        return (
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path
              d="M7 18a4 4 0 010-8 5 5 0 019.6-1A4 4 0 0117 18z"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        );

      case 'capture':
        // Reticle / target icon from gap1.html
        return (
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Circle cx={12} cy={12} r={8} stroke={strokeColor} strokeWidth={strokeWidth} />
            <Circle cx={12} cy={12} r={2.5} stroke={strokeColor} strokeWidth={strokeWidth} />
          </Svg>
        );

      case 'sky':
        // Star polygon icon from gap1.html
        return (
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 3l2.4 5.6 6 .6-4.5 4 1.4 6L12 16l-5.3 3.2 1.4-6-4.5-4 6-.6z"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        );

      case 'crew':
        // Crew / people icon from gap1.html
        return (
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Circle cx={9} cy={9} r={3.5} stroke={strokeColor} strokeWidth={strokeWidth} />
            <Circle cx={17} cy={10} r={2.5} stroke={strokeColor} strokeWidth={strokeWidth} />
            <Path
              d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 15c3 0 6 1.5 6 5"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        );
    }
  };

  return (
    <View
      style={[
        styles.tabsContainer,
        {
          backgroundColor: colors.panel,
          borderTopColor: colors.line,
        },
      ]}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabButton}
            onPress={() => setActiveTab(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <View style={styles.iconWrapper}>{renderIcon(tab.key, isActive)}</View>
            <Text
              style={[
                typography.caption,
                styles.tabLabel,
                { color: isActive ? colors.gap : colors.mute },
                isActive && styles.activeTabLabel,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconWrapper: {
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 12,
  },
  activeTabLabel: {
    fontWeight: '700',
  },
});
