import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { TARGET_OPTIONS, WATER_PRESETS } from '../constants';
import { ThemePalette, useTheme } from '../theme';
import type { FastSession, MealEntry, WaterEntry } from '../types';
import {
  formatClock,
  formatHours,
  formatMl,
  formatShortDate,
  getCompletedFastHours,
} from '../utils';
import {
  ActionButton,
  ChipButton,
  EmptyState,
  SectionCard,
} from '../components/ui';

type MealDraft = {
  name: string;
  calories?: number;
  note?: string;
};

type JournalScreenProps = {
  activeFast: FastSession | null;
  meals: MealEntry[];
  fastHistory: FastSession[];
  waterEntries: WaterEntry[];
  onAddMeal: (draft: MealDraft) => void;
  onUpdateMeal: (id: string, draft: MealDraft) => void;
  onDeleteMeal: (id: string) => void;
  onAddWater: (amountMl: number) => void;
  onDeleteWater: (id: string) => void;
  onUpdateFast: (
    id: string,
    changes: { durationHours: number; targetHours: number; note?: string },
  ) => void;
  onDeleteFast: (id: string) => void;
};

export const JournalScreen = ({
  activeFast,
  meals,
  fastHistory,
  waterEntries,
  onAddMeal,
  onUpdateMeal,
  onDeleteMeal,
  onAddWater,
  onDeleteWater,
  onUpdateFast,
  onDeleteFast,
}: JournalScreenProps) => {
  const { theme: palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { width } = useWindowDimensions();
  const isCompact = width < 1020;

  const [mealName, setMealName] = useState('');
  const [mealCalories, setMealCalories] = useState('');
  const [mealNote, setMealNote] = useState('');
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [customWater, setCustomWater] = useState('');
  const [editingFastId, setEditingFastId] = useState<string | null>(null);
  const [fastDuration, setFastDuration] = useState('');
  const [fastTarget, setFastTarget] = useState(16);
  const [fastNote, setFastNote] = useState('');

  const clearMealForm = () => {
    setEditingMealId(null);
    setMealName('');
    setMealCalories('');
    setMealNote('');
  };

  const clearFastForm = () => {
    setEditingFastId(null);
    setFastDuration('');
    setFastTarget(16);
    setFastNote('');
  };

  const handleMealSave = () => {
    const trimmedName = mealName.trim();
    const trimmedNote = mealNote.trim();

    if (!trimmedName) {
      return;
    }

    const parsedCalories = Number.parseInt(mealCalories, 10);

    const draft = {
      name: trimmedName,
      calories: Number.isFinite(parsedCalories) ? parsedCalories : undefined,
      note: trimmedNote || undefined,
    };

    if (editingMealId) {
      onUpdateMeal(editingMealId, draft);
    } else {
      onAddMeal(draft);
    }

    clearMealForm();
  };

  const beginMealEdit = (meal: MealEntry) => {
    setEditingMealId(meal.id);
    setMealName(meal.name);
    setMealCalories(
      typeof meal.calories === 'number' ? String(meal.calories) : '',
    );
    setMealNote(meal.note ?? '');
  };

  const handleFastSave = () => {
    if (!editingFastId) {
      return;
    }

    const parsedDuration = Number.parseFloat(fastDuration);

    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      return;
    }

    onUpdateFast(editingFastId, {
      durationHours: parsedDuration,
      targetHours: fastTarget,
      note: fastNote.trim() || undefined,
    });

    clearFastForm();
  };

  const beginFastEdit = (session: FastSession) => {
    setEditingFastId(session.id);
    setFastDuration(getCompletedFastHours(session).toFixed(1));
    setFastTarget(session.targetHours);
    setFastNote(session.note ?? '');
  };

  const handleCustomWater = () => {
    const parsed = Number.parseInt(customWater, 10);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    onAddWater(parsed);
    setCustomWater('');
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.grid, !isCompact && styles.gridWide]}>
        <View style={styles.primaryColumn}>
          <SectionCard
            title={editingMealId ? 'Edit Meal' : 'Food Log'}
            subtitle={
              activeFast
                ? 'Logging food closes the current fast automatically.'
                : 'Track meals quickly and keep the friction low.'
            }
          >
            <View style={styles.quickRow}>
              {['Protein bowl', 'Salad wrap', 'Eggs + toast', 'Fruit snack'].map(
                (template) => (
                  <ChipButton
                    key={template}
                    label={template}
                    onPress={() => setMealName(template)}
                  />
                ),
              )}
            </View>
            <TextInput
              value={mealName}
              onChangeText={setMealName}
              placeholder="Meal or snack"
              placeholderTextColor={palette.textMuted}
              style={styles.input}
            />
            <TextInput
              value={mealCalories}
              onChangeText={setMealCalories}
              placeholder="Calories (optional)"
              placeholderTextColor={palette.textMuted}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <TextInput
              value={mealNote}
              onChangeText={setMealNote}
              placeholder="Short note, like how you felt"
              placeholderTextColor={palette.textMuted}
              style={[styles.input, styles.noteInput]}
              multiline
            />
            <View style={styles.actionRow}>
              <ActionButton
                label={editingMealId ? 'Save Meal' : 'Log Food'}
                onPress={handleMealSave}
                disabled={!mealName.trim()}
              />
              {editingMealId ? (
                <ActionButton label="Cancel" onPress={clearMealForm} tone="secondary" />
              ) : null}
            </View>
          </SectionCard>

          <SectionCard
            title="Meal History"
            subtitle="Edit or delete meals without losing the lightweight flow."
          >
            {meals.length === 0 ? (
              <EmptyState text="Meals will appear here with edit and delete controls." />
            ) : (
              meals.slice(0, 10).map((meal) => (
                <View key={meal.id} style={styles.listRow}>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle}>{meal.name}</Text>
                    <Text style={styles.listMeta}>
                      {formatClock(meal.timestamp)}
                      {typeof meal.calories === 'number' ? ` - ${meal.calories} cal` : ''}
                    </Text>
                    {meal.note ? <Text style={styles.listNote}>{meal.note}</Text> : null}
                  </View>
                  <View style={styles.inlineActions}>
                    <ActionButton
                      label="Edit"
                      onPress={() => beginMealEdit(meal)}
                      tone="secondary"
                    />
                    <ActionButton
                      label="Delete"
                      onPress={() => onDeleteMeal(meal.id)}
                      tone="danger"
                    />
                  </View>
                </View>
              ))
            )}
          </SectionCard>
        </View>

        <View style={styles.secondaryColumn}>
          <SectionCard
            title="Water Log"
            subtitle="Hydration tracking is part of v1, with quick add and cleanup controls."
          >
            <View style={styles.quickRow}>
              {WATER_PRESETS.map((amount) => (
                <ChipButton
                  key={amount}
                  label={`${amount} ml`}
                  onPress={() => onAddWater(amount)}
                  accent={palette.teal}
                />
              ))}
            </View>
            <View style={styles.customWaterRow}>
              <TextInput
                value={customWater}
                onChangeText={setCustomWater}
                placeholder="Custom water amount"
                placeholderTextColor={palette.textMuted}
                keyboardType="number-pad"
                style={[styles.input, styles.flexInput]}
              />
              <ActionButton label="Add Water" onPress={handleCustomWater} />
            </View>

            {waterEntries.length === 0 ? (
              <EmptyState text="Water entries will appear here after your first quick add." />
            ) : (
              waterEntries.slice(0, 8).map((entry) => (
                <View key={entry.id} style={styles.listRow}>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle}>{formatMl(entry.amountMl)}</Text>
                    <Text style={styles.listMeta}>
                      {formatShortDate(entry.timestamp)} - {formatClock(entry.timestamp)}
                    </Text>
                  </View>
                  <ActionButton
                    label="Delete"
                    onPress={() => onDeleteWater(entry.id)}
                    tone="danger"
                  />
                </View>
              ))
            )}
          </SectionCard>

          <SectionCard
            title={editingFastId ? 'Edit Fast Session' : 'Fast History'}
            subtitle="Completed windows are editable here so history stays trustworthy."
          >
            {editingFastId ? (
              <View style={styles.fastEditor}>
                <TextInput
                  value={fastDuration}
                  onChangeText={setFastDuration}
                  placeholder="Duration hours"
                  placeholderTextColor={palette.textMuted}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
                <View style={styles.quickRow}>
                  {TARGET_OPTIONS.map((hours) => (
                    <ChipButton
                      key={hours}
                      label={`${hours}h`}
                      onPress={() => setFastTarget(hours)}
                      selected={fastTarget === hours}
                    />
                  ))}
                </View>
                <TextInput
                  value={fastNote}
                  onChangeText={setFastNote}
                  placeholder="Session note (optional)"
                  placeholderTextColor={palette.textMuted}
                  style={[styles.input, styles.noteInput]}
                  multiline
                />
                <View style={styles.actionRow}>
                  <ActionButton label="Save Fast" onPress={handleFastSave} />
                  <ActionButton label="Cancel" onPress={clearFastForm} tone="secondary" />
                </View>
              </View>
            ) : null}

            {fastHistory.length === 0 ? (
              <EmptyState text="Completed fasts will appear here with editing controls." />
            ) : (
              fastHistory.slice(0, 10).map((session) => {
                const durationHours = getCompletedFastHours(session);
                const hitTarget = durationHours >= session.targetHours;

                return (
                  <View key={session.id} style={styles.listRow}>
                    <View style={styles.listCopy}>
                      <Text style={styles.listTitle}>{formatHours(durationHours)} fast</Text>
                      <Text style={styles.listMeta}>
                        {formatShortDate(session.completedAt ?? session.startTime)} - target {session.targetHours}h
                      </Text>
                      {session.note ? <Text style={styles.listNote}>{session.note}</Text> : null}
                      <Text style={[styles.fastStatus, hitTarget && styles.fastStatusHit]}>
                        {hitTarget ? 'Target hit' : 'Below target'}
                      </Text>
                    </View>
                    <View style={styles.inlineActions}>
                      <ActionButton
                        label="Edit"
                        onPress={() => beginFastEdit(session)}
                        tone="secondary"
                      />
                      <ActionButton
                        label="Delete"
                        onPress={() => onDeleteFast(session.id)}
                        tone="danger"
                      />
                    </View>
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

const createStyles = (palette: ThemePalette) => StyleSheet.create({
  wrap: {
    gap: 20,
  },
  grid: {
    gap: 20,
  },
  gridWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  primaryColumn: {
    flex: 1.1,
    gap: 20,
  },
  secondaryColumn: {
    flex: 0.9,
    gap: 20,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
  noteInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 8,
  },
  listCopy: {
    flex: 1,
  },
  listTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
  listMeta: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  listNote: {
    color: palette.textSoft,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
  },
  inlineActions: {
    gap: 8,
  },
  customWaterRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  flexInput: {
    flex: 1,
  },
  fastEditor: {
    gap: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderSoft,
  },
  fastStatus: {
    color: palette.amberSoft,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  fastStatusHit: {
    color: palette.green,
  },
});
