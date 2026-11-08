import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useGameStore } from '../store/gameStore';
import { Flag, ChevronRight, Award } from 'lucide-react-native';

interface GolfScorecardProps {
  compact?: boolean;
}

export const GolfScorecard: React.FC<GolfScorecardProps> = ({ compact = false }) => {
  const { colors, typography } = useTheme();

  const currentHoleNumber = useGameStore((state) => state.currentHoleNumber);
  const holes = useGameStore((state) => state.holes);
  const totalStrokes = useGameStore((state) => state.totalStrokes);
  const totalRelativeToPar = useGameStore((state) => state.totalRelativeToPar);
  const selectHole = useGameStore((state) => state.selectHole);

  const currentHole = holes[currentHoleNumber - 1];

  const formatScoreDiff = (diff: number) => {
    if (diff === 0) return 'E';
    return diff > 0 ? `+${diff}` : `${diff}`;
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.panel,
          borderColor: colors.line,
        },
      ]}
    >
      {/* Top Summary Bar */}
      <View style={styles.topBar}>
        <View style={styles.holeInfo}>
          <Flag size={15} color={colors.amber} />
          <Text style={[typography.bodyBold, { color: colors.ink }]}>
            Hole {currentHole.holeNumber} of 9
          </Text>
          <View style={[styles.parChip, { backgroundColor: colors.chip }]}>
            <Text style={[typography.small, { color: colors.mute, fontWeight: '700' }]}>
              Par {currentHole.par}
            </Text>
          </View>
        </View>

        <View style={styles.scoreSummary}>
          <Text style={[typography.small, { color: colors.mute }]}>Round:</Text>
          <Text
            style={[
              typography.bodyBold,
              {
                color:
                  totalRelativeToPar < 0
                    ? colors.gap
                    : totalRelativeToPar > 0
                    ? colors.amber
                    : colors.ink,
              },
            ]}
          >
            {formatScoreDiff(totalRelativeToPar)} ({totalStrokes} stks)
          </Text>
        </View>
      </View>

      {/* Current Hole Details */}
      {!compact && (
        <View style={styles.holeDetails}>
          <Text style={[typography.h3, { color: colors.ink }]}>
            {currentHole.name}
          </Text>
          <Text style={[typography.small, { color: colors.mute, marginTop: 2 }]}>
            {currentHole.description}
          </Text>
        </View>
      )}

      {/* 9-Hole Track Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.trackRow}
      >
        {holes.map((h) => {
          const isSelected = h.holeNumber === currentHoleNumber;
          return (
            <TouchableOpacity
              key={h.holeNumber}
              onPress={() => selectHole(h.holeNumber)}
              style={[
                styles.trackHoleBtn,
                {
                  backgroundColor: isSelected ? colors.gap : colors.chip,
                  borderColor: isSelected ? colors.ink : colors.line,
                },
                h.completed && !isSelected && { backgroundColor: colors.panel },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  typography.small,
                  {
                    color: isSelected ? '#041018' : colors.ink,
                    fontWeight: isSelected ? '700' : '600',
                  },
                ]}
              >
                #{h.holeNumber}
              </Text>
              {h.completed ? (
                <Text
                  style={[
                    styles.scoreTermBadge,
                    {
                      color:
                        h.relativeToPar && h.relativeToPar < 0
                          ? colors.gap
                          : colors.amber,
                    },
                  ]}
                >
                  {h.scoreTerm ? h.scoreTerm.slice(0, 3) : 'OK'}
                </Text>
              ) : (
                <Text style={[styles.parSmall, { color: isSelected ? '#041018' : colors.mute }]}>
                  P{h.par}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginVertical: 8,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  holeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  parChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  scoreSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  holeDetails: {
    marginTop: 6,
    marginBottom: 8,
  },
  trackRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  trackHoleBtn: {
    width: 38,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreTermBadge: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 1,
  },
  parSmall: {
    fontSize: 9,
    marginTop: 1,
  },
});
