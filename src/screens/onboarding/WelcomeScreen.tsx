// ============================================================================
// EVENTUALLY.VET - Welcome Screen
// First screen new users see - sets the tone with military branding
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/common/Button';
import { defaultTheme, typography, spacing } from '../../theme';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Logo Area */}
      <View style={styles.logoSection}>
        <View style={styles.logoContainer}>
          <Ionicons name="shield-checkmark" size={72} color={defaultTheme.primary} />
        </View>
        <Text style={styles.appName}>EVENTUALLY.VET</Text>
        <Text style={styles.tagline}>Your Service. Your Records. Your Future.</Text>
      </View>

      {/* Value Props */}
      <View style={styles.features}>
        <FeatureItem
          icon="medical"
          text="Track every medical appointment from day one"
        />
        <FeatureItem
          icon="globe"
          text="Log deployments, duty stations & hazard exposures"
        />
        <FeatureItem
          icon="document-text"
          text="Build your VA claim with years of documentation"
        />
        <FeatureItem
          icon="lock-closed"
          text="Your data stays on your device — forever"
        />
      </View>

      {/* CTA */}
      <View style={styles.ctaSection}>
        <Button
          title="Begin Setup"
          onPress={onGetStarted}
          variant="primary"
          size="large"
          style={{ width: '100%' }}
        />
        <Text style={styles.disclaimer}>
          Not affiliated with the VA or DoD. This is a personal record-keeping tool.
        </Text>
      </View>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon as any} size={22} color={defaultTheme.primary} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: defaultTheme.background,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: defaultTheme.surface,
    borderWidth: 3,
    borderColor: defaultTheme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  appName: {
    ...typography.h1,
    color: defaultTheme.text,
    letterSpacing: 2,
    textAlign: 'center',
  },
  tagline: {
    ...typography.body,
    color: defaultTheme.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  features: {
    gap: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureText: {
    ...typography.body,
    color: defaultTheme.textSecondary,
    flex: 1,
  },
  ctaSection: {
    alignItems: 'center',
  },
  disclaimer: {
    ...typography.caption,
    color: defaultTheme.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
