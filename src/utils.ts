import {
  DEFAULT_SETTINGS,
  DEFAULT_STATE,
  FASTING_STAGES,
  TARGET_OPTIONS,
} from './constants';
import type {
  AppState,
  CoachingTone,
  DailySummary,
  FastSession,
  FastingStage,
  MealEntry,
  QuestStatus,
  WaterEntry,
} from './types';

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const getStartOfDay = (timestamp = Date.now()) => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

export const getStartOfWeek = (timestamp = Date.now()) => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  return date.getTime();
};

export const formatDuration = (milliseconds: number) => {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
};

export const formatHours = (hours: number) => `${hours.toFixed(hours >= 10 ? 0 : 1)}h`;

export const formatShortDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });

export const formatWeekday = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString([], {
    weekday: 'short',
  });

export const formatClock = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

export const formatMl = (amountMl: number) => `${amountMl} ml`;

export const getCompletedFastHours = (session: FastSession) => {
  if (!session.completedAt) {
    return 0;
  }

  return (session.completedAt - session.startTime) / 3600000;
};

export const getStageForHours = (elapsedHours: number): FastingStage => {
  const match = FASTING_STAGES.find(
    (stage) => elapsedHours >= stage.startHour && elapsedHours < stage.endHour,
  );

  return match ?? FASTING_STAGES[FASTING_STAGES.length - 1];
};

export const calculateStreak = (history: FastSession[]) => {
  const completedDays = Array.from(
    new Set(
      history
        .filter((session) => session.completedAt !== undefined)
        .map((session) => getStartOfDay(session.completedAt ?? session.startTime)),
    ),
  ).sort((left, right) => right - left);

  if (completedDays.length === 0) {
    return 0;
  }

  const today = getStartOfDay();
  let cursor = completedDays.includes(today) ? today : today - 86400000;
  let streak = 0;

  while (completedDays.includes(cursor)) {
    streak += 1;
    cursor -= 86400000;
  }

  return streak;
};

const encouragementCopy: Record<
  CoachingTone,
  {
    idle: string;
    early: string;
    inWindow: string;
    cleared: string;
    long: string;
  }
> = {
  steady: {
    idle: 'Start with a simple target and build consistency before you chase longer fasts.',
    early: 'Early phase. Water, calm pacing, and keeping the routine are the win.',
    inWindow: 'You are in the work zone now. Keep it clean and let the timer do its job.',
    cleared: 'Target cleared. End now for a disciplined win or keep going carefully.',
    long: 'Long fasts are not for everyone. Break the fast if you feel off and prioritize recovery.',
  },
  gentle: {
    idle: 'A manageable target is enough. Consistency beats intensity here.',
    early: 'You are just getting started. Keep it easy and stay hydrated.',
    inWindow: 'This is steady progress. Keep listening to your body and protect the routine.',
    cleared: 'You reached the planned window. A calm, deliberate finish is already a success.',
    long: 'You have gone well beyond a basic window. Recovery matters more than pushing harder.',
  },
  focused: {
    idle: 'Pick the window. Start it. Let repetition do the heavy lifting.',
    early: 'First phase is friction. Hold the line and keep the inputs clean.',
    inWindow: 'Stay precise. The routine is working when you stop negotiating with it.',
    cleared: 'Target complete. Bank the win or extend with intention, not impulse.',
    long: 'This is advanced territory. If anything feels off, cut it and recover well.',
  },
};

export const getEncouragement = (
  activeFast: FastSession | null,
  elapsedHours: number,
  targetHours: number,
  mealsToday: MealEntry[],
  tone: CoachingTone,
) => {
  if (!activeFast) {
    return mealsToday.length > 0
      ? 'Today already has momentum. Set the next window when you are ready.'
      : encouragementCopy[tone].idle;
  }

  if (elapsedHours < 4) {
    return encouragementCopy[tone].early;
  }

  if (elapsedHours < targetHours) {
    return encouragementCopy[tone].inWindow;
  }

  if (elapsedHours < 20) {
    return encouragementCopy[tone].cleared;
  }

  return encouragementCopy[tone].long;
};

