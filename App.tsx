// ============================================================================
// EVENTUALLY.VET
// Your Service. Your Records. Your Future.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider } from './src/theme';
import { AppNavigator } from './src/navigation/AppNavigator';
import { OnboardingFlow } from './src/screens/onboarding/OnboardingFlow';
import { database } from './src/services/database';
import { defaultTheme } from './src/theme';
import { shouldSeedData, seedDemoData } from './src/services/seedData';
import { biometricAuth } from './src/services/biometricAuth';
import { subscriptionService } from './src/services/subscriptionService';
import { vaContentService } from './src/services/vaContentService';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    try {
      // Load icon fonts first
      await Font.loadAsync({
        ...Ionicons.font,
      });

      // Initialize the database
      await database.initialize();

      // Seed demo data on first launch
      const needsSeed = await shouldSeedData();
      if (needsSeed) {
        await seedDemoData();
      }

      // Initialize services
      await biometricAuth.initialize();
      await subscriptionService.initialize();
      await vaContentService.initialize();

      // Check if onboarding is complete
      const settings = await database.getSettings();
      setShowOnboarding(!settings.onboardingComplete);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setShowOnboarding(true);
    } finally {
      setIsLoading(false);
    }
  }

  function handleOnboardingComplete() {
    setShowOnboarding(false);
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={defaultTheme.primary} />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <StatusBar style="light" />
      {showOnboarding ? (
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      ) : (
        <NavigationContainer
          theme={{
            dark: true,
            colors: {
              primary: defaultTheme.primary,
              background: defaultTheme.background,
              card: defaultTheme.surface,
              text: defaultTheme.text,
              border: defaultTheme.border,
              notification: defaultTheme.error,
            },
            fonts: {
              regular: {
                fontFamily: 'System',
                fontWeight: '400',
              },
              medium: {
                fontFamily: 'System',
                fontWeight: '500',
              },
              bold: {
                fontFamily: 'System',
                fontWeight: '700',
              },
              heavy: {
                fontFamily: 'System',
                fontWeight: '800',
              },
            },
          }}
        >
          <AppNavigator />
        </NavigationContainer>
      )}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: defaultTheme.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
