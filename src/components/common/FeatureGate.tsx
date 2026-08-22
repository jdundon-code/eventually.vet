// ============================================================================
// EVENTUALLY.VET - FeatureGate Component
// Wraps premium features with an entitlement check. If the user doesn't
// have access, shows a contextual upgrade prompt inline instead of the
// feature content. Non-aggressive — informative and respectful.
//
// Usage:
//   <FeatureGate feature="pdf_export" navigation={navigation}>
//     <PdfExportButton />
//   </FeatureGate>
//
//   <FeatureGate feature="cloud_backup" navigation={navigation} mode="lock">
//     <CloudBackupSection />
//   </FeatureGate>
//
//   <FeatureGate feature="unlimited_attachments" navigation={navigation} mode="hide">
//     <AddAttachmentButton />
//   </FeatureGate>
// ============================================================================

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';
import {
  subscriptionService,
  PremiumFeature,
  TIER_INFO,
} from '../../services/subscriptionService';

type GateMode =
  | 'inline'   // Show upgrade prompt in place of the feature (default)
  | 'lock'     // Show content but with a lock overlay and tap-to-upgrade
  | 'hide'     // Completely hide the content if not entitled
  | 'badge'    // Show content normally but with a "PRO" badge (teaser)
  | 'limit';   // Show content but check limits (attachments, buddy letters)

interface FeatureGateProps {
  feature: PremiumFeature;
  navigation: any;
  children: ReactNode;
  mode?: GateMode;
  /** Custom message overriding the default */
  message?: string;
  /** Shown when mode='limit' and limit is not yet reached (renders children normally) */
  limitReached?: boolean;
  /** Source identifier for analytics/tracking */
  source?: string;
}

