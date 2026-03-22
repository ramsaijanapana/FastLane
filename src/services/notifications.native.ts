import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const ensureReminderPermissions = async () => {
  const current = await Notifications.getPermissionsAsync();

  if (current.granted) {
    return { granted: true };
  }

  const requested = await Notifications.requestPermissionsAsync();
  return { granted: requested.granted };
};

export const syncReminderSchedule = async (enabled: boolean, hour: number) => {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!enabled) {
    return true;
  }

  const permission = await ensureReminderPermissions();

  if (!permission.granted) {
    return false;
  }

  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.DEFAULT,
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Fastlane reminder',
      body: 'Log your fasting window, meals, and water before the day disappears.',
      sound: false,
    },
    trigger: {
      channelId: 'default',
      hour,
      minute: 0,
      repeats: true,
    },
  });

  return true;
};

