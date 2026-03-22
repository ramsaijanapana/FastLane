import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { AuthSession } from '../types';

const AUTH_STORAGE_KEY = 'fastlane-auth-session';

const canUseSecureStore = Platform.OS !== 'web';

export const loadAuthSession = async (): Promise<AuthSession | null> => {
  const raw = canUseSecureStore
    ? await SecureStore.getItemAsync(AUTH_STORAGE_KEY)
    : await AsyncStorage.getItem(AUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
};

export const saveAuthSession = async (session: AuthSession) => {
  const payload = JSON.stringify(session);

  if (canUseSecureStore) {
    await SecureStore.setItemAsync(AUTH_STORAGE_KEY, payload);
    return;
  }

  await AsyncStorage.setItem(AUTH_STORAGE_KEY, payload);
};

export const clearAuthSession = async () => {
  if (canUseSecureStore) {
    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
    return;
  }

  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
};

