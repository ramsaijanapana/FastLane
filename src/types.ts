export type FastSession = {
  id: string;
  startTime: number;
  targetHours: number;
  completedAt?: number;
  note?: string;
};

export type MealEntry = {
  id: string;
  name: string;
  calories?: number;
  note?: string;
  timestamp: number;
};

export type WaterEntry = {
  id: string;
  amountMl: number;
  timestamp: number;
};

export type CoachingTone = 'steady' | 'gentle' | 'focused';
export type ThemeKey = 'midnight' | 'daylight' | 'forest' | 'sunrise';

export type UserSettings = {
  displayName: string;
  defaultFastGoalHours: number;
  dailyWaterGoalMl: number;
  dailyCalorieGoal: number;
  weeklyFastGoal: number;
  coachingTone: CoachingTone;
  themeKey: ThemeKey;
  remindersEnabled: boolean;
  reminderHour: number;
};

export type AppState = {
  activeFast: FastSession | null;
  fastHistory: FastSession[];
  meals: MealEntry[];
  waterEntries: WaterEntry[];
  xp: number;
  settings: UserSettings;
  lastUpdatedAt: number;
};

export type FastingStage = {
  title: string;
  startHour: number;
  endHour: number;
  accent: string;
  detail: string;
};

export type TabKey = 'dashboard' | 'journal' | 'insights' | 'settings';

export type DailySummary = {
  dayStart: number;
  label: string;
  fastingHours: number;
  calories: number;
  meals: number;
  waterMl: number;
  completedFasts: number;
};

export type QuestStatus = {
  title: string;
  progressLabel: string;
  done: boolean;
};

export type AuthProvider = 'password' | 'google' | 'facebook';
export type SocialAuthProvider = Exclude<AuthProvider, 'password'>;

export type AuthSession = {
  token: string;
  email: string;
  name: string;
  provider?: AuthProvider;
  isPlaceholderEmail?: boolean;
};
