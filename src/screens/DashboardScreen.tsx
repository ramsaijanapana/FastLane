import React, { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { ViewStyle } from 'react-native';

import { FASTING_STAGES, TARGET_OPTIONS, WATER_PRESETS } from '../constants';
import { ThemePalette, useTheme } from '../theme';
import type {
  FastSession,
  FastingStage,
  QuestStatus,
  TabKey,
  UserSettings,
} from '../types';
import {
  clamp,
  formatClock,
  formatDateInputValue,
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
  onUpdateActiveFastStartTime: (timestamp: number) => void;
  onAddWater: (amountMl: number) => void;
  onOpenTab: (tab: TabKey) => void;
};

type DashboardWindow = 'home' | 'targets' | 'hydration' | 'game' | 'history';
type StartPickerPanel = 'date' | 'hour' | 'minute' | 'period' | null;
type Meridiem = 'AM' | 'PM';

const withAlpha = (color: string, alpha: string) => `${color}${alpha}`;
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => index);

const formatDateOptionLabel = (timestamp: number, now: number) => {
  const date = new Date(timestamp);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const candidate = new Date(timestamp);
  candidate.setHours(0, 0, 0, 0);
  const deltaDays = Math.round((today.getTime() - candidate.getTime()) / 86400000);

  if (deltaDays === 0) {
    return 'Today';
  }

  if (deltaDays === 1) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const getRecentDateOptions = (now: number) =>
  Array.from({ length: 14 }, (_, index) => {
    const candidate = new Date(now);
    candidate.setHours(0, 0, 0, 0);
    candidate.setDate(candidate.getDate() - index);

    return {
      value: formatDateInputValue(candidate.getTime()),
      label: formatDateOptionLabel(candidate.getTime(), now),
    };
  });

const getPickerStateFromTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  const hour24 = date.getHours();

  return {
    dateValue: formatDateInputValue(timestamp),
    hour12: hour24 % 12 || 12,
    minute: date.getMinutes(),
    period: (hour24 >= 12 ? 'PM' : 'AM') as Meridiem,
  };
};

const buildTimestampFromPicker = (
  dateValue: string,
  hour12: number,
  minute: number,
  period: Meridiem,
) => {
  const [year, month, day] = dateValue.split('-').map((value) => Number.parseInt(value, 10));

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour12) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }

  let hour24 = hour12 % 12;

  if (period === 'PM') {
    hour24 += 12;
  }

  const parsed = new Date(year, month - 1, day, hour24, minute, 0, 0);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hour24 ||
    parsed.getMinutes() !== minute
  ) {
    return null;
  }

  return parsed.getTime();
};

const formatPickerTimeLabel = (hour12: number, minute: number, period: Meridiem) =>
  `${hour12}:${String(minute).padStart(2, '0')} ${period}`;

