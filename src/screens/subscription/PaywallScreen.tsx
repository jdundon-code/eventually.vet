// ============================================================================
// EVENTUALLY.VET - Paywall / Upgrade Screen
// Professional tier comparison with pricing, feature lists, and purchase flow
// Non-aggressive: informative, respectful, and transparent about what's free
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {
  subscriptionService,
  SubscriptionTier,
  SubscriptionPeriod,
  PRICING,
  TIER_INFO,
  PremiumFeature,
} from '../../services/subscriptionService';

type SelectedPlan = {
  tier: SubscriptionTier;
  period: SubscriptionPeriod;
};

// Feature lists for each tier
const PRO_FEATURES = [
  { icon: 'cloud-upload', label: 'End-to-end encrypted cloud backup' },
  { icon: 'attach', label: 'Unlimited attachments & documents' },
  { icon: 'mail', label: 'Unlimited buddy letter requests' },
  { icon: 'document-text', label: 'Professional PDF claim export' },
  { icon: 'scale', label: 'Full VA presumptive database + match details' },
  { icon: 'notifications', label: 'Auto-match alerts for new presumptives' },
  { icon: 'list', label: 'Complete audit log access & export' },
  { icon: 'phone-portrait', label: 'Multi-device sync' },
  { icon: 'analytics', label: 'Advanced per-condition claim scoring' },
  { icon: 'star', label: 'Write community reviews on resources' },
  { icon: 'git-merge', label: 'Nexus connection helper' },
  { icon: 'share', label: 'Export data package to VSO/attorney' },
  { icon: 'refresh', label: 'Cloud data recovery on new device' },
];

const MISSION_READY_FEATURES = [
  { icon: 'sparkles', label: 'AI claim analysis & gap detection' },
  { icon: 'clipboard', label: 'Pre-filled DBQ template generator' },
  { icon: 'timer', label: 'Automated buddy letter follow-ups' },
  { icon: 'scan', label: 'VA decision letter analyzer' },
  { icon: 'calendar', label: 'Appeal deadline tracker with alerts' },
  { icon: 'people', label: 'Encrypted family/VSO/attorney sharing' },
  { icon: 'headset', label: 'Priority email & phone support' },
  { icon: 'infinite', label: 'Lifetime access option ($199 one-time)' },
];

interface PaywallScreenProps {
  navigation: any;
  route?: {
    params?: {
      feature?: PremiumFeature; // If navigated from a specific feature gate
      source?: string; // Where the user came from
    };
  };
}

