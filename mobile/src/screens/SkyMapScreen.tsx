import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useGameStore } from '../store/gameStore';
import { Header } from '../components/Header';
import { Card } from '../components/Card';

export const SkyMapScreen: React.FC = () => {
  const { colors, typography } = useTheme();
  const unlockedPatches = useGameStore((state) => state.unlockedPatches);
  const newlyUnlockedKey = useGameStore((state) => state.newlyUnlockedKey);

  const unlockedCount = Object.keys(unlockedPatches).length;
  const progressPercent = Math.min(100, Math.round((unlockedCount / 24) * 100));

  // Build 3 rows x 8 cols = 24 patches
  const gridRows = [0, 1, 2]; // 0: High, 1: Mid, 2: Low
  const gridCols = [0, 1, 2, 3, 4, 5, 6, 7]; // 8 compass directions

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Header title="Our sky" />
      <Text style={[typography.small, { color: colors.mute, marginBottom: 12 }]}>
        Each square is a patch of sky. A photo from anyone in the crew clears the fog.
      </Text>

      {/* Course Progress Card */}
      <Card style={styles.progressCard}>
        <Text style={[typography.bodyBold, { color: colors.ink }]}>
          Unlocked: {unlockedCount} of 24 patches
        </Text>

        {/* Progress Bar */}
        <View style={[styles.barTrack, { backgroundColor: colors.chip }]}>
          <View
            style={[
              styles.barFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: colors.gap,
              },
            ]}
          />
        </View>

        {/* 24-Patch Grid */}
        <View style={styles.grid}>
          {gridRows.map((row) => (
            <View key={row} style={styles.gridRow}>
              {gridCols.map((col) => {
                const key = `${col}-${row}`;
                const isOpen = !!unlockedPatches[key];
                const isNew = key === newlyUnlockedKey;

                return (
                  <View
                    key={key}
                    style={[
                      styles.tile,
                      {
                        backgroundColor: isOpen ? '#15305A' : colors.chip,
                        borderColor: isNew ? colors.amber : colors.line,
                        borderStyle: isOpen ? 'solid' : 'dashed',
                      },
                      isNew && styles.tileNew,
                    ]}
                  >
                    {isOpen && (
                      <View style={styles.starCluster}>
                        <View style={[styles.tileStar, { top: 4, left: 6 }]} />
                        <View style={[styles.tileStar, { top: 12, right: 5 }]} />
                        <View style={[styles.tileStar, { bottom: 6, left: 10 }]} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <Text style={[typography.small, { color: colors.mute, marginTop: 10 }]}>
          Left to right: north around to northwest. Top to bottom: high, middle, low.
        </Text>
      </Card>

      {/* Catalog & Plate-Solving Explanation Card */}
      <Card>
        <Text style={[typography.bodyBold, { color: colors.ink }]}>
          How photos get placed
        </Text>
        <Text style={[typography.caption, { color: colors.mute, marginTop: 6 }]}>
          The star pattern in each photo is matched to a celestial catalog, so the patch is
          confirmed from the image itself, not just the phone’s compass.
        </Text>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 18,
    paddingBottom: 36,
  },
  progressCard: {
    marginTop: 0,
  },
  barTrack: {
    height: 10,
    borderRadius: 99,
    overflow: 'hidden',
    marginVertical: 10,
  },
  barFill: {
    height: '100%',
    borderRadius: 99,
  },
  grid: {
    marginTop: 10,
    gap: 5,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 5,
  },
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileNew: {
    borderWidth: 2,
    shadowColor: '#F5B65A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  starCluster: {
    ...StyleSheet.absoluteFillObject,
  },
  tileStar: {
    position: 'absolute',
    width: 2.5,
    height: 2.5,
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
    opacity: 0.85,
  },
});