const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const createDonutSlicePath = (
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
) => {
  const outerStart = polarToCartesian(centerX, centerY, outerRadius, startAngle);
  const outerEnd = polarToCartesian(centerX, centerY, outerRadius, endAngle);
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, endAngle);
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
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
  onUpdateActiveFastStartTime,
  onAddWater,
  onOpenTab,
}: DashboardScreenProps) => {
  const { theme: palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { width, height } = useWindowDimensions();
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
  const [activeWindow, setActiveWindow] = useState<DashboardWindow>('home');
  const [showStartEditor, setShowStartEditor] = useState(false);
  const [startDateValue, setStartDateValue] = useState('');
  const [startHourValue, setStartHourValue] = useState(12);
  const [startMinuteValue, setStartMinuteValue] = useState(0);
  const [startPeriodValue, setStartPeriodValue] = useState<Meridiem>('AM');
  const [openStartPicker, setOpenStartPicker] = useState<StartPickerPanel>(null);
  const [startEditorStatus, setStartEditorStatus] = useState('');
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
      ? 'Completed'
      : elapsedHours >= detailStage.startHour
        ? 'Current stage'
        : 'Next stage'
    : detailStageIndex === previewStageIndex
      ? 'Goal stage'
      : 'Stage preview';
  const wheelSize = isCompact ? clamp(width - 72, 272, 320) : clamp(height - 650, 268, 292);
  const outerRadius = wheelSize / 2 - 14;
  const ringThickness = isCompact ? 30 : 36;
  const innerRadius = outerRadius - ringThickness;
  const centerSize = innerRadius * 2 - (isCompact ? 4 : 8);
  const compactStageCenter = isCompact || centerSize < 228;
  const totalStageHours = FASTING_STAGES.reduce(
    (total, stage) => total + Math.max(stage.endHour - stage.startHour, 0),
    0,
  );
  const gapAngle = 3;
  const stageSlices = useMemo(
    () => {
      let currentAngle = 0;

      return FASTING_STAGES.map((stage, index) => {
        const stageHours = Math.max(stage.endHour - stage.startHour, 0);
        const sweepAngle = (stageHours / Math.max(totalStageHours, 1)) * 360;
        const startAngle = currentAngle + gapAngle / 2;
        const endAngle = currentAngle + sweepAngle - gapAngle / 2;
        currentAngle += sweepAngle;

        return {
          stage,
          index,
          path: createDonutSlicePath(
            wheelSize / 2,
            wheelSize / 2,
            innerRadius,
            outerRadius,
            startAngle,
            endAngle,
          ),
        };
      });
    },
    [gapAngle, innerRadius, outerRadius, totalStageHours, wheelSize],
  );
  const stageSupportLine = activeFast
    ? `Live timer: ${formatDuration(elapsedMilliseconds)} elapsed. Tap any slice to compare the current stage with what comes next.`
    : `${currentTarget}h is selected, so ${detailStage.title.toLowerCase()} is highlighted by default. Tap any slice to compare stages.`;
  const completedQuestCount = quests.filter((quest) => quest.done).length;
  const recentWindowSummary =
    fastHistory.length > 0 ? formatHours(getCompletedFastHours(fastHistory[0])) : 'No logs';
  const startDateOptions = useMemo(() => getRecentDateOptions(now), [now]);
  const selectedDateLabel =
    startDateOptions.find((option) => option.value === startDateValue)?.label ??
    startDateValue;
  const selectedTimeLabel = formatPickerTimeLabel(
    startHourValue,
    startMinuteValue,
    startPeriodValue,
  );

  useEffect(() => {
    if (!activeFast) {
      setShowStartEditor(false);
      setStartDateValue('');
      setStartHourValue(12);
      setStartMinuteValue(0);
      setStartPeriodValue('AM');
      setOpenStartPicker(null);
      setStartEditorStatus('');
      return;
    }

    const pickerState = getPickerStateFromTimestamp(activeFast.startTime);

    setStartDateValue(pickerState.dateValue);
    setStartHourValue(pickerState.hour12);
    setStartMinuteValue(pickerState.minute);
    setStartPeriodValue(pickerState.period);
    setOpenStartPicker(null);
    setStartEditorStatus('');
  }, [activeFast]);

  const closeStartEditor = () => {
    setShowStartEditor(false);
    setOpenStartPicker(null);
    setStartEditorStatus('');
  };

  const handleStartEditorSave = () => {
    const parsedStartTime = buildTimestampFromPicker(
      startDateValue,
      startHourValue,
      startMinuteValue,
      startPeriodValue,
    );

    if (!parsedStartTime) {
      setStartEditorStatus('Choose a recent date and time to adjust the start.');
      return;
    }

    if (parsedStartTime >= now) {
      setStartEditorStatus('Start time must be earlier than the current time.');
      return;
    }

    if (now - parsedStartTime > 14 * 24 * 3600000) {
      setStartEditorStatus('Keep the adjustment within the last 14 days.');
      return;
    }

    onUpdateActiveFastStartTime(parsedStartTime);
    setStartEditorStatus('Fast start updated.');
    setOpenStartPicker(null);
    setShowStartEditor(false);
  };

  return (
    <View style={styles.wrap}>
      {activeWindow === 'home' ? (
        <SectionCard
          title={activeFast ? 'Active Fast' : 'Ready For The Next Window'}
          subtitle="Quick actions, stage overview, and direct links into the deeper views."
          style={styles.homeSurface}
        >
          <View style={[styles.homeShell, !isCompact && styles.homeShellWide]}>
            <View style={styles.homeLeadColumn}>
              <Text style={styles.timerLabel}>
                {activeFast ? 'Current timer' : 'Suggested target'}
              </Text>
              <Text style={styles.timerValue}>
                {activeFast ? formatDuration(elapsedMilliseconds) : `${selectedTarget}h`}
              </Text>
              <Text style={styles.timerMeta}>
                {activeFast ? `${currentStage.title} stage` : 'Pick a window and start when ready'}
              </Text>
              {activeFast ? (
                <Text style={styles.startMeta}>
                  Started {formatShortDate(activeFast.startTime)} at{' '}
                  {formatClock(activeFast.startTime)}
                </Text>
              ) : null}
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
              {activeFast ? (
                <View style={styles.startEditToggleRow}>
                  <ActionButton
                    label="Edit Start Time"
                    onPress={() => {
                      setShowStartEditor(true);
                      setOpenStartPicker('date');
                      setStartEditorStatus('');
                    }}
                    tone="secondary"
                  />
                </View>
              ) : null}
              <View style={styles.quickActionRow}>
                <ActionButton
                  label="Log Meal"
                  onPress={() => onOpenTab('journal')}
                  tone="secondary"
                />
                <ActionButton
                  label={`Add ${WATER_PRESETS[0]} ml`}
                  onPress={() => onAddWater(WATER_PRESETS[0])}
                  tone="secondary"
                />
                <ActionButton
                  label="Open Insights"
                  onPress={() => onOpenTab('insights')}
                  tone="secondary"
                />
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
            </View>

            <View style={styles.homeStageColumn}>
              <Text style={styles.homeSectionLabel}>Fasting Stages</Text>
              <View style={styles.stageModule}>
                <View
                  style={[
                    styles.stageDial,
                    {
                      width: wheelSize,
                      height: wheelSize,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.stageDialSurface,
                      {
                        borderRadius: wheelSize / 2,
                      },
                    ]}
                  />
                  <Svg
                    width={wheelSize}
                    height={wheelSize}
                    style={styles.stageSvg as never}
                  >
                    {stageSlices.map(({ stage, index, path }) => {
                      const isSelected = detailStageIndex === index;
                      const isCurrent = activeFast && currentStageIndex === index;
                      const isGoalStage = !activeFast && previewStageIndex === index;
                      const sliceFill = isCurrent || isGoalStage
                        ? stage.accent
                        : isSelected
                          ? withAlpha(stage.accent, palette.key === 'daylight' ? 'c8' : 'b8')
                          : withAlpha(stage.accent, palette.key === 'daylight' ? '12' : '10');
                      const sliceStroke = isCurrent || isGoalStage
                        ? stage.accent
                        : isSelected
                        ? stage.accent
                        : withAlpha(stage.accent, '58');
                      const hoverProps: Record<string, unknown> =
                        Platform.OS === 'web'
                          ? {
                              onMouseEnter: () => setHoveredStageIndex(index),
                              onMouseLeave: () =>
                                setHoveredStageIndex((current) =>
                                  current === index ? null : current,
                                ),
                            }
                          : {};
                      const interactiveProps = {
                        onPress: () =>
                          setPinnedStageIndex((current) =>
                            current === index ? null : index,
                          ),
                        ...hoverProps,
                      } as Record<string, unknown>;

                      return (
                        <Path
                          key={stage.title}
                          d={path}
                          fill={sliceFill}
                          stroke={sliceStroke}
                          strokeWidth={isSelected ? 3.5 : 2}
                          {...(interactiveProps as object)}
                        />
                      );
                    })}
                  </Svg>

                  <View
                    pointerEvents="none"
                    style={[
                      styles.stageCenterCore,
                      {
                        width: centerSize,
                        height: centerSize,
                        borderRadius: centerSize / 2,
                        borderColor: withAlpha(detailStage.accent, '55'),
                        backgroundColor: palette.surfaceStrong,
                        paddingHorizontal: compactStageCenter ? 12 : 16,
                        paddingVertical: compactStageCenter ? 12 : 16,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.stageCenterContent,
                        compactStageCenter && styles.stageCenterContentCompact,
                      ]}
                    >
                      <View
                        style={[
                          styles.stageStatePill,
                          compactStageCenter && styles.stageStatePillCompact,
                          {
                            borderColor: withAlpha(detailStage.accent, '55'),
                            backgroundColor: withAlpha(detailStage.accent, '18'),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stageStateText,
                            compactStageCenter && styles.stageStateTextCompact,
                            { color: detailStage.accent },
                          ]}
                        >
                          {detailStageState}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.stageCenterTitle,
                          compactStageCenter && styles.stageCenterTitleCompact,
                        ]}
                      >
                        {detailStage.title}
                      </Text>
                      <Text
                        style={[
                          styles.stageCenterRange,
                          compactStageCenter && styles.stageCenterRangeCompact,
                        ]}
                      >
                        {detailStage.startHour}h to {detailStage.endHour}h
                      </Text>
                      <Text
                        style={[
                          styles.stageCenterBody,
                          compactStageCenter && styles.stageCenterBodyCompact,
                        ]}
                      >
                        {detailStage.detail}
                      </Text>
                      {!compactStageCenter ? (
                        <View
                          style={[
                            styles.stageMiniMeter,
                            { backgroundColor: withAlpha(detailStage.accent, '18') },
                          ]}
                        >
                          <View
                            style={[
                              styles.stageMiniMeterFill,
                              {
                                width: `${Math.max(detailStageProgress * 100, detailStageProgress > 0 ? 10 : 0)}%`,
                                backgroundColor: detailStage.accent,
                              },
                            ]}
                          />
                        </View>
                      ) : null}
                      {!compactStageCenter ? (
                        <Text style={styles.stageCenterMeta}>
                          {activeFast
                            ? `${formatHours(elapsedHours)} elapsed`
                            : `${currentTarget}h target selected`}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>

                {isCompact ? (
                  <Text style={styles.stageSupportLine}>{stageSupportLine}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.homeSummaryColumn}>
              <Text style={styles.homeSectionLabel}>Today</Text>
              <View style={styles.homeMetricsGrid}>
                <HomeMetricTile value={`${streak}`} label="day streak" />
                <HomeMetricTile value={`${mealsTodayCount}`} label="meals today" />
                <HomeMetricTile value={formatMl(waterTodayMl)} label="water today" />
                <HomeMetricTile value={`${caloriesToday}`} label="calories today" />
              </View>
              <Text style={styles.homeSectionLabel}>Open A Detail View</Text>
              <View style={styles.windowLauncherGrid}>
                <WindowLauncherCard
                  title="Daily Targets"
                  value={
                    activeFast
                      ? formatDuration(elapsedMilliseconds)
                      : completedTodayTarget
                        ? 'Done today'
                        : `${selectedTarget}h`
                  }
                  hint="Fast progress, calories, water, and weekly consistency."
                  accent={palette.amber}
                  onPress={() => setActiveWindow('targets')}
                  style={!isCompact ? styles.windowLauncherCardWide : undefined}
                />
                <WindowLauncherCard
                  title="Hydration"
                  value={formatMl(waterTodayMl)}
                  hint={`Goal: ${settings.dailyWaterGoalMl} ml with quick-add presets.`}
                  accent={palette.teal}
                  onPress={() => setActiveWindow('hydration')}
                  style={!isCompact ? styles.windowLauncherCardWide : undefined}
                />
                <WindowLauncherCard
                  title="Daily Game Loop"
                  value={`${completedQuestCount}/${quests.length}`}
                  hint="See quests, badges, and what to do next."
                  accent={palette.purple}
                  onPress={() => setActiveWindow('game')}
                  style={!isCompact ? styles.windowLauncherCardWide : undefined}
                />
                <WindowLauncherCard
                  title="Recent Windows"
                  value={recentWindowSummary}
                  hint="Open your latest fasting sessions without scanning the whole page."
                  accent={palette.cyan}
                  onPress={() => setActiveWindow('history')}
                  style={!isCompact ? styles.windowLauncherCardWide : undefined}
                />
              </View>
            </View>
          </View>
        </SectionCard>
      ) : (
        <SectionCard
          title={
            activeWindow === 'targets'
              ? 'Daily Targets'
              : activeWindow === 'hydration'
                ? 'Hydration'
                : activeWindow === 'game'
                  ? 'Daily Game Loop'
                  : 'Recent Windows'
          }
          subtitle={
            activeWindow === 'targets'
              ? 'A focused read on fasting, water, calories, and weekly consistency.'
              : activeWindow === 'hydration'
                ? 'Use presets here or from home when you need quick logging.'
                : activeWindow === 'game'
                  ? 'Quest progress, rewards, and links into the rest of the app.'
                  : 'Your latest fasting sessions, with a direct path to the journal.'
          }
        >
          <View style={styles.detailTopBar}>
            <ActionButton
              label="Back To Home"
              onPress={() => setActiveWindow('home')}
              tone="secondary"
            />
            {activeWindow === 'history' ? (
              <ActionButton
                label="Open Journal"
                onPress={() => onOpenTab('journal')}
                tone="secondary"
              />
            ) : null}
            {activeWindow === 'targets' ? (
              <ActionButton
                label="Open Insights"
                onPress={() => onOpenTab('insights')}
                tone="secondary"
              />
            ) : null}
          </View>

          {activeWindow === 'targets' ? (
            <>
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
            </>
          ) : null}

          {activeWindow === 'hydration' ? (
            <>
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
            </>
          ) : null}

          {activeWindow === 'game' ? (
            <>
              <View style={styles.questList}>
                {quests.map((quest) => (
                  <View key={quest.title} style={styles.questRow}>
                    <View style={styles.questTextWrap}>
                      <Text style={styles.questTitle}>{quest.title}</Text>
                      <Text style={styles.questMeta}>{quest.progressLabel}</Text>
                    </View>
                    <View style={styles.questActionWrap}>
                      {quest.done ? (
                        <Text style={[styles.questState, styles.questStateDone]}>
                          Cleared
                        </Text>
                      ) : (
                        <ActionButton
                          label={quest.actionLabel ?? 'Open'}
                          onPress={() => onOpenTab(quest.actionTab ?? 'dashboard')}
                          tone="secondary"
                        />
                      )}
                    </View>
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
            </>
          ) : null}

          {activeWindow === 'history' ? (
            fastHistory.length === 0 ? (
              <EmptyState text="Finish your first window to build history and insights." />
            ) : (
              fastHistory.slice(0, 6).map((session) => {
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
            )
          ) : null}
        </SectionCard>
      )}
      {activeFast && showStartEditor ? (
        <View style={styles.startEditorModalRoot}>
          <Pressable style={styles.startEditorBackdrop} onPress={closeStartEditor} />
          <View style={styles.startEditorModalCenter} pointerEvents="box-none">
            <View style={styles.startEditorModalCard}>
              <View style={styles.startEditorModalAccent} />
              <View style={styles.startEditorModalHeader}>
                <View style={styles.startEditorHeaderCopy}>
                  <Text style={styles.startEditorModalEyebrow}>Adjust Start Time</Text>
                  <Text style={styles.startEditorModalTitle}>
                    Forgot to start earlier? Pick the corrected start time.
                  </Text>
                  <Text style={styles.startEditorSummary}>
                    Selected start: {selectedDateLabel} at {selectedTimeLabel}
                  </Text>
                </View>
                <ActionButton label="Close" onPress={closeStartEditor} tone="secondary" />
              </View>

              <View style={styles.startPickerRow}>
                <PickerField
                  label="Date"
                  value={selectedDateLabel}
                  isOpen={openStartPicker === 'date'}
                  onPress={() =>
                    setOpenStartPicker((current) => (current === 'date' ? null : 'date'))
                  }
                  style={styles.startPickerFieldWide}
                />
                <PickerField
                  label="Hour"
                  value={String(startHourValue)}
                  isOpen={openStartPicker === 'hour'}
                  onPress={() =>
                    setOpenStartPicker((current) => (current === 'hour' ? null : 'hour'))
                  }
                />
                <PickerField
                  label="Min"
                  value={String(startMinuteValue).padStart(2, '0')}
                  isOpen={openStartPicker === 'minute'}
                  onPress={() =>
                    setOpenStartPicker((current) => (current === 'minute' ? null : 'minute'))
                  }
                />
                <PickerField
                  label="AM / PM"
                  value={startPeriodValue}
                  isOpen={openStartPicker === 'period'}
                  onPress={() =>
                    setOpenStartPicker((current) => (current === 'period' ? null : 'period'))
                  }
                />
              </View>

              <View style={styles.startPickerRail}>
                {openStartPicker === 'date' ? (
                  <ScrollView
                    horizontal
                    style={styles.startPickerTray}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.startPickerOptions}
                  >
                    {startDateOptions.map((option) => (
                      <PickerOption
                        key={option.value}
                        label={option.label}
                        selected={option.value === startDateValue}
                        onPress={() => {
                          setStartDateValue(option.value);
                          setStartEditorStatus('');
                          setOpenStartPicker(null);
                        }}
                      />
                    ))}
                  </ScrollView>
                ) : null}
                {openStartPicker === 'hour' ? (
                  <ScrollView
                    horizontal
                    style={styles.startPickerTray}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.startPickerOptions}
                  >
                    {HOUR_OPTIONS.map((hour) => (
                      <PickerOption
                        key={hour}
                        label={String(hour)}
                        selected={hour === startHourValue}
                        onPress={() => {
                          setStartHourValue(hour);
                          setStartEditorStatus('');
                          setOpenStartPicker(null);
                        }}
                      />
                    ))}
                  </ScrollView>
                ) : null}
                {openStartPicker === 'minute' ? (
                  <ScrollView
                    horizontal
                    style={styles.startPickerTray}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.startPickerOptions}
                  >
                    {MINUTE_OPTIONS.map((minute) => (
                      <PickerOption
                        key={minute}
                        label={String(minute).padStart(2, '0')}
                        selected={minute === startMinuteValue}
                        onPress={() => {
                          setStartMinuteValue(minute);
                          setStartEditorStatus('');
                          setOpenStartPicker(null);
                        }}
                      />
                    ))}
                  </ScrollView>
                ) : null}
                {openStartPicker === 'period' ? (
                  <View style={styles.startPickerTrayStatic}>
                    <View style={styles.startPickerOptions}>
                      {(['AM', 'PM'] as Meridiem[]).map((period) => (
                        <PickerOption
                          key={period}
                          label={period}
                          selected={period === startPeriodValue}
                          onPress={() => {
                            setStartPeriodValue(period);
                            setStartEditorStatus('');
                            setOpenStartPicker(null);
                          }}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
                {openStartPicker === null ? (
                  <View style={styles.startPickerHintSurface}>
                    <Text style={styles.startEditorHint}>
                      Pick the date, hour, minute, and AM or PM. The timer and stage ring update immediately.
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.startEditorActionRow}>
                <ActionButton label="Apply Start Time" onPress={handleStartEditorSave} />
                <ActionButton
                  label="Reset"
                  onPress={() => {
                    if (!activeFast) {
                      return;
                    }

                    const pickerState = getPickerStateFromTimestamp(activeFast.startTime);
                    setStartDateValue(pickerState.dateValue);
                    setStartHourValue(pickerState.hour12);
                    setStartMinuteValue(pickerState.minute);
                    setStartPeriodValue(pickerState.period);
                    setOpenStartPicker('date');
                    setStartEditorStatus('');
                  }}
                  tone="secondary"
                />
              </View>

              {startEditorStatus ? (
                <Text style={styles.startEditorStatus}>{startEditorStatus}</Text>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}
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

const HomeMetricTile = ({
  value,
  label,
}: {
  value: string;
  label: string;
}) => {
  const { theme: palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.homeMetricTile}>
      <Text style={styles.homeMetricValue}>{value}</Text>
      <Text style={styles.homeMetricLabel}>{label}</Text>
    </View>
  );
};

const WindowLauncherCard = ({
  title,
  value,
  hint,
  accent,
  onPress,
  style,
}: {
  title: string;
  value: string;
  hint: string;
  accent: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) => {
  const { theme: palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.windowLauncherCard,
        style,
        { borderColor: withAlpha(accent, palette.key === 'daylight' ? '44' : '38') },
        pressed && styles.windowLauncherCardPressed,
      ]}
    >
      <Text style={[styles.windowLauncherEyebrow, { color: accent }]}>Detail view</Text>
      <Text style={styles.windowLauncherValue}>{value}</Text>
      <Text style={styles.windowLauncherTitle}>{title}</Text>
      <Text numberOfLines={2} style={styles.windowLauncherHint}>
        {hint}
      </Text>
      <Text style={[styles.windowLauncherLink, { color: accent }]}>Open window</Text>
    </Pressable>
  );
};

const PickerField = ({
  label,
  value,
  isOpen,
  onPress,
  style,
}: {
  label: string;
  value: string;
  isOpen?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) => {
  const { theme: palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.startPickerField,
        style,
        isOpen && styles.startPickerFieldOpen,
        pressed && styles.startPickerFieldPressed,
      ]}
    >
      <Text style={styles.startPickerFieldLabel}>{label}</Text>
      <View style={styles.startPickerFieldValueRow}>
        <Text numberOfLines={1} style={styles.startPickerFieldValue}>
          {value}
        </Text>
        <Text style={styles.startPickerFieldCaret}>{isOpen ? '▲' : '▼'}</Text>
      </View>
    </Pressable>
  );
};

const PickerOption = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) => {
  const { theme: palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.startPickerOption,
        selected && styles.startPickerOptionSelected,
        pressed && styles.startPickerOptionPressed,
      ]}
    >
      <Text
        style={[
          styles.startPickerOptionText,
          selected && styles.startPickerOptionTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      gap: 16,
      minHeight: 0,
      position: 'relative',
    },
    heroBody: {
      gap: 16,
    },
    heroBodyWide: {
      flexDirection: 'row',
    },
    homeSurface: {
      flex: 1,
    },
    homeShell: {
      gap: 16,
    },
    homeShellWide: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    homeLeadColumn: {
      flex: 1.05,
      gap: 12,
    },
    homeStageColumn: {
      flex: 0.95,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    homeSummaryColumn: {
      flex: 1,
      gap: 12,
    },
    homeSectionLabel: {
      color: palette.amberSoft,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1.2,
    },
    homeMetricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
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
    startMeta: {
      color: palette.textMuted,
      fontSize: 13,
      lineHeight: 18,
      marginTop: -2,
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
    startEditToggleRow: {
      marginTop: -2,
    },
    startEditorModalRoot: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: withAlpha('#000000', palette.key === 'daylight' ? '5c' : '78'),
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 24,
      zIndex: 40,
    },
    startEditorBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    startEditorModalCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    startEditorModalCard: {
      width: '100%',
      maxWidth: 680,
      borderRadius: 28,
      padding: 22,
      backgroundColor: palette.surfaceStrong,
      borderWidth: 1,
      borderColor: withAlpha(palette.amber, '55'),
      gap: 14,
      shadowColor: '#000000',
      shadowOpacity:
        palette.key === 'daylight' || palette.key === 'sunrise' || palette.key === 'rose'
          ? 0.14
          : 0.32,
      shadowRadius: 28,
      shadowOffset: {
        width: 0,
        height: 18,
      },
      elevation: 18,
    },
    startEditorModalAccent: {
      width: 92,
      height: 4,
      borderRadius: 999,
      backgroundColor: palette.amber,
    },
    startEditorModalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    startEditorHeaderCopy: {
      flex: 1,
      gap: 6,
    },
    startEditorModalEyebrow: {
      color: palette.amberSoft,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1.1,
    },
    startEditorModalTitle: {
      color: palette.textStrong,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '800',
    },
    startEditorSummary: {
      color: palette.textSoft,
      fontSize: 13,
      lineHeight: 18,
    },
    startPickerRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    startPickerRail: {
      minHeight: 74,
      justifyContent: 'center',
    },
    startPickerField: {
      minWidth: 92,
      minHeight: 54,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 9,
      backgroundColor: palette.surfaceStrong,
      borderWidth: 1,
      borderColor: palette.track,
      gap: 4,
    },
    startPickerFieldOpen: {
      borderColor: palette.amber,
    },
    startPickerFieldPressed: {
      opacity: 0.86,
    },
    startPickerFieldWide: {
      flexGrow: 1,
      minWidth: 180,
    },
    startPickerFieldLabel: {
      color: palette.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.9,
    },
    startPickerFieldValue: {
      flex: 1,
      color: palette.textStrong,
      fontSize: 14,
      fontWeight: '800',
    },
    startPickerFieldValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    startPickerFieldCaret: {
      color: palette.textMuted,
      fontSize: 10,
      fontWeight: '800',
    },
    startPickerTray: {
      borderRadius: 18,
      backgroundColor: palette.surfaceStrong,
      borderWidth: 1,
      borderColor: palette.borderSoft,
    },
    startPickerTrayStatic: {
      borderRadius: 18,
      backgroundColor: palette.surfaceStrong,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      padding: 10,
    },
    startPickerHintSurface: {
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: palette.surfaceStrong,
      borderWidth: 1,
      borderColor: palette.borderSoft,
    },
    startPickerOptions: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    startPickerOption: {
      minHeight: 38,
      justifyContent: 'center',
      borderRadius: 999,
      paddingHorizontal: 12,
      backgroundColor: palette.surfaceStrong,
      borderWidth: 1,
      borderColor: palette.track,
    },
    startPickerOptionSelected: {
      backgroundColor: palette.amber,
      borderColor: palette.amber,
    },
    startPickerOptionPressed: {
      opacity: 0.85,
    },
    startPickerOptionText: {
      color: palette.text,
      fontSize: 13,
      fontWeight: '700',
    },
    startPickerOptionTextSelected: {
      color: palette.background,
    },
    startEditorActionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'space-between',
    },
    startEditorHint: {
      color: palette.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    startEditorStatus: {
      color: palette.amberSoft,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '700',
    },
    quickActionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 2,
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
      gap: 16,
      minHeight: 0,
    },
    gridWide: {
      flexDirection: 'row',
      alignItems: 'stretch',
      flex: 1,
    },
    primaryColumn: {
      flex: 1.15,
      gap: 16,
      minHeight: 0,
    },
    secondaryColumn: {
      flex: 0.95,
      gap: 16,
      minHeight: 0,
    },
    detailTopBar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    targetStat: {
      gap: 10,
      padding: 16,
      borderRadius: 22,
      backgroundColor: palette.surfaceStrong,
      borderWidth: 1,
      borderColor: palette.borderSoft,
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
      alignItems: 'flex-start',
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
    questActionWrap: {
      minWidth: 108,
      alignSelf: 'center',
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
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: palette.surfaceMuted,
      color: palette.amberSoft,
      fontSize: 12,
      fontWeight: '800',
      overflow: 'hidden',
      textAlign: 'center',
    },
    questStateDone: {
      backgroundColor: withAlpha(palette.green, palette.key === 'daylight' ? '20' : '16'),
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
      alignItems: 'center',
      gap: 14,
    },
    stageDial: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stageSvg: {
      position: 'absolute',
    },
    stageDialSurface: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: palette.surfaceStrong,
      borderWidth: 1,
      borderColor: palette.borderSoft,
    },
    stageCenterCore: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      overflow: 'hidden',
    },
    stageCenterContent: {
      width: '84%',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    stageCenterContentCompact: {
      width: '90%',
      gap: 6,
    },
    stageStatePill: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
    },
    stageStatePillCompact: {
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    stageStateText: {
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.9,
    },
    stageStateTextCompact: {
      fontSize: 9,
      letterSpacing: 0.6,
    },
    stageCenterTitle: {
      color: palette.textStrong,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '900',
      textAlign: 'center',
    },
    stageCenterTitleCompact: {
      fontSize: 18,
      lineHeight: 22,
    },
    stageCenterRange: {
      color: palette.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    stageCenterRangeCompact: {
      fontSize: 11,
    },
    stageCenterBody: {
      color: palette.textSoft,
      width: '100%',
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      flexShrink: 1,
    },
    stageCenterBodyCompact: {
      fontSize: 12,
      lineHeight: 17,
    },
    stageMiniMeter: {
      width: '72%',
      height: 7,
      borderRadius: 999,
      overflow: 'hidden',
    },
    stageMiniMeterFill: {
      height: '100%',
      borderRadius: 999,
    },
    stageCenterMeta: {
      color: palette.textMuted,
      fontSize: 12,
      lineHeight: 17,
      textAlign: 'center',
      width: '100%',
    },
    stageSupportLine: {
      color: palette.textMuted,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
      maxWidth: 420,
    },
    windowLauncherGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    windowLauncherCard: {
      width: '100%',
      borderRadius: 24,
      padding: 12,
      backgroundColor: palette.surfaceStrong,
      borderWidth: 1,
      gap: 4,
    },
    windowLauncherCardWide: {
      width: '48%',
    },
    windowLauncherCardPressed: {
      opacity: 0.72,
    },
    windowLauncherEyebrow: {
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1.1,
    },
    windowLauncherValue: {
      color: palette.textStrong,
      fontSize: 22,
      lineHeight: 26,
      fontWeight: '900',
    },
    windowLauncherTitle: {
      color: palette.textStrong,
      fontSize: 14,
      fontWeight: '800',
    },
    windowLauncherHint: {
      color: palette.textSoft,
      fontSize: 11,
      lineHeight: 15,
    },
    windowLauncherLink: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: '800',
    },
    homeMetricTile: {
      width: '48%',
      minHeight: 62,
      padding: 10,
      borderRadius: 18,
      backgroundColor: palette.surfaceMuted,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      gap: 4,
      justifyContent: 'center',
    },
    homeMetricValue: {
      color: palette.textStrong,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '900',
    },
    homeMetricLabel: {
      color: palette.textMuted,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '700',
    },
    historyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 14,
      padding: 16,
      borderRadius: 20,
      backgroundColor: palette.surfaceStrong,
      borderWidth: 1,
      borderColor: palette.borderSoft,
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