export const getRankTitle = (level: number) => {
  if (level >= 9) {
    return 'Window Master';
  }

  if (level >= 6) {
    return 'Routine Builder';
  }

  if (level >= 3) {
    return 'Rhythm Keeper';
  }

  return 'Fresh Start';
};

export const getLongestFastHours = (history: FastSession[]) =>
  history.reduce((max, session) => Math.max(max, getCompletedFastHours(session)), 0);

export const getAverageFastHours = (history: FastSession[], limit = 7) => {
  const sessions = history.filter((session) => session.completedAt).slice(0, limit);

  if (sessions.length === 0) {
    return 0;
  }

  return (
    sessions.reduce((total, session) => total + getCompletedFastHours(session), 0) /
    sessions.length
  );
};

export const getBadges = (
  history: FastSession[],
  meals: MealEntry[],
  waterEntries: WaterEntry[],
  streak: number,
) => {
  const longestFast = getLongestFastHours(history);
  const badges: string[] = [];

  if (longestFast >= 12) {
    badges.push('12h Scout');
  }

  if (longestFast >= 16) {
    badges.push('16h Club');
  }

  if (meals.length >= 10) {
    badges.push('Meal Logger');
  }

  if (waterEntries.length >= 14) {
    badges.push('Hydration Hero');
  }

  if (streak >= 3) {
    badges.push('3-Day Streak');
  }

  if (streak >= 7) {
    badges.push('7-Day Run');
  }

  return badges.slice(0, 5);
};

export const getWeeklyFastCompletion = (history: FastSession[], now = Date.now()) => {
  const weekStart = getStartOfWeek(now);

  return history.filter(
    (session) => session.completedAt !== undefined && session.completedAt >= weekStart,
  ).length;
};

export const getWaterTodayMl = (waterEntries: WaterEntry[], now = Date.now()) => {
  const todayStart = getStartOfDay(now);

  return waterEntries
    .filter((entry) => entry.timestamp >= todayStart)
    .reduce((total, entry) => total + entry.amountMl, 0);
};

export const getDailySummaries = (appState: AppState, now = Date.now(), days = 7) => {
  const summaries: DailySummary[] = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const dayStart = getStartOfDay(now - index * 86400000);
    const dayEnd = dayStart + 86400000;

    const meals = appState.meals.filter(
      (meal) => meal.timestamp >= dayStart && meal.timestamp < dayEnd,
    );
    const water = appState.waterEntries.filter(
      (entry) => entry.timestamp >= dayStart && entry.timestamp < dayEnd,
    );
    const fasts = appState.fastHistory.filter(
      (session) =>
        session.completedAt !== undefined &&
        session.completedAt >= dayStart &&
        session.completedAt < dayEnd,
    );

    summaries.push({
      dayStart,
      label: formatWeekday(dayStart),
      fastingHours: fasts.reduce(
        (total, session) => total + getCompletedFastHours(session),
        0,
      ),
      calories: meals.reduce((total, meal) => total + (meal.calories ?? 0), 0),
      meals: meals.length,
      waterMl: water.reduce((total, entry) => total + entry.amountMl, 0),
      completedFasts: fasts.length,
    });
  }

  return summaries;
};

