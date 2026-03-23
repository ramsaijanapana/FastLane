import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { FASTING_STAGES, TARGET_OPTIONS, WATER_PRESETS } from '../constants';
import { ThemePalette, useTheme } from '../theme';
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

const withAlpha = (color: string, alpha: string) => `${color}${alpha}`;

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
  const { theme: palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { width } = useWindowDimensions();
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
  const previewHours = activeFast
    ? elapsedHours
    : Math.max(Math.min(currentTarget - 0.01, 23.99), 0);
  const previewStageIndex = Math.max(
    FASTING_STAGES.findIndex(
      (stage) =>
        previewHours >= stage.startHour && previewHours < stage.endHour,
    ),
    0,
  );
  const [hoveredStageIndex, setHoveredStageIndex] = useState<number | null>(null);
  const [pinnedStageIndex, setPinnedStageIndex] = useState<number | null>(null);
  const detailStageIndex =
    hoveredStageIndex ?? pinnedStageIndex ?? (activeFast ? currentStageIndex : previewStageIndex);
  const detailStage = FASTING_STAGES[detailStageIndex] ?? FASTING_STAGES[0];
  const detailStageProgress = activeFast
    ? clamp(
        (elapsedHours - detailStage.startHour) /
          (detailStage.endHour - detailStage.startHour),
        0,
        1,
      )
    : detailStageIndex < previewStageIndex
      ? 1
      : detailStageIndex === previewStageIndex
        ? clamp(
            (currentTarget - detailStage.startHour) /
              (detailStage.endHour - detailStage.startHour),
            0,
            1,
          )
        : 0;
  const detailStageState = activeFast
    ? elapsedHours >= detailStage.endHour
      ? 'Done'
      : elapsedHours >= detailStage.startHour
        ? 'Current'
        : 'Next'
    : detailStageIndex === previewStageIndex
      ? 'Goal stage'
      : 'Preview';
  const wheelSize = isCompact ? clamp(width - 72, 280, 332) : 360;
  const nodeWidth = isCompact ? 78 : 94;
  const nodeHeight = isCompact ? 50 : 58;
  const orbitRadius = wheelSize / 2 - (isCompact ? 50 : 62);
  const centerSize = wheelSize - (isCompact ? 122 : 142);
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
  const stageSupportLine = activeFast
    ? `Live timer: ${formatDuration(elapsedMilliseconds)} elapsed. The wheel updates as your fast moves forward.`
    : `${currentTarget}h is selected, so the ring highlights where that goal lands before you start.`;

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
            <MetricTile value={`${mealsTodayCount}`} label="meals today" />
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
            subtitle="A clear read on fasting, water, calories, and weekly consistency."
          >
            <TargetRow
              label="Fast progress"
              value={
                activeFast
                  ? formatDuration(elapsedMilliseconds)
                  : completedTodayTarget
                    ? 'Target hit'
                    : 'Not started'
              }
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
            subtitle="Hover or tap any stage. The center always explains the selected phase."
          >
            <View style={styles.stageModule}>
              <View
                style={[
                  styles.stageWheel,
                  {
                    width: wheelSize,
                    height: wheelSize,
                  },
                ]}
              >
                <View
                  style={[
                    styles.stageWheelSurface,
                    {
                      borderRadius: wheelSize / 2,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.stageOuterRing,
                    {
                      width: wheelSize - 28,
                      height: wheelSize - 28,
                      borderRadius: (wheelSize - 28) / 2,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.stageInnerRing,
                    {
                      width: wheelSize - 94,
                      height: wheelSize - 94,
                      borderRadius: (wheelSize - 94) / 2,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.stageCenterCard,
                    {
                      width: centerSize,
                      minHeight: centerSize,
                      borderRadius: centerSize / 2,
                      borderColor: withAlpha(detailStage.accent, '55'),
                      backgroundColor:
                        palette.key === 'daylight' || palette.key === 'sunrise'
                          ? withAlpha(detailStage.accent, '10')
                          : withAlpha(detailStage.accent, '14'),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.stageStatePill,
                      {
                        borderColor: withAlpha(detailStage.accent, '55'),
                        backgroundColor: withAlpha(detailStage.accent, '18'),
                      },
                    ]}
                  >
                    <Text
                      style={[styles.stageStateText, { color: detailStage.accent }]}
                    >
                      {detailStageState}
                    </Text>
                  </View>
                  <Text style={styles.stageCenterTitle}>{detailStage.title}</Text>
                  <Text style={styles.stageCenterRange}>
                    {detailStage.startHour}h to {detailStage.endHour}h
                  </Text>
                  <Text style={styles.stageCenterBody}>{detailStage.detail}</Text>
                  <ProgressBar progress={detailStageProgress} accent={detailStage.accent} />
                  <Text style={styles.stageCenterMeta}>
                    {activeFast
                      ? `${formatHours(elapsedHours)} elapsed - target ${currentTarget}h`
                      : `${currentTarget}h target - tap around the ring to compare`}
                  </Text>
                </View>

                {stageNodes.map(({ stage, index, left, top }) => {
                  const isSelected = detailStageIndex === index;
                  const isCurrent = activeFast && currentStageIndex === index;
                  const isGoalStage = !activeFast && previewStageIndex === index;
                  const isDone = activeFast ? elapsedHours >= stage.endHour : index < previewStageIndex;
                  const nodeBackground = isSelected
                    ? withAlpha(stage.accent, palette.key === 'daylight' ? '18' : '22')
                    : isCurrent || isGoalStage
                      ? palette.surfaceMuted
                      : palette.surfaceStrong;

                  return (
                    <Pressable
                      key={stage.title}
                      onHoverIn={() => setHoveredStageIndex(index)}
                      onHoverOut={() =>
                        setHoveredStageIndex((current) =>
                          current === index ? null : current,
                        )
                      }
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
                          backgroundColor: nodeBackground,
                          borderColor: isSelected ? stage.accent : palette.borderSoft,
                        },
                        isDone && styles.stageNodeDone,
                        pressed && styles.stageNodePressed,
                      ]}
                    >
                      <View
                        style={[
                          styles.stageNodeDot,
                          {
                            backgroundColor:
                              isDone && !isSelected ? palette.green : stage.accent,
                          },
                        ]}
                      />
                      <Text style={styles.stageNodeHours}>
                        {stage.startHour}h-{stage.endHour}h
                      </Text>
                      <Text numberOfLines={2} style={styles.stageNodeTitle}>
                        {stage.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.stagePickerRow}>
                {FASTING_STAGES.map((stage, index) => {
                  const isSelected = detailStageIndex === index;

                  return (
                    <Pressable
                      key={`${stage.title}-picker`}
                      onPress={() =>
                        setPinnedStageIndex((current) =>
                          current === index ? null : index,
                        )
                      }
                      style={({ pressed }) => [
                        styles.stagePickerChip,
                        {
                          borderColor: isSelected ? stage.accent : palette.borderSoft,
                          backgroundColor: isSelected
                            ? withAlpha(stage.accent, '18')
                            : palette.surfaceStrong,
                        },
                        pressed && styles.stageNodePressed,
                      ]}
                    >
                      <View
                        style={[
                          styles.stagePickerDot,
                          { backgroundColor: stage.accent },
                        ]}
                      />
                      <Text style={styles.stagePickerText}>{stage.title}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.stageSupportLine}>{stageSupportLine}</Text>
            </View>
          </SectionCard>
        </View>

        <View style={styles.secondaryColumn}>
          <SectionCard
            title="Hydration"
            subtitle="Quick-add water while fasting or around meals."
          >
            <Text style={styles.waterCopy}>
              Daily goal: {settings.dailyWaterGoalMl} ml.
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
}) => {
  const { theme: palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.targetStat}>
      <View style={styles.targetStatTop}>
        <Text style={styles.targetStatLabel}>{label}</Text>
        <Text style={styles.targetStatValue}>{value}</Text>
      </View>
      <ProgressBar progress={progress} accent={accent} />
    </View>
  );
};

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
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
      color: palette.textSoft,
      fontSize: 16,
    },
    helperText: {
      color: palette.textSoft,
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
      borderColor: palette.borderSoft,
    },
    questTextWrap: {
      flex: 1,
    },
    questTitle: {
      color: palette.textStrong,
      fontSize: 15,
      fontWeight: '700',
    },
    questMeta: {
      color: palette.textMuted,
      fontSize: 13,
      marginTop: 4,
    },
    questState: {
      color: palette.amberSoft,
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
      backgroundColor: palette.surfaceMuted,
      borderWidth: 1,
      borderColor: palette.borderSoft,
    },
    badgeText: {
      color: palette.text,
      fontWeight: '700',
    },
    stageModule: {
      gap: 14,
      alignItems: 'center',
    },
    stageWheel: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stageWheelSurface: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: palette.surfaceStrong,
      borderWidth: 1,
      borderColor: palette.borderSoft,
    },
    stageOuterRing: {
      position: 'absolute',
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: palette.borderSoft,
    },
    stageInnerRing: {
      position: 'absolute',
      borderWidth: 1,
      borderColor: palette.border,
    },
    stageCenterCard: {
      paddingHorizontal: 20,
      paddingVertical: 18,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1.5,
    },
    stageStatePill: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: 1,
    },
    stageStateText: {
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.9,
    },
    stageCenterTitle: {
      color: palette.textStrong,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '900',
      textAlign: 'center',
    },
    stageCenterRange: {
      color: palette.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    stageCenterBody: {
      color: palette.textSoft,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    stageCenterMeta: {
      color: palette.textMuted,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
    },
    stageNode: {
      position: 'absolute',
      borderRadius: 18,
      paddingVertical: 8,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      borderWidth: 1,
    },
    stageNodeDone: {
      opacity: 0.94,
    },
    stageNodePressed: {
      opacity: 0.8,
    },
    stageNodeDot: {
      width: 10,
      height: 10,
      borderRadius: 999,
    },
    stageNodeHours: {
      color: palette.textMuted,
      fontSize: 10,
      fontWeight: '700',
    },
    stageNodeTitle: {
      color: palette.textStrong,
      fontSize: 11,
      lineHeight: 13,
      fontWeight: '800',
      textAlign: 'center',
    },
    stagePickerRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 10,
    },
    stagePickerChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
    },
    stagePickerDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
    },
    stagePickerText: {
      color: palette.text,
      fontSize: 12,
      fontWeight: '700',
    },
    stageSupportLine: {
      color: palette.textMuted,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
      maxWidth: 520,
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
      color: palette.textStrong,
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
      backgroundColor: palette.surfaceMuted,
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: '700',
      overflow: 'hidden',
    },
    historyBadgeHit: {
      backgroundColor: withAlpha(palette.green, palette.key === 'daylight' ? '20' : '16'),
      color: palette.green,
    },
  });
