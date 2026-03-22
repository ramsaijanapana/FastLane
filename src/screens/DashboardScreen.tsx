import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FASTING_STAGES, TARGET_OPTIONS, WATER_PRESETS } from '../constants';
import { palette } from '../theme';
import type { FastSession, FastingStage, QuestStatus, UserSettings } from '../types';
import {
  clamp,
  formatDuration,
  formatHours,
  formatMl,
  formatShortDate,
  getCompletedFastHours,
} from '../utils';
import {
  ActionButton,
  ChipButton,
  EmptyState,
  MetricTile,
  ProgressBar,
  SectionCard,
} from '../components/ui';

type DashboardScreenProps = {
  activeFast: FastSession | null;
  now: number;
  selectedTarget: number;
  currentStage: FastingStage;
  encouragement: string;
  streak: number;
  mealsTodayCount: number;
  caloriesToday: number;
  waterTodayMl: number;
  settings: UserSettings;
  quests: QuestStatus[];
  badges: string[];
  weeklyCompletion: number;
  completedTodayTarget: boolean;
  fastHistory: FastSession[];
  isCompact: boolean;
  onSelectTarget: (hours: number) => void;
  onStartFast: () => void;
  onFinishFast: () => void;
  onAddWater: (amountMl: number) => void;
};

