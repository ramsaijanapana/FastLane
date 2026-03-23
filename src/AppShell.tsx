import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  DEFAULT_STATE,
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  XP_PER_LEVEL,
} from './constants';
import { ActionButton, ChipButton, ProgressBar, SectionCard } from './components/ui';
import { DashboardScreen } from './screens/DashboardScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { JournalScreen } from './screens/JournalScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { themeOptions, ThemePalette, useTheme } from './theme';
import type {
  AppState,
  AuthSession,
  SocialAuthProvider,
  TabKey,
  ThemeKey,
  UserSettings,
} from './types';
import {
  calculateStreak,
  getAverageFastHours,
  getBadges,
  getCompletedFastHours,
  getDailySummaries,
  getEncouragement,
  getLongestFastHours,
  getQuestStatuses,
  getRankTitle,
  getStageForHours,
  getStartOfDay,
  getWaterTodayMl,
  getWeeklyFastCompletion,
  migrateAppState,
  stampState,
} from './utils';
import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
} from './services/authStorage';
import {
  fetchProfile,
  loginAccount,
  pullRemoteState,
  pushRemoteState,
  registerAccount,
} from './services/api';
import { exportBackup, importBackup } from './services/backup';
import { pulsePrimary, pulseSuccess } from './services/haptics';
import { syncReminderSchedule } from './services/notifications';
import { startSocialLogin } from './services/socialAuth';

type MealDraft = {
  name: string;
  calories?: number;
  note?: string;
};

const tabs: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'journal', label: 'Journal' },
  { key: 'insights', label: 'Insights' },
  { key: 'settings', label: 'Account' },
];

const authProviderLabels = {
  password: 'email',
  google: 'Google',
  facebook: 'Facebook',
} as const;

const getAuthIdentity = (session: AuthSession) => {
  if (session.isPlaceholderEmail) {
    const providerLabel =
      authProviderLabels[session.provider ?? 'password'] ?? 'Fastlane';

    return `${session.name} via ${providerLabel}`;
  }

  return session.email;
};

