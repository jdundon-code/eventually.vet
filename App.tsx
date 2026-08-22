// ============================================================================
// EVENTUALLY.VET
// Your Service. Your Records. Your Future.
//
// A mobile app for active duty military members and veterans to track
// medical appointments, deployments, duty stations, and build evidence
// for VA disability claims.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
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
      // Initialize the database
      await database.initialize();

      // Seed demo data on first launch (for prototype testing)
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
      // Default to onboarding on error
      setShowOnboarding(true);
    } finally {
      setIsLoading(false);
    }
  }

  function handleOnboardingComplete() {
    setShowOnboarding(false);
  }

  // Loading state
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