export const DashboardScreen = ({
  activeFast,
  now,
  selectedTarget,
  currentStage,
  encouragement,
  streak,
  mealsTodayCount,
  caloriesToday,
  waterTodayMl,
  settings,
  quests,
  badges,
  weeklyCompletion,
  completedTodayTarget,
  fastHistory,
  isCompact,
  onSelectTarget,
  onStartFast,
  onFinishFast,
  onAddWater,
}: DashboardScreenProps) => {
  const elapsedMilliseconds = activeFast ? now - activeFast.startTime : 0;
  const elapsedHours = elapsedMilliseconds / 3600000;
  const currentTarget = activeFast?.targetHours ?? selectedTarget;
  const fastProgress = activeFast
    ? clamp(elapsedHours / currentTarget, 0, 1)
    : completedTodayTarget
      ? 1
      : 0;
  const calorieProgress = clamp(
    caloriesToday / Math.max(settings.dailyCalorieGoal, 1),
    0,
    1.2,
  );
  const waterProgress = clamp(
    waterTodayMl / Math.max(settings.dailyWaterGoalMl, 1),
    0,
    1.2,
  );
  const weeklyProgress = clamp(
    weeklyCompletion / Math.max(settings.weeklyFastGoal, 1),
    0,
    1.2,
  );

  return (
    <View style={styles.wrap}>
      <SectionCard
        title={activeFast ? 'Active Fast' : 'Ready For The Next Window'}
        subtitle="Simple fasting milestones and daily targets without turning tracking into work."
      >
        <View style={[styles.heroBody, !isCompact && styles.heroBodyWide]}>
          <View style={styles.timerPanel}>
            <Text style={styles.timerLabel}>
              {activeFast ? 'Current timer' : 'Suggested target'}
            </Text>
            <Text style={styles.timerValue}>
              {activeFast ? formatDuration(elapsedMilliseconds) : `${selectedTarget}h`}
            </Text>
            <Text style={styles.timerMeta}>
              {activeFast ? `${currentStage.title} stage` : 'Pick a window and start when ready'}
            </Text>
            <ProgressBar progress={fastProgress} height={16} />
            <Text style={styles.helperText}>{encouragement}</Text>
            <View style={styles.actionsRow}>
              <ActionButton
                label={activeFast ? 'Fast Running' : 'Start Fast'}
                onPress={onStartFast}
                disabled={Boolean(activeFast)}
              />
              <ActionButton
                label="End Window"
                onPress={onFinishFast}
                tone="secondary"
                disabled={!activeFast}
              />
            </View>
          </View>

          <View style={styles.metricsColumn}>
            <MetricTile value={`${streak}`} label="day streak" />
            <MetricTile value={`${mealsTodayCount}`} label="meals logged today" />
            <MetricTile value={formatMl(waterTodayMl)} label="water today" />
            <MetricTile value={`${caloriesToday}`} label="calories today" />
          </View>
        </View>

        <View style={styles.targetRow}>
          {TARGET_OPTIONS.map((hours) => (
            <ChipButton
              key={hours}
              label={`${hours}h`}
              onPress={() => onSelectTarget(hours)}
              selected={currentTarget === hours}
            />
          ))}
        </View>
      </SectionCard>

      <View style={[styles.grid, !isCompact && styles.gridWide]}>
        <View style={styles.primaryColumn}>
          <SectionCard
            title="Daily Targets"
            subtitle="A clearer v1 view of fasting, water, calories, and weekly consistency."
          >
            <TargetRow
              label="Fast progress"
              value={activeFast ? formatDuration(elapsedMilliseconds) : completedTodayTarget ? 'Target hit' : 'Not started'}
              progress={fastProgress}
              accent={palette.amber}
            />
            <TargetRow
              label="Water goal"
              value={`${waterTodayMl}/${settings.dailyWaterGoalMl} ml`}
              progress={waterProgress}
              accent={palette.teal}
            />
            <TargetRow
              label="Calorie target"
              value={`${caloriesToday}/${settings.dailyCalorieGoal} cal`}
              progress={calorieProgress}
              accent={calorieProgress > 1 ? palette.red : palette.cyan}
            />
            <TargetRow
              label="Weekly fast target"
              value={`${weeklyCompletion}/${settings.weeklyFastGoal} windows`}
              progress={weeklyProgress}
              accent={palette.purple}
            />
          </SectionCard>

          <SectionCard
            title="Fasting Stages"
            subtitle="Common checkpoints to make the journey feel tangible."
          >
            {FASTING_STAGES.map((stage) => {
              const isCurrent =
                activeFast &&
                elapsedHours >= stage.startHour &&
                elapsedHours < stage.endHour;
              const isComplete = activeFast ? elapsedHours >= stage.endHour : false;
              const progress = activeFast
                ? clamp(
                    (elapsedHours - stage.startHour) /
                      (stage.endHour - stage.startHour),
                    0,
                    1,
                  )
                : 0;

              return (
                <View key={stage.title} style={styles.stageCard}>
                  <View style={styles.stageTop}>
                    <View
                      style={[
                        styles.stageAccent,
                        { backgroundColor: stage.accent },
                      ]}
                    />
                    <View style={styles.stageMetaWrap}>
                      <Text style={styles.stageTitle}>{stage.title}</Text>
                      <Text style={styles.stageMeta}>
                        {stage.startHour}h to {stage.endHour}h
                      </Text>
                    </View>
                    <Text style={styles.stageState}>
                      {isComplete ? 'Done' : isCurrent ? 'Live' : 'Up next'}
                    </Text>
                  </View>
                  <Text style={styles.stageDetail}>{stage.detail}</Text>
                  <ProgressBar progress={isComplete ? 1 : progress} accent={stage.accent} />
                </View>
              );
            })}
          </SectionCard>
        </View>

        <View style={styles.secondaryColumn}>
          <SectionCard
            title="Hydration"
            subtitle="Water tracking is part of the v1 daily loop now."
          >
            <Text style={styles.waterCopy}>
              Quick-add water while fasting or around meals. Daily goal: {settings.dailyWaterGoalMl} ml.
            </Text>
            <View style={styles.targetRow}>
              {WATER_PRESETS.map((amount) => (
                <ChipButton
                  key={amount}
                  label={`${amount} ml`}
                  onPress={() => onAddWater(amount)}
                  accent={palette.teal}
                />
              ))}
            </View>
            <ProgressBar progress={waterProgress} accent={palette.teal} />
          </SectionCard>

          <SectionCard
            title="Daily Game Loop"
            subtitle="Small rewards, clearer targets, steady consistency."
          >
            <View style={styles.questList}>
              {quests.map((quest) => (
                <View key={quest.title} style={styles.questRow}>
                  <View style={styles.questTextWrap}>
                    <Text style={styles.questTitle}>{quest.title}</Text>
                    <Text style={styles.questMeta}>{quest.progressLabel}</Text>
                  </View>
                  <Text style={[styles.questState, quest.done && styles.questStateDone]}>
                    {quest.done ? 'Cleared' : 'Open'}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.badgeWrap}>
              {badges.length === 0 ? (
                <EmptyState text="Badges unlock as you log intake, drink water consistently, and complete longer windows." />
              ) : (
                badges.map((badge) => (
                  <View key={badge} style={styles.badgeChip}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                ))
              )}
            </View>
          </SectionCard>

          <SectionCard
            title="Recent Windows"
            subtitle="Your latest fasting sessions stay visible and editable in the journal."
          >
            {fastHistory.length === 0 ? (
              <EmptyState text="Finish your first window to build history and insights." />
            ) : (
              fastHistory.slice(0, 4).map((session) => {
                const durationHours = getCompletedFastHours(session);
                const hitTarget = durationHours >= session.targetHours;

                return (
                  <View key={session.id} style={styles.historyRow}>
                    <View style={styles.historyCopy}>
                      <Text style={styles.historyTitle}>
                        {formatHours(durationHours)} fast
                      </Text>
                      <Text style={styles.historyMeta}>
                        {formatShortDate(session.completedAt ?? now)} - target {session.targetHours}h
                      </Text>
                      {session.note ? <Text style={styles.historyNote}>{session.note}</Text> : null}
                    </View>
                    <Text style={[styles.historyBadge, hitTarget && styles.historyBadgeHit]}>
                      {hitTarget ? 'Target hit' : 'Logged'}
                    </Text>
                  </View>
                );
              })
            )}
          </SectionCard>
        </View>
      </View>
    </View>
  );
};

const TargetRow = ({
  label,
  value,
  progress,
  accent,
}: {
  label: string;
  value: string;
  progress: number;
  accent: string;
}) => (
  <View style={styles.targetStat}>
    <View style={styles.targetStatTop}>
      <Text style={styles.targetStatLabel}>{label}</Text>
      <Text style={styles.targetStatValue}>{value}</Text>
    </View>
    <ProgressBar progress={progress} accent={accent} />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    gap: 20,
  },
  heroBody: {
    gap: 16,
  },
  heroBodyWide: {
    flexDirection: 'row',
  },
  timerPanel: {
    flex: 1.35,
    gap: 12,
  },
  timerLabel: {
    color: palette.amberSoft,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  timerValue: {
    color: palette.textStrong,
    fontSize: 54,
    lineHeight: 58,
    fontWeight: '900',
  },
  timerMeta: {
    color: '#cdbba7',
    fontSize: 16,
  },
  helperText: {
    color: '#e0d3c4',
    fontSize: 15,
    lineHeight: 22,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
  },
  metricsColumn: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  targetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  grid: {
    gap: 20,
  },
  gridWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  primaryColumn: {
    flex: 1.15,
    gap: 20,
  },
  secondaryColumn: {
    flex: 0.95,
    gap: 20,
  },
  targetStat: {
    gap: 8,
  },
  targetStatTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  targetStatLabel: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  targetStatValue: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  waterCopy: {
    color: palette.textSoft,
    lineHeight: 21,
  },
  questList: {
    gap: 12,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: palette.surfaceStrong,
    borderWidth: 1,
    borderColor: '#261d14',
  },
  questTextWrap: {
    flex: 1,
  },
  questTitle: {
    color: '#fff7eb',
    fontSize: 15,
    fontWeight: '700',
  },
  questMeta: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  questState: {
    color: '#f6c164',
    fontSize: 12,
    fontWeight: '700',
  },
  questStateDone: {
    color: palette.green,
  },
  badgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#1a302b',
    borderWidth: 1,
    borderColor: '#224940',
  },
  badgeText: {
    color: '#a7f6e2',
    fontWeight: '700',
  },
  stageCard: {
    gap: 12,
    padding: 18,
    borderRadius: 22,
    backgroundColor: palette.surfaceStrong,
    borderWidth: 1,
    borderColor: '#261d14',
  },
  stageTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stageAccent: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  stageMetaWrap: {
    flex: 1,
  },
  stageTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
  },
  stageMeta: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  stageState: {
    color: palette.amberSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  stageDetail: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 6,
  },
  historyCopy: {
    flex: 1,
  },
  historyTitle: {
    color: '#fff7eb',
    fontSize: 16,
    fontWeight: '700',
  },
  historyMeta: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  historyNote: {
    color: palette.textSoft,
    fontSize: 13,
    marginTop: 6,
  },
  historyBadge: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1e1913',
    color: '#d2c0ad',
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  historyBadgeHit: {
    backgroundColor: '#15352c',
    color: palette.green,
  },
});
