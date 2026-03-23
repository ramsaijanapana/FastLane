import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { TARGET_OPTIONS } from '../constants';
import { apiBaseUrl } from '../services/api';
import { resolveTheme, themeOptions, ThemePalette, useTheme } from '../theme';
import type {
  AuthSession,
  CoachingTone,
  SocialAuthProvider,
  UserSettings,
} from '../types';
import { ActionButton, ChipButton, SectionCard } from '../components/ui';

type SettingsScreenProps = {
  settings: UserSettings;
  authSession: AuthSession | null;
  authBusy: boolean;
  syncStatus: string;
  onRegister: (input: {
    email: string;
    password: string;
    name: string;
  }) => Promise<void>;
  onLogin: (input: { email: string; password: string }) => Promise<void>;
  onSocialLogin: (provider: SocialAuthProvider) => Promise<void>;
  onLogout: () => Promise<void>;
  onPushSync: () => Promise<void>;
  onPullSync: () => Promise<void>;
  onExportBackup: () => Promise<void>;
  onImportBackup: () => Promise<void>;
  onSaveSettings: (settings: UserSettings) => Promise<void>;
};

const toneOptions: { value: CoachingTone; label: string }[] = [
  { value: 'steady', label: 'Steady' },
  { value: 'gentle', label: 'Gentle' },
  { value: 'focused', label: 'Focused' },
];

