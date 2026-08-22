// ============================================================================
// EVENTUALLY.VET - UpgradePrompt Component
// Renders a conversion trigger as a dismissible card/modal.
// Used by screens that call conversionTriggers.evaluate() and get a result.
//
// Usage:
//   const trigger = await conversionTriggers.evaluate(context);
//   if (trigger) setActiveTrigger(trigger);
//   ...
//   {activeTrigger && <UpgradePrompt trigger={activeTrigger} ... />}
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';
import { Button } from './Button';
import {
  ConversionTrigger,
  conversionTriggers,
} from '../../services/conversionTriggers';
import { TIER_INFO, subscriptionService } from '../../services/subscriptionService';

type PromptStyle = 'card' | 'modal' | 'banner';

interface UpgradePromptProps {
  trigger: ConversionTrigger;
  navigation: any;
  style?: PromptStyle;
  onDismiss: () => void;
}

export function UpgradePrompt({
  trigger,
  navigation,
  style = 'card',
  onDismiss,
}: UpgradePromptProps) {
  const { theme } = useTheme();
  const requiredTier = subscriptionService.getRequiredTier(trigger.feature);
  const tierInfo = TIER_INFO[requiredTier];

  async function handleCta() {
    await conversionTriggers.markConverted(trigger.id);
    onDismiss();
    navigation.navigate('Paywall', { feature: trigger.feature, source: trigger.id });
  }

  async function handleDismiss() {
    await conversionTriggers.markDismissed(trigger.id);
    onDismiss();
  }

  // Mark as shown
  React.useEffect(() => {
    conversionTriggers.markShown(trigger.id);
  }, [trigger.id]);

  // === BANNER STYLE (minimal, top of screen) ===
  if (style === 'banner') {
    return (
      <TouchableOpacity
        style={[styles.banner, { backgroundColor: tierInfo.color + '15', borderColor: tierInfo.color + '30' }]}
        onPress={handleCta}
        activeOpacity={0.8}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${trigger.title}. ${trigger.message}. Tap to learn more.`}
      >
        <Ionicons name={tierInfo.icon as any} size={18} color={tierInfo.color} />
        <Text style={[typography.bodySmall, { color: tierInfo.color, flex: 1, fontWeight: '600' }]} numberOfLines={1}>
          {trigger.title}
        </Text>
        <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={18} color={tierInfo.color} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  // === MODAL STYLE (overlay, for high-priority triggers) ===
  if (style === 'modal') {
    return (
      <Modal transparent animationType="fade" visible={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { backgroundColor: tierInfo.color + '15' }]}>
              <View style={[styles.modalIconCircle, { backgroundColor: tierInfo.color + '30' }]}>
                <Ionicons name={tierInfo.icon as any} size={32} color={tierInfo.color} />
              </View>
              <Text style={[typography.h3, { color: theme.text, textAlign: 'center', marginTop: spacing.md }]}>
                {trigger.title}
              </Text>
            </View>

            {/* Body */}
            <View style={styles.modalBody}>
              <Text style={[typography.body, { color: theme.textSecondary, textAlign: 'center', lineHeight: 24 }]}>
                {trigger.message}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <Button
                title={trigger.cta}
                onPress={handleCta}
                variant="primary"
                size="large"
                style={{ backgroundColor: tierInfo.color }}
              />
              <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
                <Text style={[typography.bodySmall, { color: theme.textMuted }]}>
                  {trigger.dismissLabel}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // === CARD STYLE (default — inline in scroll content) ===
  return (
    <View
      style={[styles.card, { backgroundColor: theme.surface, borderColor: tierInfo.color + '40' }]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={`${trigger.title}. ${trigger.message}`}
    >
      {/* Dismiss X */}
      <TouchableOpacity
        style={styles.cardDismiss}
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <Ionicons name="close" size={18} color={theme.textMuted} />
      </TouchableOpacity>

      {/* Icon + Tier */}
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: tierInfo.color + '20' }]}>
          <Ionicons name={tierInfo.icon as any} size={22} color={tierInfo.color} />
        </View>
        <View style={[styles.tierLabel, { backgroundColor: tierInfo.color }]}>
          <Text style={styles.tierLabelText}>
            {requiredTier === 'pro' ? 'VETERAN PRO' : 'MISSION READY'}
          </Text>
        </View>
      </View>

      {/* Content */}
      <Text style={[typography.bodyBold, { color: theme.text, marginTop: spacing.md }]}>
        {trigger.title}
      </Text>
      <Text style={[typography.bodySmall, { color: theme.textSecondary, marginTop: spacing.xs, lineHeight: 20 }]}>
        {trigger.message}
      </Text>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.cardCta, { backgroundColor: tierInfo.color }]}
        onPress={handleCta}
        activeOpacity={0.8}
      >
        <Text style={styles.cardCtaText}>{trigger.cta}</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Dismiss link */}
      <TouchableOpacity onPress={handleDismiss} style={styles.cardDismissLink}>
        <Text style={[typography.caption, { color: theme.textMuted }]}>
          {trigger.dismissLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  modalActions: {
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  dismissButton: {
    paddingVertical: spacing.sm,
  },

  // Card
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    position: 'relative',
  },
  cardDismiss: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierLabel: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  tierLabelText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md - 2,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  cardCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardDismissLink: {
    alignItems: 'center',
    paddingTop: spacing.md,
  },
});
