import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.simbtech.sms',
  appName: 'SMS Simbtech',
  // webDir is required by Capacitor CLI even when using server.url
  webDir: 'www',
  server: {
    // Load directly from the live production site.
    // This means updates to the web app are instantly reflected in the mobile app.
    url: 'https://ssiccmr.com',
    androidScheme: 'https',
    // Allow all navigation within the same origin
    allowNavigation: ['ssiccmr.com', 'api.ssiccmr.com'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1e40af',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