export function PaywallScreen({ navigation, route }: PaywallScreenProps) {
  const { theme } = useTheme();
  const triggeredFeature = route?.params?.feature;
  const source = route?.params?.source;

  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan>({
    tier: 'pro',
    period: 'annual',
  });
  const [purchasing, setPurchasing] = useState(false);
  const [trialAvailable, setTrialAvailable] = useState(false);
  const currentTier = subscriptionService.getTier();

  useEffect(() => {
    checkTrialAvailability();
    // If triggered from a Mission Ready feature, default to that tier
    if (triggeredFeature) {
      const requiredTier = subscriptionService.getRequiredTier(triggeredFeature);
      if (requiredTier === 'mission_ready') {
        setSelectedPlan({ tier: 'mission_ready', period: 'annual' });
      }
    }
  }, []);

  async function checkTrialAvailability() {
    const used = await subscriptionService.hasUsedTrial();
    setTrialAvailable(!used);
  }

  async function handlePurchase() {
    setPurchasing(true);
    try {
      // In production, this integrates with RevenueCat / Expo IAP
      // For now, simulate a successful purchase
      Alert.alert(
        'Confirm Purchase',
        `Subscribe to ${TIER_INFO[selectedPlan.tier].name} (${getPriceDisplay()})?\n\nIn the live app, this opens the App Store / Google Play purchase flow.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Subscribe',
            onPress: async () => {
              const productId = `com.eventuallyvet.${selectedPlan.tier}.${selectedPlan.period}`;
              await subscriptionService.activateSubscription(
                selectedPlan.tier,
                selectedPlan.period,
                productId,
                `txn_${Date.now()}`
              );
              Alert.alert(
                'Welcome!',
                `You're now on ${TIER_INFO[selectedPlan.tier].name}. All premium features are unlocked.`,
                [{ text: 'Continue', onPress: () => navigation.goBack() }]
              );
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  }

  async function handleStartTrial() {
    await subscriptionService.startTrial();
    Alert.alert(
      '7-Day Trial Started',
      'You have full access to Veteran Pro features for 7 days. No charge unless you subscribe.',
      [{ text: 'Explore Pro', onPress: () => navigation.goBack() }]
    );
  }

  async function handleRestore() {
    const { restored, tier } = await subscriptionService.restorePurchases();
    if (restored && tier) {
      Alert.alert('Restored!', `Your ${TIER_INFO[tier].name} subscription has been restored.`, [
        { text: 'Continue', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('No Purchases Found', 'We couldn\'t find any previous purchases to restore.');
    }
  }

  function getPriceDisplay(): string {
    if (selectedPlan.tier === 'pro') {
      return PRICING.pro[selectedPlan.period as 'monthly' | 'annual'].display;
    }
    return PRICING.mission_ready[selectedPlan.period as 'monthly' | 'annual' | 'lifetime'].display;
  }

  // If user is already subscribed, show management view
  if (currentTier !== 'free') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[typography.h3, { color: theme.text }]}>Your Subscription</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
        <View style={styles.activeSubContent}>
          <View style={[styles.activeBadge, { backgroundColor: TIER_INFO[currentTier].color + '20' }]}>
            <Ionicons name={TIER_INFO[currentTier].icon as any} size={32} color={TIER_INFO[currentTier].color} />
          </View>
          <Text style={[typography.h2, { color: theme.text, marginTop: spacing.md }]}>
            {TIER_INFO[currentTier].name}
          </Text>
          <Text style={[typography.body, { color: theme.textSecondary, marginTop: spacing.xs }]}>
            {TIER_INFO[currentTier].tagline}
          </Text>
          <Text style={[typography.caption, { color: theme.textMuted, marginTop: spacing.md }]}>
            {subscriptionService.getState().status === 'trial'
              ? `Trial ends: ${new Date(subscriptionService.getState().trialEndsAt || '').toLocaleDateString()}`
              : subscriptionService.getState().expiresAt
              ? `Renews: ${new Date(subscriptionService.getState().expiresAt || '').toLocaleDateString()}`
              : 'Lifetime access'}
          </Text>
          {currentTier === 'pro' && (
            <Button
              title="Upgrade to Mission Ready"
              onPress={() => setSelectedPlan({ tier: 'mission_ready', period: 'annual' })}
              variant="outline"
              style={{ marginTop: spacing.xl }}
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: theme.text }]}>Choose Your Plan</Text>
          <TouchableOpacity onPress={handleRestore}>
            <Text style={[typography.buttonSmall, { color: theme.primary }]}>RESTORE</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Contextual message if triggered from a feature */}
        {triggeredFeature && (
          <View style={[styles.contextBanner, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
            <Ionicons name="information-circle" size={20} color={theme.primary} />
            <Text style={[typography.bodySmall, { color: theme.primary, flex: 1 }]}>
              {subscriptionService.getUpgradeMessage(triggeredFeature).message}
            </Text>
          </View>
        )}

        {/* Tier Selection Tabs */}
        <View style={styles.tierTabs}>
          <TouchableOpacity
            style={[
              styles.tierTab,
              {
                borderColor: selectedPlan.tier === 'pro' ? TIER_INFO.pro.color : theme.border,
                backgroundColor: selectedPlan.tier === 'pro' ? TIER_INFO.pro.color + '10' : 'transparent',
              },
            ]}
            onPress={() => setSelectedPlan({ ...selectedPlan, tier: 'pro' })}
          >
            <Ionicons name={TIER_INFO.pro.icon as any} size={20} color={TIER_INFO.pro.color} />
            <Text style={[typography.bodyBold, { color: selectedPlan.tier === 'pro' ? TIER_INFO.pro.color : theme.textSecondary }]}>
              Veteran Pro
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tierTab,
              {
                borderColor: selectedPlan.tier === 'mission_ready' ? TIER_INFO.mission_ready.color : theme.border,
                backgroundColor: selectedPlan.tier === 'mission_ready' ? TIER_INFO.mission_ready.color + '10' : 'transparent',
              },
            ]}
            onPress={() => setSelectedPlan({ ...selectedPlan, tier: 'mission_ready' })}
          >
            <Ionicons name={TIER_INFO.mission_ready.icon as any} size={20} color={TIER_INFO.mission_ready.color} />
            <Text style={[typography.bodyBold, { color: selectedPlan.tier === 'mission_ready' ? TIER_INFO.mission_ready.color : theme.textSecondary }]}>
              Mission Ready
            </Text>
          </TouchableOpacity>
        </View>

        {/* Period Selection */}
        <View style={styles.periodSection}>
          {selectedPlan.tier === 'pro' ? (
            <View style={styles.periodRow}>
              <PeriodOption
                label="Monthly"
                price={PRICING.pro.monthly.display}
                savings={PRICING.pro.monthly.savings}
                selected={selectedPlan.period === 'monthly'}
                onPress={() => setSelectedPlan({ ...selectedPlan, period: 'monthly' })}
                theme={theme}
                tierColor={TIER_INFO.pro.color}
              />
              <PeriodOption
                label="Annual"
                price={PRICING.pro.annual.display}
                savings={PRICING.pro.annual.savings}
                selected={selectedPlan.period === 'annual'}
                onPress={() => setSelectedPlan({ ...selectedPlan, period: 'annual' })}
                theme={theme}
                tierColor={TIER_INFO.pro.color}
                recommended
              />
            </View>
          ) : (
            <View style={styles.periodRow}>
              <PeriodOption
                label="Monthly"
                price={PRICING.mission_ready.monthly.display}
                savings={PRICING.mission_ready.monthly.savings}
                selected={selectedPlan.period === 'monthly'}
                onPress={() => setSelectedPlan({ ...selectedPlan, period: 'monthly' })}
                theme={theme}
                tierColor={TIER_INFO.mission_ready.color}
              />
              <PeriodOption
                label="Annual"
                price={PRICING.mission_ready.annual.display}
                savings={PRICING.mission_ready.annual.savings}
                selected={selectedPlan.period === 'annual'}
                onPress={() => setSelectedPlan({ ...selectedPlan, period: 'annual' })}
                theme={theme}
                tierColor={TIER_INFO.mission_ready.color}
                recommended
              />
              <PeriodOption
                label="Lifetime"
                price={PRICING.mission_ready.lifetime.display}
                savings={PRICING.mission_ready.lifetime.savings}
                selected={selectedPlan.period === 'lifetime'}
                onPress={() => setSelectedPlan({ ...selectedPlan, period: 'lifetime' })}
                theme={theme}
                tierColor={TIER_INFO.mission_ready.color}
              />
            </View>
          )}
        </View>

        {/* Feature List */}
        <View style={styles.featureSection}>
          <Text style={[typography.label, { color: theme.primary, marginBottom: spacing.md }]}>
            {selectedPlan.tier === 'pro' ? 'VETERAN PRO INCLUDES' : 'MISSION READY INCLUDES'}
          </Text>

          {selectedPlan.tier === 'mission_ready' && (
            <View style={[styles.includesBanner, { backgroundColor: TIER_INFO.pro.color + '10', borderColor: TIER_INFO.pro.color + '30' }]}>
              <Ionicons name="checkmark-circle" size={16} color={TIER_INFO.pro.color} />
              <Text style={[typography.bodySmall, { color: TIER_INFO.pro.color }]}>
                Everything in Veteran Pro, plus:
              </Text>
            </View>
          )}

          {(selectedPlan.tier === 'pro' ? PRO_FEATURES : MISSION_READY_FEATURES).map((feature, idx) => (
            <View key={idx} style={styles.featureItem}>
              <Ionicons
                name={feature.icon as any}
                size={18}
                color={selectedPlan.tier === 'pro' ? TIER_INFO.pro.color : TIER_INFO.mission_ready.color}
              />
              <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>
                {feature.label}
              </Text>
            </View>
          ))}
        </View>

        {/* What's still free */}
        <View style={[styles.freeReminder, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[typography.label, { color: theme.textMuted, marginBottom: spacing.sm }]}>
            ALWAYS FREE — NO SUBSCRIPTION NEEDED
          </Text>
          <FreeFeatureItem text="Unlimited appointment, deployment & duty station tracking" theme={theme} />
          <FreeFeatureItem text="Service condition logging & service-connection marking" theme={theme} />
          <FreeFeatureItem text="Calendar import & basic claim summary" theme={theme} />
          <FreeFeatureItem text="Branch theming, biometric lock, & on-device storage" theme={theme} />
          <FreeFeatureItem text="5 attachments & 1 buddy letter per month" theme={theme} />
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Purchase Footer */}
      <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
        {trialAvailable && selectedPlan.tier === 'pro' && (
          <TouchableOpacity onPress={handleStartTrial} style={styles.trialButton}>
            <Text style={[typography.bodySmall, { color: theme.primary, fontWeight: '600' }]}>
              Start 7-Day Free Trial
            </Text>
          </TouchableOpacity>
        )}
        <Button
          title={`Subscribe — ${getPriceDisplay()}`}
          onPress={handlePurchase}
          variant="primary"
          size="large"
          loading={purchasing}
          style={{
            backgroundColor: selectedPlan.tier === 'pro' ? TIER_INFO.pro.color : TIER_INFO.mission_ready.color,
          }}
        />
        <Text style={[typography.caption, { color: theme.textMuted, textAlign: 'center', marginTop: spacing.sm }]}>
          Cancel anytime. {selectedPlan.period === 'lifetime' ? 'One-time payment.' : 'Auto-renews unless cancelled.'}
        </Text>
      </View>
    </View>
  );
}

