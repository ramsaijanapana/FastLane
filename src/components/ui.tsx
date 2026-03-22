import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { palette } from '../theme';

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
}) => (
  <View style={[styles.card, style]}>
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
    {children}
  </View>
);

export const ProgressBar = ({
  progress,
  accent = palette.amber,
  height = 10,
}: {
  progress: number;
  accent?: string;
  height?: number;
}) => (
  <View style={[styles.progressTrack, { height }]}>
    <View
      style={[
        styles.progressFill,
        {
          width: `${Math.max(Math.min(progress, 1) * 100, progress > 0 ? 6 : 0)}%`,
          backgroundColor: accent,
        },
      ]}
    />
  </View>
);

export const MetricTile = ({
  value,
  label,
  hint,
}: {
  value: string;
  label: string;
  hint?: string;
}) => (
  <View style={styles.metricTile}>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
    {hint ? <Text style={styles.metricHint}>{hint}</Text> : null}
  </View>
);

export const ChipButton = ({
  label,
  onPress,
  selected,
  accent = palette.amber,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  accent?: string;
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.chip,
      selected && { backgroundColor: accent, borderColor: accent },
      pressed && styles.pressed,
    ]}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
  </Pressable>
);

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
}) => (
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

export const EmptyState = ({ text }: { text: string }) => (
  <Text style={styles.empty}>{text}</Text>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 30,
    padding: 22,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 18,
  },
  header: {
    gap: 6,
  },
  title: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#a49584',
    fontSize: 14,
    lineHeight: 20,
  },
  progressTrack: {
    borderRadius: 999,
    backgroundColor: palette.track,
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
    backgroundColor: palette.surfaceStrong,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    gap: 4,
  },
  metricValue: {
    color: '#fff6eb',
    fontSize: 28,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#b8a999',
    fontSize: 13,
  },
  metricHint: {
    color: palette.textSoft,
    fontSize: 12,
    lineHeight: 17,
  },
  chip: {
    minWidth: 72,
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 15,
    alignItems: 'center',
    backgroundColor: '#1b150f',
    borderWidth: 1,
    borderColor: palette.borderSoft,
  },
  chipText: {
    color: '#f4e8d7',
    fontWeight: '700',
  },
  chipTextSelected: {
    color: '#120e0a',
  },
  button: {
    minHeight: 46,
    borderRadius: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: palette.amber,
  },
  buttonSecondary: {
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: '#3a3025',
  },
  buttonDanger: {
    backgroundColor: palette.redSurface,
    borderWidth: 1,
    borderColor: '#5f252a',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  buttonTextPrimary: {
    color: '#130f0b',
  },
  buttonTextSecondary: {
    color: '#f4e8d7',
  },
  buttonTextDanger: {
    color: '#ffe4e7',
  },
  pressed: {
    opacity: 0.72,
  },
  empty: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
});
