import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider } from './src/context/AuthContext';
import { CoinProvider } from './src/context/CoinContext';
import AppNavigator from './src/navigation/AppNavigator';

// Keep splash visible while JS loads, then hide it immediately
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  useEffect(() => {
    // Hide splash screen as soon as the component mounts
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CoinProvider>
          <AppNavigator />
        </CoinProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
