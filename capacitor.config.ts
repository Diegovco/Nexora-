import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'mx.edu.utcalvillo.nexora',
  appName: 'Nexora',
  webDir: 'www',
  server: {
    // Permite que la app del celular hable con la API por http://
    // (por ejemplo http://192.168.18.18:5000 mientras pruebas en tu red).
    // Cuando la API esté publicada con https:// se puede quitar.
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
