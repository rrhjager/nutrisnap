import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nutrisnap.app',
  appName: 'NutriSnap',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#10b981",
      sound: "beep.wav",
    },
  },
};

export default config;
