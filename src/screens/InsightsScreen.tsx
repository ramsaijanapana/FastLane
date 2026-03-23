import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ThemePalette, useTheme } from '../theme';
import type { DailySummary, UserSettings } from '../types';
import { formatHours, formatMl, formatShortDate } from '../utils';
import { ChipButton, EmptyState, ProgressBar, SectionCard } from '../components/ui';

type InsightsScreenProps = {
  chartData: DailySummary[];
  longestFastHours: number;
  averageFastHours: number;
  streak: number;
  weeklyCompletion: number;
  settings: UserSettings;
  badges: string[];
};

type ChartMode = 'fasting' | 'water' | 'calories';
type CompactPanel = 'overview' | 'trend';

export const InsightsScreen = ({
  chartData,
  longestFastHours,
  averageFastHours,
  streak,
  weeklyCompletion,
  settings,
  badges,
}: InsightsScreenProps) => {
  const { theme: palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { width } = useWindowDimensions();
  const isCompact = width < 1020;
  const [chartMode, setChartMode] = useState<ChartMode>('fasting');
  const [compactPanel, setCompactPanel] = useState<CompactPanel>('overview');

  const bestFastDay =
    chartData.reduce(
      (best, day) => (day.fastingHours > best.fastingHours ? day : best),
      chartData[0],
    ) ?? null;
  const waterGoalHitDays = chartData.filter(
    (day) => day.waterMl >= settings.dailyWaterGoalMl,
  ).length;
  const averageCalories =
    chartData.length === 0
      ? 0
      : Math.round(
          chartData.reduce((total, day) => total + day.calories, 0) / chartData.length,
        );

  const chartConfig =
    chartMode === 'fasting'
      ? {
          summary: 'Completed fasting hours across the last 7 days.',
          accessor: (day: DailySummary) => day.fastingHours,
          formatter: (value: number) => `${value.toFixed(0)}h`,
          accent: palette.amber,
        }
      : chartMode === 'water'
        ? {
            summary: `Hydration against your ${formatMl(settings.dailyWaterGoalMl)} goal.`,
            accessor: (day: DailySummary) => day.waterMl,
            formatter: (value: number) => `${Math.round(value)} ml`,
            accent: palette.teal,
          }
        : {
            summary: 'Visible calorie logging without overcomplicating intake.',
            accessor: (day: DailySummary) => day.calories,
            formatter: (value: number) => `${Math.round(value)} cal`,
            accent: palette.cyan,
          };

  return (
    <View style={styles.wrap}>
      <SectionCard
        title="Insights"
        subtitle="One fitted analytics board instead of a stacked report."
        style={styles.boardCard}
      >
        <View style={styles.statsRow}>
          <InsightStat value={formatHours(longestFastHours)} label="longest fast" />
          <InsightStat value={formatHours(averageFastHours)} label="7-day avg" />
          <InsightStat
            value={`${weeklyCompletion}/${settings.weeklyFastGoal}`}
            label="weekly progress"
          />
          <InsightStat value={`${waterGoalHitDays}/7`} label="water-goal days" />
        </View>

        {isCompact ? (
          <View style={styles.panelSwitchRow}>
            <ChipButton
              label="Overview"
              onPress={() => setCompactPanel('overview')}
              selected={compactPanel === 'overview'}
              accent={palette.amber}
            />
            <ChipButton
              label="Trend"
              onPress={() => setCompactPanel('trend')}
              selected={compactPanel === 'trend'}
              accent={palette.teal}
            />
          </View>
        ) : null}

        {!isCompact || compactPanel === 'overview' ? (
          <View style={[styles.boardRow, !isCompact && styles.boardRowWide]}>
            <View style={styles.noteColumn}>
              <InsightLine
                label="Best fasting day"
                value={
                  bestFastDay
                    ? `${formatShortDate(bestFastDay.dayStart)} (${formatHours(bestFastDay.fastingHours)})`
                    : 'No completed windows yet'
                }
              />
              <InsightLine label="Current streak" value={`${streak} days`} />
              <InsightLine label="Average calories" value={`${averageCalories} cal`} />
              <InsightLine
                label="Badges"
                value={badges.length > 0 ? badges.join(', ') : 'No badges unlocked yet'}
              />
              {bestFastDay ? (
                <View style={styles.focusCard}>
                  <Text style={styles.focusTitle}>Best recent day</Text>
                  <Text style={styles.focusValue}>{bestFastDay.label}</Text>
                  <ProgressBar
                    progress={
                      bestFastDay.fastingHours /
                      Math.max(settings.defaultFastGoalHours, 1)
                    }
                    accent={palette.purple}
                  />
                </View>
              ) : null}
            </View>

            {!isCompact ? (
              <View style={styles.chartColumn}>
                <View style={styles.chartHeader}>
                  <View style={styles.chartModeRow}>
                    <ChipButton
                      label="Fasting"
                      onPress={() => setChartMode('fasting')}
                      selected={chartMode === 'fasting'}
                      accent={palette.amber}
                    />
                    <ChipButton
                      label="Water"
                      onPress={() => setChartMode('water')}
                      selected={chartMode === 'water'}
                      accent={palette.teal}
                    />
                    <ChipButton
                      label="Calories"
                      onPress={() => setChartMode('calories')}
                      selected={chartMode === 'calories'}
                      accent={palette.cyan}
                    />
                  </View>
                  <Text style={styles.chartSummary}>{chartConfig.summary}</Text>
                </View>

                {chartData.length === 0 ? (
                  <EmptyState text="Log a few days of data to populate your first compact trend view." />
                ) : (
                  <BarChart
                    data={chartData}
                    accessor={chartConfig.accessor}
                    formatter={chartConfig.formatter}
                    accent={chartConfig.accent}
                  />
                )}
              </View>
            ) : null}
          </View>
        ) : null}

        {isCompact && compactPanel === 'trend' ? (
          <View style={styles.chartColumn}>
            <View style={styles.chartHeader}>
              <View style={styles.chartModeRow}>
                <ChipButton
                  label="Fasting"
                  onPress={() => setChartMode('fasting')}
                  selected={chartMode === 'fasting'}
                  accent={palette.amber}
                />
                <ChipButton
                  label="Water"
                  onPress={() => setChartMode('water')}
                  selected={chartMode === 'water'}
                  accent={palette.teal}
                />
                <ChipButton
                  label="Calories"
                  onPress={() => setChartMode('calories')}
                  selected={chartMode === 'calories'}
                  accent={palette.cyan}
                />
              </View>
              <Text style={styles.chartSummary}>{chartConfig.summary}</Text>
            </View>

            {chartData.length === 0 ? (
              <EmptyState text="Log a few days of data to populate your first compact trend view." />
            ) : (
              <BarChart
                data={chartData}
                accessor={chartConfig.accessor}
                formatter={chartConfig.formatter}
                accent={chartConfig.accent}
              />
            )}
          </View>
        ) : null}
      </SectionCard>
    </View>
  );
};

const InsightStat = ({ value, label }: { value: string; label: string }) => {
  const { theme: palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
};

const InsightLine = ({ label, value }: { label: string; value: string }) => {
  const { theme: palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.insightRow}>
      <Text style={styles.insightLabel}>{label}</Text>
      <Text style={styles.insightValue}>{value}</Text>
    </View>
  );
};

const BarChart = ({
  data,
  accessor,
  formatter,
  accent,
}: {
  data: DailySummary[];
  accessor: (day: DailySummary) => number;
  formatter: (value: number) => string;
  accent: string;
}) => {
  const { theme: palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const maxValue = Math.max(...data.map(accessor), 1);

  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartBars}>
        {data.map((day) => {
          const value = accessor(day);

          return (
            <View key={day.dayStart} style={styles.barColumn}>
              <Text style={styles.barValue}>{formatter(value)}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.max((value / maxValue) * 100, value > 0 ? 8 : 0)}%`,
                      backgroundColor: accent,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{day.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      minHeight: 0,
    },
    boardCard: {
      flex: 1,
      minHeight: 0,
    },
    statsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricTile: {
      flexGrow: 1,
      minWidth: 140,
      padding: 14,
      borderRadius: 20,
      backgroundColor: palette.surfaceMuted,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      gap: 4,
    },
    metricValue: {
      color: palette.textStrong,
      fontSize: 20,
      lineHeight: 24,
      fontWeight: '900',
    },
    metricLabel: {
      color: palette.textMuted,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '700',
    },
    panelSwitchRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    boardRow: {
      gap: 16,
    },
    boardRowWide: {
      flex: 1,
      flexDirection: 'row',
      minHeight: 0,
    },
    noteColumn: {
      flex: 0.38,
      gap: 10,
      minHeight: 0,
    },
    chartColumn: {
      flex: 0.62,
      gap: 12,
      minHeight: 0,
    },
    chartHeader: {
      gap: 10,
    },
    chartModeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    chartSummary: {
      color: palette.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
    insightRow: {
      gap: 4,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderSoft,
    },
    insightLabel: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    insightValue: {
      color: palette.text,
      fontSize: 14,
      lineHeight: 19,
    },
    focusCard: {
      padding: 14,
      borderRadius: 20,
      backgroundColor: palette.surfaceMuted,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      gap: 8,
    },
    focusTitle: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    focusValue: {
      color: palette.textStrong,
      fontSize: 18,
      fontWeight: '800',
    },
    chartWrap: {
      flex: 1,
      justifyContent: 'center',
      minHeight: 0,
    },
    chartBars: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 10,
      minHeight: 220,
    },
    barColumn: {
      flex: 1,
      alignItems: 'center',
      gap: 8,
    },
    barValue: {
      color: palette.textMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    barTrack: {
      width: '100%',
      maxWidth: 36,
      height: 158,
      borderRadius: 999,
      backgroundColor: palette.track,
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    barFill: {
      width: '100%',
      borderRadius: 999,
    },
    barLabel: {
      color: palette.text,
      fontSize: 12,
      fontWeight: '700',
    },
  });
