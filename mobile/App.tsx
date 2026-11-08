import React from 'react';
import { View, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { useGameStore } from './src/store/gameStore';
import { TabBar } from './src/components/TabBar';
import { GapsScreen } from './src/screens/GapsScreen';
import { CaptureScreen } from './src/screens/CaptureScreen';
import { SkyMapScreen } from './src/screens/SkyMapScreen';
import { CrewScreen } from './src/screens/CrewScreen';

const MainNavigator: React.FC = () => {
  const { colors, theme } = useTheme();
  const activeTab = useGameStore((state) => state.activeTab);

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'gaps':
        return <GapsScreen />;
      case 'capture':
        return <CaptureScreen />;
      case 'sky':
        return <SkyMapScreen />;
      case 'crew':
        return <CrewScreen />;
      default:
        return <GapsScreen />;
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safeArea}>
        <View
          style={[
            styles.phoneContainer,
            {
              backgroundColor: colors.bg,
              borderColor: colors.line,
            },
          ]}
        >
          {/* Active Tab Screen */}
          <View style={styles.screenContainer}>{renderActiveScreen()}</View>

          {/* Bottom Navigation Tab Bar */}
          <TabBar />
        </View>
      </SafeAreaView>
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 420 : undefined,
  },
  phoneContainer: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderRadius: Platform.OS === 'web' ? 24 : 0,
  },
  screenContainer: {
    flex: 1,
  },
});
