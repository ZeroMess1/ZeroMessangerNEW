import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zeromessenger.app',
  appName: 'Zero Messenger',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    buildOptions: {
      keystorePath: '',
      keystoreAlias: '',
      debuggable: true
    }
  }
};

export default config;
