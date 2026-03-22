import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { AppState } from '../types';

export const exportBackup = async (state: AppState) => {
  const payload = JSON.stringify(state, null, 2);

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fastlane-backup-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  const fileUri = `${FileSystem.cacheDirectory}fastlane-backup-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(fileUri, payload);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Fastlane backup',
    });
  }
};

export const importBackup = async (): Promise<unknown | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0] as DocumentPicker.DocumentPickerAsset & {
    file?: File;
  };

  if (Platform.OS === 'web' && asset.file) {
    const text = await asset.file.text();
    return JSON.parse(text);
  }

  const fileContents = await FileSystem.readAsStringAsync(asset.uri);
  return JSON.parse(fileContents);
};
