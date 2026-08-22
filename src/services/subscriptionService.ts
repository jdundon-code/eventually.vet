// ============================================================================
// EVENTUALLY.VET - Subscription Service
// Manages freemium/premium tiers, entitlement checks, and feature gating
//
// Tiers:
//   FREE ("Service Member") — Full data entry, local storage, basic features
//   PRO ("Veteran Pro") — $4.99/mo or $39.99/yr — Cloud, unlimited, PDF, buddy letters
//   MISSION_READY ("Mission Ready") — $9.99/mo or $79.99/yr — AI, DBQ, family sharing
//
// Principle: Never paywall the data. Premium unlocks intelligence & automation.
// ============================================================================

import { database } from './database';
import { auditLog } from './auditLog';
import { getNowISO } from '../utils/dates';

// ============================================================================
// TYPES
// ============================================================================

export type SubscriptionTier = 'free' | 'pro' | 'mission_ready';

export type SubscriptionPeriod = 'monthly' | 'annual' | 'lifetime';

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'trial' | 'none';

export interface SubscriptionState {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  period?: SubscriptionPeriod;
  expiresAt?: string;
  startedAt?: string;
  trialEndsAt?: string;
  productId?: string; // App Store / Play Store product ID
  originalTransactionId?: string;
}

/**
 * All features that can be gated by subscription tier
 */
export type PremiumFeature =
  // PRO features
  | 'cloud_backup'
  | 'unlimited_attachments'
  | 'unlimited_buddy_letters'
  | 'pdf_export'
  | 'full_va_content'
  | 'auto_match_alerts'
  | 'full_audit_log'
  | 'priority_content_updates'
  | 'multi_device_sync'
  | 'advanced_claim_readiness'
  | 'write_reviews'
  | 'nexus_helper'
  | 'export_to_vso'
  | 'data_recovery'
  // MISSION_READY features
  | 'ai_claim_assistant'
  | 'dbq_generator'
  | 'buddy_letter_automation'
  | 'decision_letter_analyzer'
  | 'appeal_timeline_tracker'
  | 'family_sharing'
  | 'priority_support'
  | 'lifetime_access';

/**
 * Feature entitlement configuration
 * Maps each feature to the minimum tier required
 */
const FEATURE_TIERS: Record<PremiumFeature, SubscriptionTier> = {
  // PRO
  cloud_backup: 'pro',
  unlimited_attachments: 'pro',
  unlimited_buddy_letters: 'pro',
  pdf_export: 'pro',
  full_va_content: 'pro',
  auto_match_alerts: 'pro',
  full_audit_log: 'pro',
  priority_content_updates: 'pro',
  multi_device_sync: 'pro',
  advanced_claim_readiness: 'pro',
  write_reviews: 'pro',
  nexus_helper: 'pro',
  export_to_vso: 'pro',
  data_recovery: 'pro',
  // MISSION_READY
  ai_claim_assistant: 'mission_ready',
  dbq_generator: 'mission_ready',
  buddy_letter_automation: 'mission_ready',
  decision_letter_analyzer: 'mission_ready',
  appeal_timeline_tracker: 'mission_ready',
  family_sharing: 'mission_ready',
  priority_support: 'mission_ready',
  lifetime_access: 'mission_ready',
};

/**
 * Free tier usage limits
 */
export const FREE_LIMITS = {
  maxAttachments: 5,
  maxBuddyLettersPerMonth: 1,
  maxVAMatchesVisible: 3,
  maxAuditLogVisible: 50,
  maxDevices: 1,
};

/**
 * Product IDs for App Store / Play Store
 */
export const PRODUCT_IDS = {
  pro_monthly: 'com.eventuallyvet.pro.monthly',
  pro_annual: 'com.eventuallyvet.pro.annual',
  mission_ready_monthly: 'com.eventuallyvet.missionready.monthly',
  mission_ready_annual: 'com.eventuallyvet.missionready.annual',
  mission_ready_lifetime: 'com.eventuallyvet.missionready.lifetime',
};

/**
 * Pricing
 */
