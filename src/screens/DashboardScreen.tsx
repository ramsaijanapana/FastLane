import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  const currentStageIndex = Math.max(
    FASTING_STAGES.findIndex((stage) => stage.title === currentStage.title),
    0,
  );
  const [hoveredStageIndex, setHoveredStageIndex] = useState<number | null>(null);
  const [pinnedStageIndex, setPinnedStageIndex] = useState<number | null>(null);
  const wheelSize = isCompact ? 300 : 340;
  const nodeWidth = isCompact ? 82 : 94;
  const nodeHeight = isCompact ? 54 : 58;
  const orbitRadius = wheelSize / 2 - (isCompact ? 56 : 64);
  const detailStageIndex =
    hoveredStageIndex ?? pinnedStageIndex ?? currentStageIndex ?? 0;
  const detailStage = FASTING_STAGES[detailStageIndex] ?? FASTING_STAGES[0];
  const detailStageProgress = activeFast
    ? clamp(
        (elapsedHours - detailStage.startHour) /
          (detailStage.endHour - detailStage.startHour),
        0,
        1,
      )
    : detailStageIndex === 0
      ? fastProgress
      : 0;
  const detailStageState = !activeFast
    ? detailStageIndex === 0
      ? 'Preview'
      : 'Tap to preview'
    : elapsedHours >= detailStage.endHour
      ? 'Completed'
      : elapsedHours >= detailStage.startHour
        ? 'Live now'
        : 'Up next';
  const stageNodes = useMemo(
    () =>
      FASTING_STAGES.map((stage, index) => {
        const angle = -Math.PI / 2 + (index / FASTING_STAGES.length) * Math.PI * 2;
        const left = wheelSize / 2 + Math.cos(angle) * orbitRadius - nodeWidth / 2;
        const top = wheelSize / 2 + Math.sin(angle) * orbitRadius - nodeHeight / 2;

        return {
          stage,
          index,
          left,
          top,
        };
      }),
    [nodeHeight, nodeWidth, orbitRadius, wheelSize],
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
            subtitle="Hover stages on web, or tap them on mobile, to inspect what each checkpoint means."
          >
            <View style={[styles.stageExplorer, !isCompact && styles.stageExplorerWide]}>
              <View style={styles.stageOrbitWrap}>
                <View
                  style={[
                    styles.stageOrbit,
                    {
                      width: wheelSize,
                      height: wheelSize,
                      borderRadius: wheelSize / 2,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.stageOrbitRing,
                      {
                        width: wheelSize - 54,
                        height: wheelSize - 54,
                        borderRadius: (wheelSize - 54) / 2,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.stageOrbitCore,
                      {
                        width: wheelSize - 158,
                        height: wheelSize - 158,
                        borderRadius: (wheelSize - 158) / 2,
                      },
                    ]}
                  />
                  <View style={styles.stageCenterBadge}>
                    <Text style={styles.stageCenterLabel}>
                      {activeFast ? 'Current fast' : 'Stage map'}
                    </Text>
                    <Text style={styles.stageCenterValue}>
                      {activeFast ? formatDuration(elapsedMilliseconds) : `${selectedTarget}h`}
                    </Text>
                    <Text style={styles.stageCenterMeta}>
                      {activeFast ? currentStage.title : 'Tap any stage'}
                    </Text>
                  </View>

                  {stageNodes.map(({ stage, index, left, top }) => {
                    const isSelected = detailStageIndex === index;
                    const isCurrent =
                      activeFast &&
                      elapsedHours >= stage.startHour &&
                      elapsedHours < stage.endHour;
                    const isComplete = activeFast ? elapsedHours >= stage.endHour : false;

                    return (
                      <Pressable
                        key={stage.title}
                        onHoverIn={() => setHoveredStageIndex(index)}
                        onHoverOut={() => setHoveredStageIndex((current) =>
                          current === index ? null : current,
                        )}
                        onPress={() =>
                          setPinnedStageIndex((current) =>
                            current === index ? null : index,
                          )
                        }
                        style={({ pressed }) => [
                          styles.stageNode,
                          {
                            width: nodeWidth,
                            minHeight: nodeHeight,
                            left,
                            top,
                            borderColor: isSelected ? stage.accent : '#2f271e',
                            backgroundColor: isSelected
                              ? 'rgba(255, 248, 239, 0.96)'
                              : isCurrent
                                ? '#1f2217'
                                : isComplete
                                  ? '#18261f'
                                  : palette.surfaceStrong,
                          },
                          pressed && styles.stageNodePressed,
                        ]}
                      >
                        <View
                          style={[
                            styles.stageNodeAccent,
                            { backgroundColor: stage.accent },
                          ]}
                        />
                        <Text
                          style={[
                            styles.stageNodeHours,
                            isSelected && styles.stageNodeHoursSelected,
                          ]}
                        >
                          {stage.startHour}h-{stage.endHour}h
                        </Text>
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.stageNodeTitle,
                            isSelected && styles.stageNodeTitleSelected,
                          ]}
                        >
                          {stage.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.stageHint}>
                  Hover a stage for a quick read, or tap once to pin its details.
                </Text>
              </View>

              <View style={styles.stageDetailPanel}>
                <View style={styles.stageDetailHeader}>
                  <View
                    style={[
                      styles.stageDetailSwatch,
                      { backgroundColor: detailStage.accent },
                    ]}
                  />
                  <View style={styles.stageDetailCopy}>
                    <Text style={styles.stageDetailTitle}>{detailStage.title}</Text>
                    <Text style={styles.stageDetailMeta}>
                      {detailStage.startHour}h to {detailStage.endHour}h
                    </Text>
                  </View>
                  <Text style={styles.stageDetailState}>{detailStageState}</Text>
                </View>
                <Text style={styles.stageDetailBody}>{detailStage.detail}</Text>
                <ProgressBar progress={detailStageProgress} accent={detailStage.accent} />
                <Text style={styles.stageDetailFootnote}>
                  {activeFast
                    ? `You are ${formatHours(elapsedHours)} into the current fast.`
                    : 'Start a fast to see the stage wheel follow your live progress.'}
                </Text>
              </View>
            </View>
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
  stageExplorer: {
    gap: 18,
  },
  stageExplorerWide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageOrbitWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  stageOrbit: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 11, 8, 0.92)',
    borderWidth: 1,
    borderColor: '#2f271e',
    overflow: 'hidden',
  },
  stageOrbitRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderStyle: 'dashed',
  },
  stageOrbitCore: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
  },
  stageCenterBadge: {
    width: 148,
    minHeight: 148,
    borderRadius: 999,
    backgroundColor: 'rgba(24, 18, 12, 0.95)',
    borderWidth: 1,
    borderColor: '#3a2d1e',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 18,
  },
  stageCenterLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  stageCenterValue: {
    color: '#fff7eb',
    fontSize: 24,
    fontWeight: '900',
  },
  stageCenterMeta: {
    color: palette.textSoft,
    fontSize: 13,
    textAlign: 'center',
  },
  stageNode: {
    position: 'absolute',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  stageNodePressed: {
    opacity: 0.86,
  },
  stageNodeAccent: {
    width: 14,
    height: 4,
    borderRadius: 999,
  },
  stageNodeHours: {
    color: palette.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  stageNodeHoursSelected: {
    color: '#1a140e',
  },
  stageNodeTitle: {
    color: '#fff7eb',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  stageNodeTitleSelected: {
    color: '#1a140e',
  },
  stageHint: {
    color: palette.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  stageDetailPanel: {
    flex: 0.88,
    gap: 14,
    padding: 22,
    borderRadius: 24,
    backgroundColor: palette.surfaceStrong,
    borderWidth: 1,
    borderColor: '#261d14',
  },
  stageDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stageDetailSwatch: {
    width: 14,
    height: 42,
    borderRadius: 999,
  },
  stageDetailCopy: {
    flex: 1,
  },
  stageDetailTitle: {
    color: palette.text,
    fontSize: 19,
    fontWeight: '800',
  },
  stageDetailMeta: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: 3,
  },
  stageDetailState: {
    color: palette.amberSoft,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stageDetailBody: {
    color: palette.textSoft,
    fontSize: 15,
    lineHeight: 23,
  },
  stageDetailFootnote: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 19,
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
