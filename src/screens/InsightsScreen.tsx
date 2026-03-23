import React, { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ThemePalette, useTheme } from '../theme';
import type { DailySummary, UserSettings } from '../types';
import { formatHours, formatMl, formatShortDate } from '../utils';
import { EmptyState, MetricTile, ProgressBar, SectionCard } from '../components/ui';

type InsightsScreenProps = {
  chartData: DailySummary[];
  longestFastHours: number;
  averageFastHours: number;
  streak: number;
  weeklyCompletion: number;
  settings: UserSettings;
  badges: string[];
};

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

  return (
    <View style={styles.wrap}>
      <SectionCard
        title="7 Day Snapshot"
        subtitle="A clearer view of consistency, intake, and hydration over the last week."
      >
        <View style={styles.metricGrid}>
          <MetricTile value={formatHours(longestFastHours)} label="longest fast" />
          <MetricTile value={formatHours(averageFastHours)} label="7-day avg fast" />
          <MetricTile value={`${streak}`} label="current streak" />
          <MetricTile
            value={`${weeklyCompletion}/${settings.weeklyFastGoal}`}
            label="weekly fast progress"
          />
          <MetricTile value={`${averageCalories}`} label="avg daily calories" />
          <MetricTile value={`${waterGoalHitDays}/7`} label="water-goal days" />
        </View>
      </SectionCard>

      <View style={[styles.grid, !isCompact && styles.gridWide]}>
        <SectionCard
          title="Fasting Hours"
          subtitle="Completed fasting hours by day."
          style={styles.flexCard}
        >
          {chartData.length === 0 ? (
            <EmptyState text="Finish a few windows to populate your first trend chart." />
          ) : (
            <BarChart
              data={chartData}
              accessor={(day) => day.fastingHours}
              formatter={(value) => `${value.toFixed(0)}h`}
              accent={palette.amber}
            />
          )}
        </SectionCard>

        <SectionCard
          title="Water Intake"
          subtitle="Hydration totals across the week."
          style={styles.flexCard}
        >
          {chartData.length === 0 ? (
            <EmptyState text="Log water to track hydration patterns here." />
          ) : (
            <BarChart
              data={chartData}
              accessor={(day) => day.waterMl}
              formatter={(value) => `${Math.round(value)} ml`}
              accent={palette.teal}
            />
          )}
        </SectionCard>
      </View>

      <View style={[styles.grid, !isCompact && styles.gridWide]}>
        <SectionCard
          title="Calories"
          subtitle="Visible intake without overcomplicating logging."
          style={styles.flexCard}
        >
          {chartData.length === 0 ? (
            <EmptyState text="Calorie totals appear after you start logging meals." />
          ) : (
            <BarChart
              data={chartData}
              accessor={(day) => day.calories}
              formatter={(value) => `${Math.round(value)} cal`}
              accent={palette.cyan}
            />
          )}
        </SectionCard>

        <SectionCard
          title="Momentum Notes"
          subtitle="Readable takeaways from the current data set."
          style={styles.flexCard}
        >
          <View style={styles.noteList}>
            <InsightLine
              label="Best fasting day"
              value={
                bestFastDay
                  ? `${bestFastDay.label} (${formatHours(bestFastDay.fastingHours)})`
                  : 'No completed windows yet'
              }
            />
            <InsightLine
              label="Water consistency"
              value={`${waterGoalHitDays} of the last 7 days hit ${formatMl(settings.dailyWaterGoalMl)}`}
            />
            <InsightLine
              label="Weekly campaign"
              value={`${weeklyCompletion} completed windows so far this week`}
            />
            <InsightLine
              label="Latest badge set"
              value={badges.length > 0 ? badges.join(', ') : 'No badges unlocked yet'}
            />
            {bestFastDay ? (
              <View style={styles.focusCard}>
                <Text style={styles.focusTitle}>Best recent day</Text>
                <Text style={styles.focusValue}>{formatShortDate(bestFastDay.dayStart)}</Text>
                <ProgressBar
                  progress={bestFastDay.fastingHours / Math.max(settings.defaultFastGoalHours, 1)}
                  accent={palette.purple}
                />
              </View>
            ) : null}
          </View>
        </SectionCard>
      </View>
    </View>
  );
};

const InsightLine = ({ label, value }: { label: string; value: string }) => (
  <InsightLineInner label={label} value={value} />
);

const InsightLineInner = ({ label, value }: { label: string; value: string }) => {
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

const createStyles = (palette: ThemePalette) => StyleSheet.create({
  wrap: {
    gap: 20,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  grid: {
    gap: 20,
  },
  gridWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flexCard: {
    flex: 1,
  },
  chartWrap: {
    paddingTop: 6,
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
    maxWidth: 42,
    height: 160,
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
  noteList: {
    gap: 12,
  },
  insightRow: {
    gap: 5,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderSoft,
  },
  insightLabel: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  insightValue: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 21,
  },
  focusCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: palette.surfaceStrong,
    gap: 8,
  },
  focusTitle: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  focusValue: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '800',
  },
});
