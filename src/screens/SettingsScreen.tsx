import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { TARGET_OPTIONS } from '../constants';
import { apiBaseUrl } from '../services/api';
import { resolveTheme, themeOptions, ThemePalette, useTheme } from '../theme';
import type {
  AuthSession,
  CoachingTone,
  SocialAuthProvider,
  ThemeKey,
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

type SettingsPanel = 'account' | 'appearance' | 'goals';

const toneOptions: { value: CoachingTone; label: string }[] = [
  { value: 'steady', label: 'Steady' },
  { value: 'gentle', label: 'Gentle' },
  { value: 'focused', label: 'Focused' },
];

const panelOptions: { key: SettingsPanel; label: string }[] = [
  { key: 'account', label: 'Account' },
  { key: 'appearance', label: 'Appearance' },
  { key: 'goals', label: 'Goals' },
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
  const { theme: palette, setThemeKey: previewThemeKey } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { width } = useWindowDimensions();
  const isCompact = width < 1020;
  const authIdentity =
    authSession?.isPlaceholderEmail && authSession.provider
      ? `${authSession.name} via ${authSession.provider === 'google' ? 'Google' : 'Facebook'}`
      : authSession?.email ?? '';
  const [activePanel, setActivePanel] = useState<SettingsPanel>('account');
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
  const [themeKey, setThemeKey] = useState<ThemeKey>(settings.themeKey);
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

  useEffect(() => {
    previewThemeKey(themeKey);
  }, [themeKey, previewThemeKey]);

  const handleSave = async () => {
    const nextWaterGoal = Number.parseInt(dailyWaterGoalMl, 10);
    const nextCalorieGoal = Number.parseInt(dailyCalorieGoal, 10);
    const nextWeeklyGoal = Number.parseInt(weeklyFastGoal, 10);

    await onSaveSettings({
      displayName: displayName.trim() || 'Tracker',
      defaultFastGoalHours,
      dailyWaterGoalMl:
        Number.isFinite(nextWaterGoal) && nextWaterGoal > 0
          ? nextWaterGoal
          : settings.dailyWaterGoalMl,
      dailyCalorieGoal:
        Number.isFinite(nextCalorieGoal) && nextCalorieGoal > 0
          ? nextCalorieGoal
          : settings.dailyCalorieGoal,
      weeklyFastGoal:
        Number.isFinite(nextWeeklyGoal) && nextWeeklyGoal > 0
          ? nextWeeklyGoal
          : settings.weeklyFastGoal,
      coachingTone,
      themeKey,
      remindersEnabled,
      reminderHour,
    });
  };

  const handleThemeSelect = (nextThemeKey: ThemeKey) => {
    setThemeKey(nextThemeKey);
  };

  return (
    <View style={styles.wrap}>
      <SectionCard
        title="Account"
        subtitle="Compact settings with one active panel at a time."
        style={styles.mainCard}
      >
        <View style={styles.panelTabs}>
          {panelOptions.map((panel) => (
            <ChipButton
              key={panel.key}
              label={panel.label}
              onPress={() => setActivePanel(panel.key)}
              selected={activePanel === panel.key}
              accent={palette.amber}
            />
          ))}
        </View>

        {activePanel === 'account' ? (
          <View style={[styles.panelContent, !isCompact && styles.panelContentWide]}>
            <View style={styles.panelColumn}>
              <Text style={styles.sectionTitle}>
                {authSession ? 'Cloud Sync Connected' : 'Sign In For Sync'}
              </Text>
              {authSession ? (
                <>
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
                </>
              ) : (
                <>
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
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Name"
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
                </>
              )}
              <Text style={styles.syncStatus}>{syncStatus}</Text>
            </View>

            <View style={styles.panelColumn}>
              <Text style={styles.sectionTitle}>Backup & Device Tools</Text>
              <View style={styles.row}>
                <ActionButton label="Export Backup" onPress={onExportBackup} />
                <ActionButton
                  label="Import Backup"
                  onPress={onImportBackup}
                  tone="secondary"
                />
              </View>
              <Text style={styles.note}>
                Auth uses secure storage on native and AsyncStorage on web.
              </Text>
              <Text style={styles.apiNote}>API endpoint: {apiBaseUrl}</Text>
            </View>
          </View>
        ) : null}

        {activePanel === 'appearance' ? (
          <View style={styles.panelContent}>
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
                      onPress={() => handleThemeSelect(option.key)}
                      style={({ pressed }) => [
                        styles.themeTile,
                        {
                          backgroundColor: option.previewBackground,
                          borderColor:
                            themeKey === option.key ? palette.amber : palette.borderSoft,
                        },
                        pressed && styles.themeTilePressed,
                      ]}
                    >
                      <Text
                        style={[styles.themeTileTitle, { color: previewTheme.textStrong }]}
                      >
                        {option.label}
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

            <Text style={styles.note}>
              Theme preview applies immediately. Save to keep it.
            </Text>
            <ActionButton label="Save Appearance" onPress={handleSave} />
          </View>
        ) : null}

        {activePanel === 'goals' ? (
          <View style={styles.panelContent}>
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

            <View style={[styles.row, styles.goalInputRow]}>
              <TextInput
                value={dailyWaterGoalMl}
                onChangeText={setDailyWaterGoalMl}
                placeholder="Water goal (ml)"
                placeholderTextColor={palette.textMuted}
                keyboardType="number-pad"
                style={[styles.input, styles.goalInput]}
              />
              <TextInput
                value={dailyCalorieGoal}
                onChangeText={setDailyCalorieGoal}
                placeholder="Calorie goal"
                placeholderTextColor={palette.textMuted}
                keyboardType="number-pad"
                style={[styles.input, styles.goalInput]}
              />
              <TextInput
                value={weeklyFastGoal}
                onChangeText={setWeeklyFastGoal}
                placeholder="Weekly fast target"
                placeholderTextColor={palette.textMuted}
                keyboardType="number-pad"
                style={[styles.input, styles.goalInput]}
              />
            </View>

            <ActionButton label="Save Goals" onPress={handleSave} />
          </View>
        ) : null}
      </SectionCard>
    </View>
  );
};

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      minHeight: 0,
    },
    mainCard: {
      flex: 1,
      minHeight: 0,
    },
    panelTabs: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    panelContent: {
      gap: 14,
    },
    panelContentWide: {
      flexDirection: 'row',
      gap: 16,
    },
    panelColumn: {
      flex: 1,
      gap: 14,
    },
    sectionTitle: {
      color: palette.textStrong,
      fontSize: 16,
      fontWeight: '800',
    },
    input: {
      minHeight: 48,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: palette.text,
      backgroundColor: palette.surfaceStrong,
      borderWidth: 1,
      borderColor: palette.track,
      fontSize: 14,
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
    goalInputRow: {
      alignItems: 'stretch',
    },
    goalInput: {
      flexGrow: 1,
      minWidth: 180,
    },
    themeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    themeTile: {
      flexGrow: 1,
      minWidth: 112,
      padding: 12,
      borderRadius: 18,
      borderWidth: 1.5,
      gap: 8,
    },
    themeTilePressed: {
      opacity: 0.82,
    },
    themeTileTitle: {
      fontSize: 13,
      fontWeight: '800',
    },
    themeSwatchRow: {
      flexDirection: 'row',
      gap: 6,
    },
    themeSwatch: {
      width: 14,
      height: 14,
      borderRadius: 999,
    },
    note: {
      color: palette.textSoft,
      fontSize: 13,
      lineHeight: 19,
    },
    syncStatus: {
      color: palette.text,
      fontSize: 13,
      lineHeight: 19,
    },
    apiNote: {
      color: palette.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
  });