export const PRICING = {
  pro: {
    monthly: { price: 4.99, display: '$4.99/mo', savings: null },
    annual: { price: 39.99, display: '$39.99/yr', savings: 'Save 33%' },
  },
  mission_ready: {
    monthly: { price: 9.99, display: '$9.99/mo', savings: null },
    annual: { price: 79.99, display: '$79.99/yr', savings: 'Save 33%' },
    lifetime: { price: 199.99, display: '$199.99 one-time', savings: 'Best value' },
  },
};

/**
 * Tier metadata for display
 */
export const TIER_INFO = {
  free: {
    name: 'Service Member',
    tagline: 'Document your service',
    icon: 'shield-outline',
    color: '#6B7B8F',
  },
  pro: {
    name: 'Veteran Pro',
    tagline: 'Protect & prepare your claim',
    icon: 'star',
    color: '#FFC107',
  },
  mission_ready: {
    name: 'Mission Ready',
    tagline: 'Maximum claim support',
    icon: 'ribbon',
    color: '#FF6600',
  },
};

// ============================================================================
// SERVICE
// ============================================================================

class SubscriptionService {
  private state: SubscriptionState = {
    tier: 'free',
    status: 'none',
  };
  private listeners: ((state: SubscriptionState) => void)[] = [];
  private loaded: boolean = false;

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  async initialize(): Promise<void> {
    await this.loadState();
    // Check if subscription has expired
    this.checkExpiration();
  }

  // =========================================================================
  // ENTITLEMENT CHECKS
  // =========================================================================

  /**
   * Check if user has access to a specific feature
   * This is the primary method used throughout the app
   */
  hasFeature(feature: PremiumFeature): boolean {
    const requiredTier = FEATURE_TIERS[feature];
    return this.isTierAtLeast(requiredTier);
  }

  /**
   * Check if current tier meets or exceeds the required tier
   */
  isTierAtLeast(requiredTier: SubscriptionTier): boolean {
    if (this.state.status !== 'active' && this.state.status !== 'trial') {
      return requiredTier === 'free';
    }

    const tierLevel: Record<SubscriptionTier, number> = {
      free: 0,
      pro: 1,
      mission_ready: 2,
    };

    return tierLevel[this.state.tier] >= tierLevel[requiredTier];
  }

  /**
   * Check if user is on the free tier
   */
  isFree(): boolean {
    return this.state.tier === 'free' || this.state.status === 'none' || this.state.status === 'expired';
  }

  /**
   * Check if user is on Pro tier
   */
  isPro(): boolean {
    return this.isTierAtLeast('pro');
  }

  /**
   * Check if user is on Mission Ready tier
   */
  isMissionReady(): boolean {
    return this.isTierAtLeast('mission_ready');
  }

  /**
   * Get the required tier for a feature
   */
  getRequiredTier(feature: PremiumFeature): SubscriptionTier {
    return FEATURE_TIERS[feature];
  }

  /**
   * Get the current subscription state
   */
  getState(): SubscriptionState {
    return { ...this.state };
  }

  /**
   * Get the current tier
   */
  getTier(): SubscriptionTier {
    if (this.state.status !== 'active' && this.state.status !== 'trial') {
      return 'free';
    }
    return this.state.tier;
  }

  // =========================================================================
  // FREE TIER LIMIT CHECKS
  // =========================================================================

  /**
   * Check if user has reached attachment limit (free tier only)
   */
  async hasReachedAttachmentLimit(): Promise<boolean> {
    if (this.isPro()) return false; // Pro = unlimited

    // Count current attachments
    const count = await this.getAttachmentCount();
    return count >= FREE_LIMITS.maxAttachments;
  }

  /**
   * Check if user has reached buddy letter limit this month
   */
  async hasReachedBuddyLetterLimit(): Promise<boolean> {
    if (this.isPro()) return false;

    const count = await this.getBuddyLetterCountThisMonth();
    return count >= FREE_LIMITS.maxBuddyLettersPerMonth;
  }

  /**
   * Get the number of remaining free attachments
   */
  async getRemainingAttachments(): Promise<number> {
    if (this.isPro()) return Infinity;
    const count = await this.getAttachmentCount();
    return Math.max(0, FREE_LIMITS.maxAttachments - count);
  }