export const SettingsScreen = ({
  settings,
  authSession,
  authBusy,
  syncStatus,
  onRegister,
  onLogin,
  onSocialLogin,
  onLogout,
  onPushSync,
  onPullSync,
  onExportBackup,
  onImportBackup,
  onSaveSettings,
}: SettingsScreenProps) => {
  const { theme: palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const authIdentity =
    authSession?.isPlaceholderEmail && authSession.provider
      ? `${authSession.name} via ${authSession.provider === 'google' ? 'Google' : 'Facebook'}`
      : authSession?.email ?? '';
  const [displayName, setDisplayName] = useState(settings.displayName);
  const [dailyWaterGoalMl, setDailyWaterGoalMl] = useState(
    String(settings.dailyWaterGoalMl),
  );
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState(
    String(settings.dailyCalorieGoal),
  );
  const [weeklyFastGoal, setWeeklyFastGoal] = useState(
    String(settings.weeklyFastGoal),
  );
  const [defaultFastGoalHours, setDefaultFastGoalHours] = useState(
    settings.defaultFastGoalHours,
  );
  const [coachingTone, setCoachingTone] = useState<CoachingTone>(
    settings.coachingTone,
  );
  const [themeKey, setThemeKey] = useState(settings.themeKey);
  const [remindersEnabled, setRemindersEnabled] = useState(
    settings.remindersEnabled,
  );
  const [reminderHour, setReminderHour] = useState(settings.reminderHour);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(settings.displayName);

  useEffect(() => {
    setDisplayName(settings.displayName);
    setDailyWaterGoalMl(String(settings.dailyWaterGoalMl));
    setDailyCalorieGoal(String(settings.dailyCalorieGoal));
    setWeeklyFastGoal(String(settings.weeklyFastGoal));
    setDefaultFastGoalHours(settings.defaultFastGoalHours);
    setCoachingTone(settings.coachingTone);
    setThemeKey(settings.themeKey);
    setRemindersEnabled(settings.remindersEnabled);
    setReminderHour(settings.reminderHour);
    setName(settings.displayName);
  }, [settings]);

  const handleSave = async () => {
    const nextWaterGoal = Number.parseInt(dailyWaterGoalMl, 10);
    const nextCalorieGoal = Number.parseInt(dailyCalorieGoal, 10);
    const nextWeeklyGoal = Number.parseInt(weeklyFastGoal, 10);

    await onSaveSettings({
      displayName: displayName.trim() || 'Tracker',
      defaultFastGoalHours,
      dailyWaterGoalMl: Number.isFinite(nextWaterGoal) && nextWaterGoal > 0 ? nextWaterGoal : settings.dailyWaterGoalMl,
      dailyCalorieGoal: Number.isFinite(nextCalorieGoal) && nextCalorieGoal > 0 ? nextCalorieGoal : settings.dailyCalorieGoal,
      weeklyFastGoal: Number.isFinite(nextWeeklyGoal) && nextWeeklyGoal > 0 ? nextWeeklyGoal : settings.weeklyFastGoal,
      coachingTone,
      themeKey,
      remindersEnabled,
      reminderHour,
    });
  };

  return (
    <View style={styles.wrap}>
      <SectionCard
        title="Account & Cloud Sync"
        subtitle="Sign in to sync across devices. The app still works fully offline when you do not sign in."
      >
        {authSession ? (
          <View style={styles.noteList}>
            <Text style={styles.note}>Signed in as {authIdentity}</Text>
            <View style={styles.row}>
              <ActionButton
                label={authBusy ? 'Pulling...' : 'Pull Latest'}
                onPress={onPullSync}
                tone="secondary"
                disabled={authBusy}
              />
              <ActionButton
                label={authBusy ? 'Pushing...' : 'Push Current'}
                onPress={onPushSync}
                disabled={authBusy}
              />
              <ActionButton
                label="Sign Out"
                onPress={onLogout}
                tone="danger"
                disabled={authBusy}
              />
            </View>
          </View>
        ) : (
          <View style={styles.noteList}>
            <Text style={styles.fieldLabel}>Quick sign-in</Text>
            <View style={styles.row}>
              <ActionButton
                label={authBusy ? 'Opening...' : 'Google'}
                onPress={() => onSocialLogin('google')}
                disabled={authBusy}
              />
              <ActionButton
                label={authBusy ? 'Opening...' : 'Facebook'}
                onPress={() => onSocialLogin('facebook')}
                tone="secondary"
                disabled={authBusy}
              />
            </View>
            <Text style={styles.note}>
              Google and Facebook will create or link a Fastlane account, then sync through the same cloud backend.
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name for registration"
              placeholderTextColor={palette.textMuted}
              style={styles.input}
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={palette.textMuted}
              secureTextEntry
              style={styles.input}
            />
            <View style={styles.row}>
              <ActionButton
                label={authBusy ? 'Signing in...' : 'Sign In'}
                onPress={() => onLogin({ email: email.trim(), password })}
                disabled={authBusy || !email.trim() || !password}
              />
              <ActionButton
                label={authBusy ? 'Creating...' : 'Register'}
                onPress={() =>
                  onRegister({
                    email: email.trim(),
                    password,
                    name: name.trim() || displayName.trim() || 'Tracker',
                  })
                }
                tone="secondary"
                disabled={authBusy || !email.trim() || !password}
              />
            </View>
          </View>
        )}
        <Text style={styles.syncStatus}>{syncStatus}</Text>
        <Text style={styles.apiNote}>API endpoint: {apiBaseUrl}</Text>
      </SectionCard>

      <SectionCard
        title="Profile & Appearance"
        subtitle="Personalize the tone, name, and visual style without adding setup friction."
      >
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Display name"
          placeholderTextColor={palette.textMuted}
          style={styles.input}
        />
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Coaching tone</Text>
          <View style={styles.row}>
            {toneOptions.map((tone) => (
              <ChipButton
                key={tone.value}
                label={tone.label}
                onPress={() => setCoachingTone(tone.value)}
                selected={coachingTone === tone.value}
                accent={palette.purple}
              />
            ))}
          </View>
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Theme</Text>
          <View style={styles.themeGrid}>
            {themeOptions.map((option) => {
              const previewTheme = resolveTheme(option.key);

              return (
                <Pressable
                  key={option.key}
                  onPress={() => setThemeKey(option.key)}
                  style={({ pressed }) => [
                    styles.themeCard,
                    {
                      backgroundColor: option.previewBackground,
                      borderColor:
                        themeKey === option.key ? palette.amber : palette.borderSoft,
                    },
                    pressed && styles.themeCardPressed,
                  ]}
                >
                  <View style={styles.themeCardTop}>
                    <Text
                      style={[
                        styles.themeCardTitle,
                        { color: previewTheme.textStrong },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {themeKey === option.key ? (
                      <Text
                        style={[
                          styles.themeCardState,
                          { color: previewTheme.amberSoft },
                        ]}
                      >
                        Selected
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.themeCardDescription,
                      { color: previewTheme.textSoft },
                    ]}
                  >
                    {option.description}
                  </Text>
                  <View style={styles.themeSwatchRow}>
                    {option.swatches.map((swatch) => (
                      <View
                        key={`${option.key}-${swatch}`}
                        style={[styles.themeSwatch, { backgroundColor: swatch }]}
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </SectionCard>

      <SectionCard
        title="Goals & Reminders"
        subtitle="Daily targets now drive the dashboard, quests, and native reminder schedule."
      >
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Default fasting goal</Text>
          <View style={styles.row}>
            {TARGET_OPTIONS.map((hours) => (
              <ChipButton
                key={hours}
                label={`${hours}h`}
                onPress={() => setDefaultFastGoalHours(hours)}
                selected={defaultFastGoalHours === hours}
              />
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Daily reminder</Text>
          <View style={styles.row}>
            <ChipButton
              label="Off"
              onPress={() => setRemindersEnabled(false)}
              selected={!remindersEnabled}
              accent={palette.red}
            />
            <ChipButton
              label="On"
              onPress={() => setRemindersEnabled(true)}
              selected={remindersEnabled}
              accent={palette.teal}
            />
          </View>
          {remindersEnabled ? (
            <View style={styles.row}>
              {[8, 12, 18, 21].map((hour) => (
                <ChipButton
                  key={hour}
                  label={`${hour}:00`}
                  onPress={() => setReminderHour(hour)}
                  selected={reminderHour === hour}
                  accent={palette.teal}
                />
              ))}
            </View>
          ) : null}
        </View>

        <TextInput
          value={dailyWaterGoalMl}
          onChangeText={setDailyWaterGoalMl}
          placeholder="Daily water goal (ml)"
          placeholderTextColor={palette.textMuted}
          keyboardType="number-pad"
          style={styles.input}
        />
        <TextInput
          value={dailyCalorieGoal}
          onChangeText={setDailyCalorieGoal}
          placeholder="Daily calorie goal"
          placeholderTextColor={palette.textMuted}
          keyboardType="number-pad"
          style={styles.input}
        />
        <TextInput
          value={weeklyFastGoal}
          onChangeText={setWeeklyFastGoal}
          placeholder="Weekly completed-fast target"
          placeholderTextColor={palette.textMuted}
          keyboardType="number-pad"
          style={styles.input}
        />

        <ActionButton label="Save Settings" onPress={handleSave} />
      </SectionCard>

      <SectionCard
        title="Backup & Device Features"
        subtitle="Export/import local state and keep the app portable while native polish is added."
      >
        <View style={styles.row}>
          <ActionButton label="Export Backup" onPress={onExportBackup} />
          <ActionButton
            label="Import Backup"
            onPress={onImportBackup}
            tone="secondary"
          />
        </View>
        <Text style={styles.note}>
          Auth tokens are stored with secure storage on native platforms and AsyncStorage on web.
        </Text>
      </SectionCard>

      <SectionCard
        title="What Changed In V1"
        subtitle="This version now covers sync, reminders, and backup workflows too."
      >
        <View style={styles.noteList}>
          <Text style={styles.note}>Meal history now supports edit and delete.</Text>
          <Text style={styles.note}>Completed fasts can be adjusted instead of only viewed.</Text>
          <Text style={styles.note}>Hydration has its own tracking flow and goal.</Text>
          <Text style={styles.note}>Insights and weekly targets make the app feel more complete.</Text>
          <Text style={styles.note}>Cloud sync, auth, secure session storage, and reminders are wired in.</Text>
        </View>
      </SectionCard>
    </View>
  );
};

const createStyles = (palette: ThemePalette) => StyleSheet.create({
  wrap: {
    gap: 20,
  },
  input: {
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: palette.text,
    backgroundColor: palette.surfaceStrong,
    borderWidth: 1,
    borderColor: palette.track,
    fontSize: 15,
  },
  fieldGroup: {
    gap: 10,
  },
  fieldLabel: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeCard: {
    flexGrow: 1,
    minWidth: 160,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 10,
  },
  themeCardPressed: {
    opacity: 0.82,
  },
  themeCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  themeCardTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '800',
  },
  themeCardState: {
    color: palette.amberSoft,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  themeCardDescription: {
    color: palette.textSoft,
    fontSize: 13,
    lineHeight: 19,
  },
  themeSwatchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeSwatch: {
    width: 22,
    height: 22,
    borderRadius: 999,
  },
  noteList: {
    gap: 8,
  },
  note: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  syncStatus: {
    color: palette.text,
    fontSize: 13,
    lineHeight: 20,
  },
  apiNote: {
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
