import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const setupDailyReminder = async () => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const permStatus = await LocalNotifications.requestPermissions();
    if (permStatus.display === 'granted') {
      // Schedule a daily reminder at 20:00 (8 PM)
      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Don't break your streak! 🔥",
            body: "Have you logged all your meals today? Keep your streak alive!",
            id: 1,
            schedule: {
              on: { hour: 20, minute: 0 },
              allowWhileIdle: true,
            },
            sound: "beep.wav",
            actionTypeId: "",
            extra: null
          }
        ]
      });
      console.log('Daily reminder scheduled successfully');
    }
  } catch (error) {
    console.error('Failed to setup local notifications', error);
  }
};