export function FeatureGate({
  feature,
  navigation,
  children,
  mode = 'inline',
  message,
  limitReached = false,
  source,
}: FeatureGateProps) {
  const { theme } = useTheme();
  const hasAccess = subscriptionService.hasFeature(feature);
  const requiredTier = subscriptionService.getRequiredTier(feature);
  const tierInfo = TIER_INFO[requiredTier];
  const upgradeInfo = subscriptionService.getUpgradeMessage(feature);

  // If user has access, render children normally
  if (hasAccess) {
    // For 'limit' mode, also check if limit is reached
    if (mode === 'limit' && limitReached) {
      // Even paid users pass through; this shouldn't happen for paid
      return <>{children}</>;
    }
    return <>{children}</>;
  }

  // For 'limit' mode on free tier: if limit not reached, show content
  if (mode === 'limit' && !limitReached) {
    return <>{children}</>;
  }

  function navigateToPaywall() {
    navigation.navigate('Paywall', { feature, source: source || feature });
  }

  // === MODE: hide ===
  if (mode === 'hide') {
    return null;
  }

  // === MODE: badge ===
  if (mode === 'badge') {
    return (
      <View style={styles.badgeContainer}>
        {children}
        <TouchableOpacity
          style={[styles.proBadge, { backgroundColor: tierInfo.color }]}
          onPress={navigateToPaywall}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${tierInfo.name} feature. Tap to upgrade.`}
        >
          <Ionicons name={tierInfo.icon as any} size={10} color="#FFFFFF" />
          <Text style={styles.proBadgeText}>
            {requiredTier === 'pro' ? 'PRO' : 'PRO+'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // === MODE: lock ===
  if (mode === 'lock') {
    return (
      <TouchableOpacity
        style={styles.lockContainer}
        onPress={navigateToPaywall}
        activeOpacity={0.8}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${upgradeInfo.title}. Requires ${tierInfo.name} subscription. Tap to upgrade.`}
      >
        <View style={styles.lockOverlay}>
          {children}
        </View>
        <View style={[styles.lockBanner, { backgroundColor: tierInfo.color + 'E6' }]}>
          <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
          <Text style={styles.lockText}>{tierInfo.name}</Text>
          <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    );
  }

  // === MODE: inline (default) + limit ===
  return (
    <TouchableOpacity
      style={[styles.inlineGate, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={navigateToPaywall}
      activeOpacity={0.7}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${upgradeInfo.title}. ${message || upgradeInfo.message}. Tap to view plans.`}
    >
      <View style={[styles.inlineIconContainer, { backgroundColor: tierInfo.color + '20' }]}>
        <Ionicons name={tierInfo.icon as any} size={24} color={tierInfo.color} />
      </View>
      <View style={styles.inlineContent}>
        <Text style={[typography.bodyBold, { color: theme.text }]} numberOfLines={1}>
          {message || upgradeInfo.title}
        </Text>
        <Text style={[typography.caption, { color: theme.textMuted }]} numberOfLines={2}>
          {upgradeInfo.message}
        </Text>
      </View>
      <View style={[styles.inlineCta, { backgroundColor: tierInfo.color }]}>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// FeatureGateButton - A simpler variant that wraps a single button
// Shows the button but navigates to paywall instead of the action
// ============================================================================

interface FeatureGateButtonProps {
  feature: PremiumFeature;
  navigation: any;
  title: string;
  icon?: string;
  onPress: () => void; // Called if user HAS access
  variant?: 'primary' | 'outline';
  source?: string;
  /** For limit-based features */
  limitReached?: boolean;
}

export function FeatureGateButton({
  feature,
  navigation,
  title,
  icon,
  onPress,
  variant = 'primary',
  source,
  limitReached = false,
}: FeatureGateButtonProps) {
  const { theme } = useTheme();
  const hasAccess = subscriptionService.hasFeature(feature);
  const requiredTier = subscriptionService.getRequiredTier(feature);
  const tierInfo = TIER_INFO[requiredTier];

  // If user has access (or limit not reached for limit-mode), execute normally
  if (hasAccess || !limitReached) {
    // Only execute if they actually have the feature
    if (hasAccess) {
      return (
        <TouchableOpacity
          style={[
            styles.gateButton,
            {
              backgroundColor: variant === 'primary' ? theme.primary : 'transparent',
              borderColor: theme.primary,
              borderWidth: variant === 'outline' ? 2 : 0,
            },
          ]}
          onPress={onPress}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={title}
        >
          {icon && <Ionicons name={icon as any} size={18} color={variant === 'primary' ? '#FFFFFF' : theme.primary} />}
          <Text
            style={[
              typography.button,
              { color: variant === 'primary' ? '#FFFFFF' : theme.primary },
            ]}
          >
            {title}
          </Text>
        </TouchableOpacity>
      );
    }
  }

  // Not entitled — show locked button that navigates to paywall
  return (
    <TouchableOpacity
      style={[styles.gateButton, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1.5 }]}
      onPress={() => navigation.navigate('Paywall', { feature, source: source || feature })}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${title}. Requires ${tierInfo.name}. Tap to upgrade.`}
    >
      <Ionicons name="lock-closed" size={16} color={tierInfo.color} />
      {icon && <Ionicons name={icon as any} size={18} color={theme.textMuted} />}
      <Text style={[typography.button, { color: theme.textMuted }]}>{title}</Text>
      <View style={[styles.buttonBadge, { backgroundColor: tierInfo.color }]}>
        <Text style={styles.buttonBadgeText}>{requiredTier === 'pro' ? 'PRO' : 'PRO+'}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// ProBadge - Small badge to indicate a premium feature in lists/cards
// ============================================================================

export function ProBadge({ feature }: { feature: PremiumFeature }) {
  const requiredTier = subscriptionService.getRequiredTier(feature);
  const tierInfo = TIER_INFO[requiredTier];
  const hasAccess = subscriptionService.hasFeature(feature);

  if (hasAccess) return null;

  return (
    <View style={[styles.standaloneProBadge, { backgroundColor: tierInfo.color }]}>
      <Ionicons name={tierInfo.icon as any} size={8} color="#FFFFFF" />
      <Text style={styles.standaloneProText}>
        {requiredTier === 'pro' ? 'PRO' : 'PRO+'}
      </Text>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Inline mode
  inlineGate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
  },
  inlineIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineContent: {
    flex: 1,
    gap: 2,
  },
  inlineCta: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Lock mode
  lockContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
  },
  lockOverlay: {
    opacity: 0.4,
  },
  lockBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  lockText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Badge mode
  badgeContainer: {
    position: 'relative',
  },
  proBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    zIndex: 10,
  },
  proBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Button variant
  gateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    width: '100%',
    position: 'relative',
  },
  buttonBadge: {
    position: 'absolute',
    top: -6,
    right: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  buttonBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Standalone badge
  standaloneProBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  standaloneProText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
