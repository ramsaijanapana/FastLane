import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';

import { TARGET_OPTIONS, WATER_PRESETS } from '../constants';
import { estimateMealFromWords } from '../services/foodEstimate';
import { getMealPrefillFromScan } from '../services/foodLookup';
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
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [mealName, setMealName] = useState('');
  const [mealCalories, setMealCalories] = useState('');
  const [mealNote, setMealNote] = useState('');
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [mealAssistStatus, setMealAssistStatus] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerBusy, setScannerBusy] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('');
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
    setMealAssistStatus('');
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
    const estimatedMeal =
      !Number.isFinite(parsedCalories) || parsedCalories <= 0
        ? estimateMealFromWords(trimmedName)
        : null;

    const draft = {
      name: estimatedMeal?.name ?? trimmedName,
      calories:
        Number.isFinite(parsedCalories) && parsedCalories > 0
          ? parsedCalories
          : estimatedMeal?.calories,
      note: trimmedNote || estimatedMeal?.note || undefined,
    };

    if (estimatedMeal && (!Number.isFinite(parsedCalories) || parsedCalories <= 0)) {
      setMealAssistStatus(`Estimated ${estimatedMeal.calories} cal from your words.`);
    }

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
    setMealAssistStatus('');
  };

  const handleEstimateMeal = () => {
    const estimate = estimateMealFromWords(mealName);

    if (!estimate) {
      setMealAssistStatus(
        "Couldn't confidently estimate that meal. You can still enter calories manually.",
      );
      return;
    }

    setMealName(estimate.name);
    setMealCalories(String(estimate.calories));
    setMealNote((current) => current.trim() || estimate.note);
    setMealAssistStatus(`Estimated ${estimate.calories} cal from your words.`);
  };

  const handleOpenScanner = async () => {
    setScannerStatus('');

    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();

      if (!permission.granted) {
        setScannerStatus('Camera permission is required to scan food and drink codes.');
        return;
      }
    }

    setScannerOpen(true);
  };

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (scannerBusy) {
      return;
    }

    setScannerBusy(true);

    try {
      const prefill = await getMealPrefillFromScan(result.data, result.type);

      setMealName(prefill.name);
      setMealCalories(
        typeof prefill.calories === 'number' ? String(prefill.calories) : '',
      );
      setMealNote(prefill.note ?? '');
      setMealAssistStatus('');
      setScannerStatus('Scan captured. Review the meal details, then save.');
      setScannerOpen(false);
    } catch (error) {
      setScannerStatus(`Unable to read that code: ${String(error)}`);
    } finally {
      setScannerBusy(false);
    }
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
                : 'Track meals quickly, estimate plain-language entries, or scan packaged items.'
            }
          >
            <View style={styles.scanActionRow}>
              <ActionButton
                label={scannerOpen ? 'Close Scanner' : 'Scan Food / Drink Code'}
                onPress={() => {
                  if (scannerOpen) {
                    setScannerOpen(false);
                    setScannerStatus('');
                    return;
                  }

                  void handleOpenScanner();
                }}
                tone="secondary"
              />
              {scannerOpen ? (
                <ActionButton
                  label={scannerBusy ? 'Scanning...' : 'Ready To Scan'}
                  onPress={() => undefined}
                  disabled
                />
              ) : null}
            </View>
            {scannerStatus ? <Text style={styles.scanStatus}>{scannerStatus}</Text> : null}
            {scannerOpen ? (
              <View style={styles.scannerPanel}>
                {cameraPermission?.granted ? (
                  <>
                    <CameraView
                      style={styles.scannerCamera}
                      facing="back"
                      barcodeScannerSettings={{
                        barcodeTypes: [
                          'qr',
                          'ean13',
                          'ean8',
                          'upc_a',
                          'upc_e',
                          'code128',
                          'code39',
                          'datamatrix',
                          'pdf417',
                        ],
                      }}
                      onBarcodeScanned={scannerBusy ? undefined : handleBarcodeScanned}
                    />
                    <Text style={styles.scanHint}>
                      Center the package QR or barcode inside the frame. Known product
                      codes try a free lookup first, then fall back to the raw scan text.
                    </Text>
                  </>
                ) : (
                  <View style={styles.scannerFallback}>
                    <Text style={styles.scanHint}>
                      Camera access is needed before the scanner can open.
                    </Text>
                    <ActionButton
                      label="Grant Camera Access"
                      onPress={() => {
                        void handleOpenScanner();
                      }}
                    />
                  </View>
                )}
              </View>
            ) : null}
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
            <Text style={styles.assistHint}>
              Type plain words like `2 eggs and toast` or `large latte`, then estimate
              or log directly.
            </Text>
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
                label="Estimate From Words"
                onPress={handleEstimateMeal}
                tone="secondary"
                disabled={!mealName.trim()}
              />
              <ActionButton
                label={editingMealId ? 'Save Meal' : 'Log Food'}
                onPress={handleMealSave}
                disabled={!mealName.trim()}
              />
              {editingMealId ? (
                <ActionButton label="Cancel" onPress={clearMealForm} tone="secondary" />
              ) : null}
            </View>
            {mealAssistStatus ? (
              <Text style={styles.mealAssistStatus}>{mealAssistStatus}</Text>
            ) : null}
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
  scanActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  scanStatus: {
    color: palette.amberSoft,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  scannerPanel: {
    gap: 10,
    padding: 12,
    borderRadius: 22,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.borderSoft,
  },
  scannerCamera: {
    width: '100%',
    aspectRatio: 1.15,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: palette.backgroundAlt,
  },
  scannerFallback: {
    gap: 10,
  },
  scanHint: {
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  assistHint: {
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  mealAssistStatus: {
    color: palette.green,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
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