// === Sub-Components ===

function PeriodOption({
  label,
  price,
  savings,
  selected,
  onPress,
  theme,
  tierColor,
  recommended,
}: {
  label: string;
  price: string;
  savings: string | null;
  selected: boolean;
  onPress: () => void;
  theme: any;
  tierColor: string;
  recommended?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.periodOption,
        {
          borderColor: selected ? tierColor : theme.border,
          backgroundColor: selected ? tierColor + '10' : theme.surface,
          flex: 1,
        },
      ]}
      onPress={onPress}
    >
      {recommended && (
        <View style={[styles.recommendedBadge, { backgroundColor: tierColor }]}>
          <Text style={styles.recommendedText}>BEST VALUE</Text>
        </View>
      )}
      <Text style={[typography.bodyBold, { color: selected ? tierColor : theme.text }]}>
        {label}
      </Text>
      <Text style={[typography.bodySmall, { color: selected ? tierColor : theme.textSecondary, marginTop: 2 }]}>
        {price}
      </Text>
      {savings && (
        <Text style={[typography.overline, { color: tierColor, marginTop: 4 }]}>
          {savings}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function FreeFeatureItem({ text, theme }: { text: string; theme: any }) {
  return (
    <View style={styles.freeFeatureItem}>
      <Ionicons name="checkmark" size={16} color={theme.success} />
      <Text style={[typography.bodySmall, { color: theme.textMuted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 180 },
  activeSubContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  activeBadge: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  tierTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  tierTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
  },
  periodSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  periodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  periodOption: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  recommendedBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 2,
    alignItems: 'center',
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  featureSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  includesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  freeReminder: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  freeFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs + 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
  trialButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
});