export const AppShell = () => {
  const { theme: palette, setThemeKey } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 960;
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [appState, setAppState] = useState<AppState>(DEFAULT_STATE);
  const [selectedTab, setSelectedTab] = useState<TabKey>('dashboard');
  const [selectedTarget, setSelectedTarget] = useState(
    DEFAULT_STATE.settings.defaultFastGoalHours,
  );
  const [now, setNow] = useState(Date.now());
  const [ready, setReady] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Local-only mode.');
  const [cloudReady, setCloudReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [[[_, currentState], [, legacyState]], savedSession] = await Promise.all([
          AsyncStorage.multiGet([STORAGE_KEY, LEGACY_STORAGE_KEY]),
          loadAuthSession(),
        ]);
        const source = currentState ?? legacyState;

        if (source) {
          const parsed = migrateAppState(JSON.parse(source));
          setAppState(parsed);
          setSelectedTarget(
            parsed.activeFast?.targetHours ?? parsed.settings.defaultFastGoalHours,
          );
        }

        if (savedSession) {
          setAuthSession(savedSession);
          setSyncStatus(`Signed in as ${getAuthIdentity(savedSession)}`);
        } else {
          setCloudReady(true);
        }
      } catch (error) {
        console.warn('Unable to restore app state', error);
      } finally {
        setReady(true);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(appState)).catch((error) => {
      console.warn('Unable to persist app state', error);
    });
  }, [appState, ready]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setThemeKey(appState.settings.themeKey);
  }, [appState.settings.themeKey, setThemeKey]);

  useEffect(() => {
    if (!ready || !authSession || !cloudReady) {
      return;
    }

    const timeout = setTimeout(() => {
      pushRemoteState(authSession.token, appState)
        .then(() => {
          setSyncStatus(`Cloud synced at ${new Date().toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })}`);
        })
        .catch((error) => {
          setSyncStatus(`Cloud sync failed: ${String(error)}`);
        });
    }, 1800);

    return () => clearTimeout(timeout);
  }, [appState.lastUpdatedAt, authSession, cloudReady, ready]);

  useEffect(() => {
    if (!ready || !authSession) {
      return;
    }

    let cancelled = false;
    setCloudReady(false);

    pullRemoteState(authSession.token)
      .then((remote) => {
        if (cancelled) {
          return;
        }

        if (remote.state && remote.state.lastUpdatedAt > appState.lastUpdatedAt) {
          const merged = migrateAppState(remote.state);
          setAppState(merged);
          setSelectedTarget(
            merged.activeFast?.targetHours ?? merged.settings.defaultFastGoalHours,
          );
          setSyncStatus(
            `Signed in as ${getAuthIdentity(authSession)}. Pulled latest cloud state.`,
          );
        } else {
          setSyncStatus(
            `Signed in as ${getAuthIdentity(authSession)}. Cloud sync is ready.`,
          );
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSyncStatus(`Cloud bootstrap failed: ${String(error)}`);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCloudReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authSession, ready]);

  const activeFast = appState.activeFast;
  const elapsedHours = activeFast ? (now - activeFast.startTime) / 3600000 : 0;
  const currentStage = getStageForHours(elapsedHours);
  const todayStart = getStartOfDay(now);
  const mealsToday = appState.meals.filter((meal) => meal.timestamp >= todayStart);
  const caloriesToday = mealsToday.reduce(
    (total, meal) => total + (meal.calories ?? 0),
    0,
  );
  const waterTodayMl = getWaterTodayMl(appState.waterEntries, now);
  const completedToday = appState.fastHistory.filter(
    (session) => session.completedAt !== undefined && session.completedAt >= todayStart,
  );
  const weeklyCompletion = getWeeklyFastCompletion(appState.fastHistory, now);
  const streak = calculateStreak(appState.fastHistory);
  const level = Math.floor(appState.xp / XP_PER_LEVEL) + 1;
  const nextLevelProgress = (appState.xp % XP_PER_LEVEL) / XP_PER_LEVEL;
  const badges = getBadges(
    appState.fastHistory,
    appState.meals,
    appState.waterEntries,
    streak,
  );
  const completedTodayTarget = completedToday.some(
    (session) => getCompletedFastHours(session) >= session.targetHours,
  );
  const quests = getQuestStatuses({
    activeFast,
    completedToday,
    mealsToday,
    waterTodayMl,
    settings: appState.settings,
    weeklyCompletion,
  });
  const chartData = getDailySummaries(appState, now, 7);
  const longestFastHours = getLongestFastHours(appState.fastHistory);
  const averageFastHours = getAverageFastHours(appState.fastHistory);
  const encouragement = getEncouragement(
    activeFast,
    elapsedHours,
    activeFast?.targetHours ?? selectedTarget,
    mealsToday,
    appState.settings.coachingTone,
  );

  const handleSelectTarget = (hours: number) => {
    setSelectedTarget(hours);

    setAppState((current) => {
      if (!current.activeFast) {
        return current;
      }

      return stampState({
        ...current,
        activeFast: {
          ...current.activeFast,
          targetHours: hours,
        },
      });
    });
  };

  const handleStartFast = () => {
    setAppState((current) => {
      if (current.activeFast) {
        return current;
      }

      return stampState({
        ...current,
        activeFast: {
          id: `fast-${Date.now()}`,
          startTime: Date.now(),
          targetHours: selectedTarget,
        },
        xp: current.xp + 20,
      });
    });
    pulsePrimary();
  };

  const handleFinishFast = () => {
    setAppState((current) => {
      if (!current.activeFast) {
        return current;
      }

      const completedAt = Date.now();
      const completedHours =
        (completedAt - current.activeFast.startTime) / 3600000;
      const bonus = completedHours >= current.activeFast.targetHours ? 60 : 25;

      return stampState({
        ...current,
        activeFast: null,
        fastHistory: [
          {
            ...current.activeFast,
            completedAt,
          },
          ...current.fastHistory,
        ].slice(0, 40),
        xp: current.xp + bonus,
      });
    });
    pulseSuccess();
  };

  const handleAddMeal = (draft: MealDraft) => {
    const timestamp = Date.now();

    setAppState((current) => {
      const finishedFast =
        current.activeFast !== null
          ? {
              ...current.activeFast,
              completedAt: timestamp,
            }
          : null;
      const finishedFastHours = finishedFast ? getCompletedFastHours(finishedFast) : 0;
      const finishBonus =
        finishedFast && finishedFastHours >= finishedFast.targetHours ? 40 : 15;

      return stampState({
        ...current,
        activeFast: null,
        meals: [
          {
            id: `meal-${timestamp}`,
            name: draft.name,
            calories: draft.calories,
            note: draft.note,
            timestamp,
          },
          ...current.meals,
        ].slice(0, 80),
        fastHistory:
          finishedFast !== null
            ? [finishedFast, ...current.fastHistory].slice(0, 40)
            : current.fastHistory,
        xp: current.xp + 10 + (finishedFast ? finishBonus : 0),
      });
    });
    pulsePrimary();
  };

  const handleUpdateMeal = (id: string, draft: MealDraft) => {
    setAppState((current) =>
      stampState({
        ...current,
        meals: current.meals.map((meal) =>
          meal.id === id
            ? {
                ...meal,
                name: draft.name,
                calories: draft.calories,
                note: draft.note,
              }
            : meal,
        ),
      }),
    );
  };

  const handleDeleteMeal = (id: string) => {
    setAppState((current) =>
      stampState({
        ...current,
        meals: current.meals.filter((meal) => meal.id !== id),
      }),
    );
  };

  const handleAddWater = (amountMl: number) => {
    setAppState((current) =>
      stampState({
        ...current,
        waterEntries: [
          {
            id: `water-${Date.now()}`,
            amountMl,
            timestamp: Date.now(),
          },
          ...current.waterEntries,
        ].slice(0, 120),
        xp: current.xp + 4,
      }),
    );
    pulsePrimary();
  };

  const handleDeleteWater = (id: string) => {
    setAppState((current) =>
      stampState({
        ...current,
        waterEntries: current.waterEntries.filter((entry) => entry.id !== id),
      }),
    );
  };

  const handleUpdateFast = (
    id: string,
    changes: { durationHours: number; targetHours: number; note?: string },
  ) => {
    setAppState((current) =>
      stampState({
        ...current,
        fastHistory: current.fastHistory.map((session) => {
          if (session.id !== id) {
            return session;
          }

          return {
            ...session,
            targetHours: changes.targetHours,
            completedAt: session.startTime + changes.durationHours * 3600000,
            note: changes.note,
          };
        }),
      }),
    );
  };

  const handleDeleteFast = (id: string) => {
    setAppState((current) =>
      stampState({
        ...current,
        fastHistory: current.fastHistory.filter((session) => session.id !== id),
      }),
    );
  };

  const handleSaveSettings = async (settings: UserSettings) => {
    setAppState((current) =>
      stampState({
        ...current,
        settings,
      }),
    );

    if (!activeFast) {
      setSelectedTarget(settings.defaultFastGoalHours);
    }

    const reminderSynced = await syncReminderSchedule(
      settings.remindersEnabled,
      settings.reminderHour,
    );

    setSyncStatus(
      settings.remindersEnabled
        ? reminderSynced
          ? `Daily reminder scheduled for ${settings.reminderHour}:00.`
          : 'Reminder permission was not granted.'
        : 'Reminders turned off.',
    );
    pulseSuccess();
  };

  const handleQuickTheme = (themeKey: ThemeKey) => {
    setAppState((current) =>
      stampState({
        ...current,
        settings: {
          ...current.settings,
          themeKey,
        },
      }),
    );
  };

  const handleOpenQuestTab = (tab: TabKey) => {
    setSelectedTab(tab);
  };

  const hydrateCloudSession = async (session: AuthSession) => {
    await fetchProfile(session.token);
    setAuthSession(session);
    await saveAuthSession(session);

    const remote = await pullRemoteState(session.token);
    const identity = getAuthIdentity(session);

    if (remote.state && remote.state.lastUpdatedAt > appState.lastUpdatedAt) {
      const merged = migrateAppState(remote.state);
      setAppState(merged);
      setSelectedTarget(
        merged.activeFast?.targetHours ?? merged.settings.defaultFastGoalHours,
      );
      setSyncStatus(`Signed in as ${identity}. Pulled latest cloud state.`);
    } else {
      await pushRemoteState(session.token, appState);
      setSyncStatus(`Signed in as ${identity}. Local state pushed to cloud.`);
    }

    setCloudReady(true);
    pulseSuccess();
  };

  const handleRegister = async (input: {
    email: string;
    password: string;
    name: string;
  }) => {
    setAuthBusy(true);

    try {
      const response = await registerAccount(input);
      setAuthSession(response.session);
      await saveAuthSession(response.session);
      await pushRemoteState(response.session.token, appState);
      setSyncStatus(
        `Account created for ${getAuthIdentity(response.session)}. Cloud sync is active.`,
      );
      setCloudReady(true);
      pulseSuccess();
    } catch (error) {
      setSyncStatus(String(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogin = async (input: { email: string; password: string }) => {
    setAuthBusy(true);

    try {
      const response = await loginAccount(input);
      await hydrateCloudSession(response.session);
    } catch (error) {
      setSyncStatus(String(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSocialLogin = async (provider: SocialAuthProvider) => {
    setAuthBusy(true);

    try {
      const session = await startSocialLogin(provider);

      if (!session) {
        setSyncStatus(`${authProviderLabels[provider]} sign-in cancelled.`);
        return;
      }

      await hydrateCloudSession(session);
    } catch (error) {
      setSyncStatus(String(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    await clearAuthSession();
    setAuthSession(null);
    setCloudReady(true);
    setSyncStatus('Signed out. Local-only mode is active.');
  };

  const handlePushSync = async () => {
    if (!authSession) {
      return;
    }

    setAuthBusy(true);

    try {
      await pushRemoteState(authSession.token, appState);
      setSyncStatus('Cloud sync pushed successfully.');
      pulseSuccess();
    } catch (error) {
      setSyncStatus(String(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const handlePullSync = async () => {
    if (!authSession) {
      return;
    }

    setAuthBusy(true);

    try {
      const remote = await pullRemoteState(authSession.token);

      if (remote.state) {
        const merged = migrateAppState(remote.state);
        setAppState(merged);
        setSelectedTarget(
          merged.activeFast?.targetHours ?? merged.settings.defaultFastGoalHours,
        );
        setSyncStatus('Pulled the latest cloud state.');
        pulseSuccess();
      } else {
        setSyncStatus('Cloud account is ready, but no synced state exists yet.');
      }
    } catch (error) {
      setSyncStatus(String(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      await exportBackup(appState);
      setSyncStatus('Backup exported.');
    } catch (error) {
      setSyncStatus(String(error));
    }
  };

  const handleImportBackup = async () => {
    try {
      const raw = await importBackup();

      if (!raw) {
        return;
      }

      const importedState = migrateAppState(raw);
      setAppState(importedState);
      setSelectedTarget(
        importedState.activeFast?.targetHours ??
          importedState.settings.defaultFastGoalHours,
      );
      setSyncStatus('Backup imported into local state.');
      pulseSuccess();
    } catch (error) {
      setSyncStatus(`Import failed: ${String(error)}`);
    }
  };

  if (!ready) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar
          barStyle={
            palette.statusBarStyle === 'light' ? 'light-content' : 'dark-content'
          }
          backgroundColor={palette.background}
        />
        <ActivityIndicator size="large" color={palette.amber} />
        <Text style={styles.loadingText}>Loading Fastlane...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={
          palette.statusBarStyle === 'light' ? 'light-content' : 'dark-content'
        }
        backgroundColor={palette.background}
      />

      <View pointerEvents="none" style={styles.backgroundWrap}>
        <View style={styles.backgroundGlowPrimary} />
        <View style={styles.backgroundGlowSecondary} />
        <View style={styles.backgroundGlowTertiary} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          !isCompact && styles.scrollContentWide,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>FASTLANE V1</Text>
            <Text style={styles.title}>
              {appState.settings.displayName}, your tracker now covers fasting, food, water, and weekly momentum.
            </Text>
            <Text style={styles.subtitle}>
              Simple logging on the surface, stronger history and insights underneath.
            </Text>
          </View>

          <View style={styles.rankCard}>
            <Text style={styles.rankLabel}>Level {level}</Text>
            <Text style={styles.rankTitle}>{getRankTitle(level)}</Text>
            <ProgressBar progress={nextLevelProgress} />
            <Text style={styles.rankMeta}>{appState.xp} XP total</Text>
          </View>
        </View>

        <SectionCard
          title={authSession ? 'Cloud Sync Connected' : 'Sign In For Sync'}
          subtitle={
            authSession
              ? `Signed in as ${getAuthIdentity(authSession)}. Open Account to manage sync, backup, and settings.`
              : 'Use Google, Facebook, or email and password. The app still works offline if you skip sign-in.'
          }
          style={styles.authCard}
        >
          <View style={styles.authCardRow}>
            {authSession ? (
              <>
                <ActionButton
                  label="Open Account"
                  onPress={() => setSelectedTab('settings')}
                  tone="secondary"
                />
                <ActionButton
                  label={authBusy ? 'Syncing...' : 'Push Sync'}
                  onPress={handlePushSync}
                  disabled={authBusy}
                />
              </>
            ) : (
              <>
                <ActionButton
                  label={authBusy ? 'Opening...' : 'Google'}
                  onPress={() => handleSocialLogin('google')}
                  disabled={authBusy}
                />
                <ActionButton
                  label={authBusy ? 'Opening...' : 'Facebook'}
                  onPress={() => handleSocialLogin('facebook')}
                  tone="secondary"
                  disabled={authBusy}
                />
                <ActionButton
                  label="Email & Password"
                  onPress={() => setSelectedTab('settings')}
                  tone="secondary"
                />
              </>
            )}
          </View>
          <Text style={styles.authCardMeta}>{syncStatus}</Text>
        </SectionCard>

        <View style={styles.tabRow}>
          {tabs.map((tab) => (
            <ChipButton
              key={tab.key}
              label={tab.label}
              onPress={() => setSelectedTab(tab.key)}
              selected={selectedTab === tab.key}
              accent={palette.amber}
            />
          ))}
        </View>

        <SectionCard
          title="Theme"
          subtitle="Switch appearance instantly. Dark, light, and extra visual themes are available."
          style={styles.themeCard}
        >
          <View style={styles.themeQuickRow}>
            {themeOptions.map((option) => (
              <ChipButton
                key={option.key}
                label={option.label}
                onPress={() => handleQuickTheme(option.key)}
                selected={appState.settings.themeKey === option.key}
                accent={option.swatches[0]}
              />
            ))}
          </View>
        </SectionCard>

        {selectedTab === 'dashboard' ? (
          <DashboardScreen
            activeFast={activeFast}
            now={now}
            selectedTarget={selectedTarget}
            currentStage={currentStage}
            encouragement={encouragement}
            streak={streak}
            mealsTodayCount={mealsToday.length}
            caloriesToday={caloriesToday}
            waterTodayMl={waterTodayMl}
            settings={appState.settings}
            quests={quests}
            badges={badges}
            weeklyCompletion={weeklyCompletion}
            completedTodayTarget={completedTodayTarget}
            fastHistory={appState.fastHistory}
            isCompact={isCompact}
            onSelectTarget={handleSelectTarget}
            onStartFast={handleStartFast}
            onFinishFast={handleFinishFast}
            onAddWater={handleAddWater}
            onOpenQuestTab={handleOpenQuestTab}
          />
        ) : null}

        {selectedTab === 'journal' ? (
          <JournalScreen
            activeFast={activeFast}
            meals={appState.meals}
            fastHistory={appState.fastHistory}
            waterEntries={appState.waterEntries}
            onAddMeal={handleAddMeal}
            onUpdateMeal={handleUpdateMeal}
            onDeleteMeal={handleDeleteMeal}
            onAddWater={handleAddWater}
            onDeleteWater={handleDeleteWater}
            onUpdateFast={handleUpdateFast}
            onDeleteFast={handleDeleteFast}
          />
        ) : null}

        {selectedTab === 'insights' ? (
          <InsightsScreen
            chartData={chartData}
            longestFastHours={longestFastHours}
            averageFastHours={averageFastHours}
            streak={streak}
            weeklyCompletion={weeklyCompletion}
            settings={appState.settings}
            badges={badges}
          />
        ) : null}

        {selectedTab === 'settings' ? (
          <SettingsScreen
            settings={appState.settings}
            authSession={authSession}
            authBusy={authBusy}
            syncStatus={syncStatus}
            onRegister={handleRegister}
            onLogin={handleLogin}
            onSocialLogin={handleSocialLogin}
            onLogout={handleLogout}
            onPushSync={handlePushSync}
            onPullSync={handlePullSync}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onSaveSettings={handleSaveSettings}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (palette: ThemePalette) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
  },
  loadingText: {
    marginTop: 14,
    color: palette.text,
    fontSize: 16,
  },
  backgroundWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundGlowPrimary: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: `${palette.amber}29`,
    top: -80,
    left: -120,
  },
  backgroundGlowSecondary: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: `${palette.teal}1f`,
    top: 220,
    right: -80,
  },
  backgroundGlowTertiary: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: `${palette.purple}1f`,
    bottom: -40,
    left: 60,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
    gap: 20,
  },
  scrollContentWide: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 1220,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
  },
  headerCopy: {
    maxWidth: 760,
    gap: 10,
  },
  eyebrow: {
    color: palette.amber,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2.6,
  },
  title: {
    color: palette.text,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.textSoft,
    fontSize: 15,
    lineHeight: 22,
  },
  rankCard: {
    minWidth: 220,
    padding: 18,
    borderRadius: 24,
    backgroundColor: palette.surfaceStrong,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 10,
  },
  rankLabel: {
    color: palette.amberSoft,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },
  rankTitle: {
    color: palette.textStrong,
    fontSize: 22,
    fontWeight: '800',
  },
  rankMeta: {
    color: palette.textMuted,
    fontSize: 13,
  },
  authCard: {
    backgroundColor: palette.surface,
  },
  authCardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  authCardMeta: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeCard: {
    backgroundColor: palette.surface,
  },
  themeQuickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
