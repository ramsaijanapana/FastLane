import type { AppState, FastingStage, UserSettings } from './types';

export const STORAGE_KEY = 'fastlane-state-v2';
export const LEGACY_STORAGE_KEY = 'fastlane-state-v1';
export const TARGET_OPTIONS = [12, 14, 16, 18, 20];
export const WATER_PRESETS = [250, 500, 750];
export const XP_PER_LEVEL = 120;

export const DEFAULT_SETTINGS: UserSettings = {
  displayName: 'Tracker',
  defaultFastGoalHours: 16,
  dailyWaterGoalMl: 2200,
  dailyCalorieGoal: 1900,
  weeklyFastGoal: 5,
  coachingTone: 'steady',
  themeKey: 'midnight',
  remindersEnabled: false,
  reminderHour: 19,
};

export const DEFAULT_STATE: AppState = {
  activeFast: null,
  fastHistory: [],
  meals: [],
  waterEntries: [],
  xp: 0,
  settings: DEFAULT_SETTINGS,
  lastUpdatedAt: Date.now(),
};

export const FASTING_STAGES: FastingStage[] = [
  {
    title: 'Settling In',
    startHour: 0,
    endHour: 4,
    accent: '#f97316',
    detail: 'Ease into the window, hydrate, and let your last meal settle.',
  },
  {
    title: 'Light Burn',
    startHour: 4,
    endHour: 8,
    accent: '#f59e0b',
    detail: 'This is the transition zone where consistency matters most.',
  },
  {
    title: 'Focus Lift',
    startHour: 8,
    endHour: 12,
    accent: '#facc15',
    detail: 'Many people feel steadier here. Keep the plan simple and calm.',
  },
  {
    title: 'Steady Zone',
    startHour: 12,
    endHour: 16,
    accent: '#2dd4bf',
    detail: 'A strong everyday fasting window for building routine.',
  },
  {
    title: 'Deep Window',
    startHour: 16,
    endHour: 20,
    accent: '#38bdf8',
    detail: 'Longer window, sharper discipline. Listen to your body.',
  },
  {
    title: 'Recovery Ready',
    startHour: 20,
    endHour: 24,
    accent: '#c084fc',
    detail: 'Plan the next meal well and break the fast with intention.',
  },
];
