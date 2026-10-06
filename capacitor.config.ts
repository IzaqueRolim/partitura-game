import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'br.ufam.partitura',
  appName: 'Partitura',
  webDir: 'dist',
  android: {
    // o app funciona todo offline (sons e partituras ficam dentro do APK)
    allowMixedContent: false,
    backgroundColor: '#f7f7f5',
  },
  plugins: {
    SplashScreen: { launchShowDuration: 800, backgroundColor: '#f7f7f5' },
  },
}

export default config