  /**
   * Get remaining buddy letters this month
   */
  async getRemainingBuddyLetters(): Promise<number> {
    if (this.isPro()) return Infinity;
    const count = await this.getBuddyLetterCountThisMonth();
    return Math.max(0, FREE_LIMITS.maxBuddyLettersPerMonth - count);
  }

  private async getAttachmentCount(): Promise<number> {
    const countStr = await database.getSetting('total_attachment_count');
    return countStr ? parseInt(countStr) : 0;
  }

  private async getBuddyLetterCountThisMonth(): Promise<number> {
    const data = await database.getSetting('buddy_letters_this_month');
    if (!data) return 0;
    try {
      const { count, month } = JSON.parse(data);
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      if (month === currentMonth) return count;
      return 0; // New month, reset
    } catch {
      return 0;
    }
  }

  /**
   * Increment buddy letter count for this month
   */
  async incrementBuddyLetterCount(): Promise<void> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const current = await this.getBuddyLetterCountThisMonth();
    await database.setSetting('buddy_letters_this_month', JSON.stringify({
      count: current + 1,
      month: currentMonth,
    }));
  }

  /**
   * Increment attachment count
   */
  async incrementAttachmentCount(): Promise<void> {
    const current = await this.getAttachmentCount();
    await database.setSetting('total_attachment_count', String(current + 1));
  }

  // =========================================================================
  // SUBSCRIPTION MANAGEMENT
  // =========================================================================

  /**
   * Activate a subscription (called after successful purchase)
   * In production, this is validated server-side via receipt verification
   */
  async activateSubscription(
    tier: SubscriptionTier,
    period: SubscriptionPeriod,
    productId: string,
    transactionId?: string
  ): Promise<void> {
    const now = getNowISO();
    let expiresAt: string | undefined;

    if (period === 'monthly') {
      const date = new Date();
      date.setMonth(date.getMonth() + 1);
      expiresAt = date.toISOString();
    } else if (period === 'annual') {
      const date = new Date();
      date.setFullYear(date.getFullYear() + 1);
      expiresAt = date.toISOString();
    }
    // Lifetime = no expiration

    this.state = {
      tier,
      status: 'active',
      period,
      expiresAt,
      startedAt: now,
      productId,
      originalTransactionId: transactionId,
    };

    await this.saveState();
    this.notifyListeners();

    await auditLog.log('security_setting_changed', 'settings', 'subscription', {
      action: 'activated',
      tier,
      period,
      productId,
    });
  }

  /**
   * Start a free trial (7 days of Pro)
   */
  async startTrial(): Promise<void> {
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 7);

    this.state = {
      tier: 'pro',
      status: 'trial',
      startedAt: now.toISOString(),
      trialEndsAt: trialEnd.toISOString(),
      expiresAt: trialEnd.toISOString(),
    };

    await this.saveState();
    this.notifyListeners();

    await auditLog.log('security_setting_changed', 'settings', 'subscription', {
      action: 'trial_started',
      trialEnds: trialEnd.toISOString(),
    });
  }

  /**
   * Check if user has already used their free trial
   */
  async hasUsedTrial(): Promise<boolean> {
    const used = await database.getSetting('trial_used');
    return used === 'true';
  }

  /**
   * Cancel subscription (takes effect at end of period)
   */
  async cancelSubscription(): Promise<void> {
    this.state.status = 'cancelled';
    // Still active until expiresAt
    await this.saveState();
    this.notifyListeners();

    await auditLog.log('security_setting_changed', 'settings', 'subscription', {
      action: 'cancelled',
      expiresAt: this.state.expiresAt || 'unknown',
    });
  }

  /**
   * Restore purchases (from App Store / Play Store)
   * In production, validates receipts server-side
   */
  async restorePurchases(): Promise<{ restored: boolean; tier: SubscriptionTier | null }> {
    // In production, this calls RevenueCat or validates receipts
    // For now, check local state
    const saved = await database.getSetting('subscription_state');
    if (saved) {
      const parsed = JSON.parse(saved) as SubscriptionState;
      if (parsed.status === 'active' || parsed.originalTransactionId) {
        this.state = parsed;
        this.checkExpiration();
        this.notifyListeners();
        return { restored: true, tier: this.state.tier };
      }
    }
    return { restored: false, tier: null };
  }

  // =========================================================================
  // EXPIRATION
  // =========================================================================

  private checkExpiration(): void {
    if (!this.state.expiresAt) return;
    if (this.state.status === 'none') return;

    const now = new Date();
    const expires = new Date(this.state.expiresAt);

    if (now >= expires) {
      if (this.state.status === 'trial') {
        this.state.status = 'expired';
        this.state.tier = 'free';
        database.setSetting('trial_used', 'true');
      } else if (this.state.status === 'active' || this.state.status === 'cancelled') {
        this.state.status = 'expired';
        this.state.tier = 'free';
      }
      this.saveState();
      this.notifyListeners();
    }
  }

  // =========================================================================
  // CONVERSION TRIGGERS
  // =========================================================================

  /**
   * Get contextual upgrade message for a feature
   */
  getUpgradeMessage(feature: PremiumFeature): { title: string; message: string; cta: string } {
    const messages: Record<string, { title: string; message: string; cta: string }> = {
      cloud_backup: {
        title: 'Protect Your Records',
        message: 'Cloud backup keeps your data safe if you lose your device. Encrypted end-to-end — only you can read it.',
        cta: 'Enable Cloud Backup',
      },
      unlimited_attachments: {
        title: 'Attachment Limit Reached',
        message: `You've used all ${FREE_LIMITS.maxAttachments} free attachments. Upgrade to store unlimited medical records, photos, and documents.`,
        cta: 'Upgrade for Unlimited',
      },
      unlimited_buddy_letters: {
        title: 'Monthly Limit Reached',
        message: 'Free accounts can send 1 buddy letter per month. Upgrade to send unlimited requests and strengthen your claim.',
        cta: 'Upgrade for Unlimited',
      },
      pdf_export: {
        title: 'Professional PDF Export',
        message: 'Generate a VA-ready PDF claim summary with professional formatting. Share directly with your VSO or attorney.',
        cta: 'Unlock PDF Export',
      },
      full_va_content: {
        title: 'Full VA Regulation Access',
        message: 'See all matching presumptive conditions, detailed rating criteria, and specific filing guidance for your exposures.',
        cta: 'See All Matches',
      },
      ai_claim_assistant: {
        title: 'AI Claim Analysis',
        message: 'Our AI analyzes your records to identify conditions you may be missing, documentation gaps, and strengthening opportunities.',
        cta: 'Get AI Assistance',
      },
      dbq_generator: {
        title: 'DBQ Templates',
        message: 'Generate pre-filled Disability Benefits Questionnaires based on your data. Bring to your C&P exam prepared.',
        cta: 'Generate DBQs',
      },
      family_sharing: {
        title: 'Share With Your Team',
        message: 'Give read-only access to your spouse, VSO, or attorney so they can help prepare your claim.',
        cta: 'Enable Sharing',
      },
      nexus_helper: {
        title: 'Nexus Connection Guide',
        message: 'Guided prompts help you document the connection between your service and your conditions — the key to a successful claim.',
        cta: 'Get Nexus Help',
      },
      data_recovery: {
        title: 'Recover Your Data',
        message: 'Your records are backed up in the cloud. Upgrade to restore them to this device.',
        cta: 'Restore My Records',
      },
    };

    return messages[feature] || {
      title: 'Premium Feature',
      message: 'This feature requires a Veteran Pro or Mission Ready subscription.',
      cta: 'View Plans',
    };
  }

  // =========================================================================
  // LISTENERS
  // =========================================================================

  subscribe(listener: (state: SubscriptionState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l(this.state));
  }

  // =========================================================================
  // PERSISTENCE
  // =========================================================================

  private async loadState(): Promise<void> {
    if (this.loaded) return;
    try {
      const data = await database.getSetting('subscription_state');
      if (data) {
        this.state = JSON.parse(data);
      }
    } catch (e) {
      this.state = { tier: 'free', status: 'none' };
    }
    this.loaded = true;
  }

  private async saveState(): Promise<void> {
    await database.setSetting('subscription_state', JSON.stringify(this.state));
  }
}

export const subscriptionService = new SubscriptionService();
