import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useGameStore } from '../store/gameStore';
import { Header } from '../components/Header';
import { Card } from '../components/Card';

export const CrewScreen: React.FC = () => {
  const { colors, typography } = useTheme();
  const crewReports = useGameStore((state) => state.crewReports);
  const leaderboard = useGameStore((state) => state.leaderboard);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Header title="Crew" />
      <Text style={[typography.small, { color: colors.mute, marginBottom: 12 }]}>
        Live citizen science reports and weekly community leaderboard.
      </Text>

      {/* Latest Reports Card */}
      <Card style={styles.topCard}>
        <Text style={[typography.bodyBold, { color: colors.ink, marginBottom: 4 }]}>
          Latest gap reports
        </Text>

        <View style={styles.rows}>
          {crewReports.map((report, idx) => (
            <View
              key={report.id}
              style={[
                styles.reportRow,
                { borderTopColor: colors.line },
                idx === 0 && { borderTopWidth: 0 },
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: colors.chip }]}>
                <Text style={[typography.bodyBold, { color: colors.ink }]}>
                  {report.avatarInitial}
                </Text>
              </View>

              <View style={styles.reportContent}>
                <Text style={[typography.bodyBold, { color: colors.ink }]}>
                  {report.author}
                </Text>
                <Text style={[typography.small, { color: colors.mute }]}>
                  {report.description}
                </Text>
              </View>

              <Text style={[typography.small, { color: colors.mute }]}>
                {report.timestampMinutesAgo} min
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Leaderboard Card */}
      <Card>
        <Text style={[typography.bodyBold, { color: colors.ink, marginBottom: 4 }]}>
          This week
        </Text>

        <View style={styles.rows}>
          {leaderboard.map((entry, idx) => (
            <View
              key={entry.name}
              style={[
                styles.reportRow,
                { borderTopColor: colors.line },
                idx === 0 && { borderTopWidth: 0 },
                entry.isCurrentUser && {
                  backgroundColor: colors.chip,
                  marginHorizontal: -14,
                  paddingHorizontal: 14,
                  borderRadius: 8,
                },
              ]}
            >
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: entry.isCurrentUser ? colors.gap : colors.chip,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.bodyBold,
                    { color: entry.isCurrentUser ? '#041018' : colors.ink },
                  ]}
                >
                  {entry.rank}
                </Text>
              </View>

              <View style={styles.reportContent}>
                <Text
                  style={[
                    typography.bodyBold,
                    { color: colors.ink },
                    entry.isCurrentUser && { color: colors.gap, fontWeight: '700' },
                  ]}
                >
                  {entry.name} {entry.isCurrentUser ? '(You)' : ''}
                </Text>
              </View>

              <Text style={[typography.bodyBold, { color: colors.ink }]}>
                {entry.points}
              </Text>
            </View>
          ))}
        </View>
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
  topCard: {
    marginTop: 0,
  },
  rows: {
    marginTop: 6,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportContent: {
    flex: 1,
  },
});
