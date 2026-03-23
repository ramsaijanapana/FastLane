import React, { useMemo } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { ThemePalette, useTheme } from '../theme';

export const SectionCard = ({
  title,
  subtitle,
  children,
  style,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardAccent} />
      <View style={styles.headerBlock}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.divider} />
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
};

export const ProgressBar = ({
  progress,
  accent,
  height = 10,
}: {
  progress: number;
  accent?: string;
  height?: number;
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.progressTrack, { height }]}>
      <View
        style={[
          styles.progressFill,
          {
            width: `${Math.max(Math.min(progress, 1) * 100, progress > 0 ? 6 : 0)}%`,
            backgroundColor: accent ?? theme.amber,
          },
        ]}
      />
    </View>
  );
};

export const MetricTile = ({
  value,
  label,
  hint,
}: {
  value: string;
  label: string;
  hint?: string;
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {hint ? <Text style={styles.metricHint}>{hint}</Text> : null}
    </View>
  );
};

export const ChipButton = ({
  label,
  onPress,
  selected,
  accent,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  accent?: string;
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const chipAccent = accent ?? theme.amber;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && { backgroundColor: chipAccent, borderColor: chipAccent },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
};

export const ActionButton = ({
  label,
  onPress,
  tone = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        tone === 'primary' && styles.buttonPrimary,
        tone === 'secondary' && styles.buttonSecondary,
        tone === 'danger' && styles.buttonDanger,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          tone === 'primary' && styles.buttonTextPrimary,
          tone === 'secondary' && styles.buttonTextSecondary,
          tone === 'danger' && styles.buttonTextDanger,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export const EmptyState = ({ text }: { text: string }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <Text style={styles.empty}>{text}</Text>;
};

const createStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    card: {
      borderRadius: 30,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.borderSoft,
      overflow: 'hidden',
      shadowColor: '#000000',
      shadowOpacity: theme.key === 'daylight' || theme.key === 'sunrise' || theme.key === 'rose' ? 0.08 : 0.24,
      shadowRadius: 24,
      shadowOffset: {
        width: 0,
        height: 14,
      },
      elevation: 10,
    },
    cardAccent: {
      height: 4,
      backgroundColor: theme.amber,
      opacity: theme.key === 'daylight' || theme.key === 'sunrise' || theme.key === 'rose' ? 0.8 : 0.92,
    },
    headerBlock: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      backgroundColor: theme.surface,
    },
    header: {
      gap: 6,
    },
    divider: {
      marginTop: 12,
      height: 1,
      backgroundColor: theme.borderSoft,
    },
    body: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 18,
      backgroundColor: theme.surfaceStrong,
      gap: 18,
    },
    title: {
      color: theme.text,
      fontSize: 22,
      fontWeight: '800',
    },
    subtitle: {
      color: theme.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    progressTrack: {
      borderRadius: 999,
      backgroundColor: theme.track,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
    },
    metricTile: {
      minWidth: 120,
      padding: 18,
      borderRadius: 24,
      backgroundColor: theme.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.borderSoft,
      gap: 4,
    },
    metricValue: {
      color: theme.textStrong,
      fontSize: 28,
      fontWeight: '900',
    },
    metricLabel: {
      color: theme.textMuted,
      fontSize: 13,
    },
    metricHint: {
      color: theme.textSoft,
      fontSize: 12,
      lineHeight: 17,
    },
    chip: {
      minWidth: 72,
      borderRadius: 999,
      paddingVertical: 11,
      paddingHorizontal: 15,
      alignItems: 'center',
      backgroundColor: theme.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.borderSoft,
    },
    chipText: {
      color: theme.text,
      fontWeight: '700',
    },
    chipTextSelected: {
      color: theme.background,
    },
    button: {
      minHeight: 46,
      borderRadius: 18,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPrimary: {
      backgroundColor: theme.amber,
    },
    buttonSecondary: {
      backgroundColor: theme.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.borderSoft,
    },
    buttonDanger: {
      backgroundColor: theme.redSurface,
      borderWidth: 1,
      borderColor: theme.red,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: '800',
    },
    buttonTextPrimary: {
      color: theme.background,
    },
    buttonTextSecondary: {
      color: theme.text,
    },
    buttonTextDanger: {
      color: theme.red,
    },
    pressed: {
      opacity: 0.72,
    },
    empty: {
      color: theme.textMuted,
      fontSize: 14,
      lineHeight: 21,
    },
  });