export const getQuestStatuses = ({
  activeFast,
  completedToday,
  mealsToday,
  waterTodayMl,
  settings,
  weeklyCompletion,
}: {
  activeFast: FastSession | null;
  completedToday: FastSession[];
  mealsToday: MealEntry[];
  waterTodayMl: number;
  settings: AppState['settings'];
  weeklyCompletion: number;
}): QuestStatus[] => {
  const completedTargetToday = completedToday.some(
    (session) => getCompletedFastHours(session) >= session.targetHours,
  );

  return [
    {
      title: 'Start or finish a fasting window',
      progressLabel:
        Boolean(activeFast) || completedToday.length > 0 ? '1/1 complete' : '0/1 complete',
      done: Boolean(activeFast) || completedToday.length > 0,
    },
    {
      title: 'Log 2 meals today',
      progressLabel: `${Math.min(mealsToday.length, 2)}/2 complete`,
      done: mealsToday.length >= 2,
    },
    {
      title: 'Hit your water goal',
      progressLabel: `${Math.min(waterTodayMl, settings.dailyWaterGoalMl)}/${settings.dailyWaterGoalMl} ml`,
      done: waterTodayMl >= settings.dailyWaterGoalMl,
    },
    {
      title: 'Reach your weekly fast target',
      progressLabel: `${Math.min(weeklyCompletion, settings.weeklyFastGoal)}/${settings.weeklyFastGoal} complete`,
      done: weeklyCompletion >= settings.weeklyFastGoal,
    },
    {
      title: 'Hit your fast target once today',
      progressLabel: completedTargetToday ? '1/1 complete' : '0/1 complete',
      done: completedTargetToday,
    },
  ];
};

const normalizeFast = (value: unknown): FastSession | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const session = value as Partial<FastSession>;

  if (typeof session.id !== 'string' || typeof session.startTime !== 'number') {
    return null;
  }

  return {
    id: session.id,
    startTime: session.startTime,
    targetHours:
      typeof session.targetHours === 'number' && TARGET_OPTIONS.includes(session.targetHours)
        ? session.targetHours
        : DEFAULT_SETTINGS.defaultFastGoalHours,
    completedAt:
      typeof session.completedAt === 'number' ? session.completedAt : undefined,
    note: typeof session.note === 'string' ? session.note : undefined,
  };
};

const normalizeMeal = (value: unknown): MealEntry | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const meal = value as Partial<MealEntry>;

  if (typeof meal.id !== 'string' || typeof meal.name !== 'string') {
    return null;
  }

  return {
    id: meal.id,
    name: meal.name,
    calories: typeof meal.calories === 'number' ? meal.calories : undefined,
    note: typeof meal.note === 'string' ? meal.note : undefined,
    timestamp: typeof meal.timestamp === 'number' ? meal.timestamp : Date.now(),
  };
};

const normalizeWater = (value: unknown): WaterEntry | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const entry = value as Partial<WaterEntry>;

  if (
    typeof entry.id !== 'string' ||
    typeof entry.amountMl !== 'number' ||
    typeof entry.timestamp !== 'number'
  ) {
    return null;
  }

  return {
    id: entry.id,
    amountMl: entry.amountMl,
    timestamp: entry.timestamp,
  };
};

export const migrateAppState = (raw: unknown): AppState => {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_STATE;
  }

  const value = raw as Partial<AppState> & {
    settings?: Partial<AppState['settings']>;
  };

  return {
    activeFast: normalizeFast(value.activeFast) ?? null,
    fastHistory: Array.isArray(value.fastHistory)
      ? value.fastHistory
          .map((session) => normalizeFast(session))
          .filter((session): session is FastSession => session !== null)
      : [],
    meals: Array.isArray(value.meals)
      ? value.meals
          .map((meal) => normalizeMeal(meal))
          .filter((meal): meal is MealEntry => meal !== null)
      : [],
    waterEntries: Array.isArray(value.waterEntries)
      ? value.waterEntries
          .map((entry) => normalizeWater(entry))
          .filter((entry): entry is WaterEntry => entry !== null)
      : [],
    xp: typeof value.xp === 'number' ? value.xp : 0,
    settings: {
      ...DEFAULT_SETTINGS,
      ...value.settings,
    },
    lastUpdatedAt:
      typeof value.lastUpdatedAt === 'number' ? value.lastUpdatedAt : Date.now(),
  };
};

export const stampState = <T extends AppState>(state: T): T => ({
  ...state,
  lastUpdatedAt: Date.now(),
});
