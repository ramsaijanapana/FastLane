import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const pulsePrimary = () => {
  if (Platform.OS === 'web') {
    return;
  }

  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
};

export const pulseSuccess = () => {
  if (Platform.OS === 'web') {
    return;
  }

  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => undefined,
  );
};

