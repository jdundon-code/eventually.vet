// ============================================================================
// EVENTUALLY.VET - Conversion Trigger System
// Contextual, non-aggressive upgrade prompts at natural moments in the user
// journey. Never interrupts workflow — only surfaces when relevant.
//
// Triggers fire at moments when premium value is most apparent:
// - Hitting a free tier limit
// - Attempting a premium action
// - Reaching a milestone (many records documented)
// - Life events (approaching ETS, after deployment return)
// - Time-based (used free tier for 30+ days)
//
// Principles:
// - Never show more than 1 prompt per session
// - Never show the same trigger twice in 7 days
// - Never block the user from their data
// - Always show value before asking for money
// ============================================================================

import { database } from './database';
import { subscriptionService, PremiumFeature, FREE_LIMITS } from './subscriptionService';
import { getNowISO } from '../utils/dates';

// ============================================================================
// TYPES
// ============================================================================

export type TriggerType =
  | 'limit_reached'      // Hit a free tier ceiling
  | 'feature_attempt'    // Tried to use a premium feature
  | 'milestone'          // Documented significant amount of data
  | 'life_event'         // Approaching separation, post-deployment
  | 'time_based'         // Used app for X days on free tier
  | 'value_moment';      // Just completed something where premium would help next

export interface ConversionTrigger {
  id: string;
  type: TriggerType;
  feature: PremiumFeature;
  title: string;
  message: string;
  cta: string;
  dismissLabel: string;
  priority: number; // 1-10, higher = more important
  conditions: TriggerCondition[];
  cooldownDays: number; // Don't show again for this many days
}

export interface TriggerCondition {
  type: 'min_records' | 'min_days' | 'limit_reached' | 'feature_used' | 'never_shown';
  field?: string;
  value?: number;
}

export interface TriggerEvent {
  triggerId: string;
  shownAt: string;
  dismissed: boolean;
  converted: boolean;
}

// ============================================================================
// TRIGGER DEFINITIONS
// ============================================================================

const TRIGGERS: ConversionTrigger[] = [
  // === LIMIT REACHED ===
  {
    id: 'attachment_limit',
    type: 'limit_reached',
    feature: 'unlimited_attachments',
    title: 'Attachment Limit Reached',
    message: `You've stored ${FREE_LIMITS.maxAttachments} documents — that's great record-keeping. Upgrade to attach unlimited medical records, lab results, and photos.`,
    cta: 'Unlock Unlimited Storage',
    dismissLabel: 'Not now',
    priority: 8,
    conditions: [{ type: 'limit_reached', field: 'attachments' }],
    cooldownDays: 14,
  },
  {
    id: 'buddy_letter_limit',
    type: 'limit_reached',
    feature: 'unlimited_buddy_letters',
    title: 'Monthly Buddy Letter Limit',
    message: 'You've sent your free buddy letter this month. VA claims with multiple buddy statements are significantly stronger.',
    cta: 'Upgrade for Unlimited Letters',
    dismissLabel: 'I\'ll wait until next month',
    priority: 7,
    conditions: [{ type: 'limit_reached', field: 'buddy_letters' }],
    cooldownDays: 7, // Monthly limit so shorter cooldown
  },

  // === MILESTONE TRIGGERS ===
  {
    id: 'milestone_10_appointments',
    type: 'milestone',
    feature: 'cloud_backup',
    title: 'Your Records Are Growing',
    message: '10+ appointments documented — that\'s serious claim preparation. Protect these records with encrypted cloud backup so you never lose them.',
    cta: 'Enable Cloud Backup',
    dismissLabel: 'I\'ll back up later',
    priority: 6,
    conditions: [{ type: 'min_records', field: 'appointments', value: 10 }],
    cooldownDays: 30,
  },
  {
    id: 'milestone_3_conditions',
    type: 'milestone',
    feature: 'advanced_claim_readiness',
    title: 'Building a Strong Claim',
    message: 'You\'re tracking 3+ conditions. Advanced claim scoring shows exactly what evidence each condition still needs.',
    cta: 'See Detailed Scoring',
    dismissLabel: 'Maybe later',
    priority: 5,
    conditions: [{ type: 'min_records', field: 'conditions', value: 3 }],
    cooldownDays: 30,
  },
  {
    id: 'milestone_first_deployment',
    type: 'milestone',
    feature: 'full_va_content',
    title: 'Deployment Logged — Check Your Presumptives',
    message: 'Based on your deployment hazards, you may qualify for presumptive conditions. Pro shows all matches with filing guidance.',
    cta: 'See All Matches',
    dismissLabel: 'View free matches',
    priority: 7,
    conditions: [{ type: 'min_records', field: 'deployments', value: 1 }],
    cooldownDays: 60,
  },

  // === VALUE MOMENTS ===
  {
    id: 'after_claim_export_text',
    type: 'value_moment',
    feature: 'pdf_export',
    title: 'Upgrade Your Export',
    message: 'Your text summary is ready. A professional PDF formatted for VA submission makes a stronger impression with your VSO or attorney.',
    cta: 'Generate Professional PDF',
    dismissLabel: 'Text is fine',
    priority: 6,
    conditions: [{ type: 'feature_used', field: 'text_export' }],
    cooldownDays: 14,
  },
  {
    id: 'after_buddy_letter_sent',
    type: 'value_moment',
    feature: 'buddy_letter_automation',
    title: 'Automate Follow-Ups',
    message: 'Buddy letter sent! Mission Ready automatically follows up with reminders so you don\'t have to chase people down.',
    cta: 'Enable Auto Follow-Up',
    dismissLabel: 'I\'ll follow up manually',
    priority: 4,
    conditions: [{ type: 'feature_used', field: 'buddy_letter_sent' }],
    cooldownDays: 30,
  },

  // === TIME-BASED ===
  {
    id: 'day_30_free',
    type: 'time_based',
    feature: 'cloud_backup',
    title: '30 Days of Documentation',
    message: 'You\'ve been building your claim evidence for a month. Don\'t risk losing it — cloud backup protects everything with encryption only you can unlock.',
    cta: 'Protect My Records',
    dismissLabel: 'Remind me later',
    priority: 5,
    conditions: [{ type: 'min_days', value: 30 }],
    cooldownDays: 60,
  },
  {
    id: 'day_90_free',
    type: 'time_based',
    feature: 'pdf_export',
    title: '90 Days — Ready to File?',
    message: 'You have 3 months of documented evidence. Generate a professional claim package to take to your VSO.',
    cta: 'Generate Claim Package',
    dismissLabel: 'Not filing yet',
    priority: 6,
    conditions: [{ type: 'min_days', value: 90 }],
    cooldownDays: 90,
  },

  // === LIFE EVENTS ===
  {
    id: 'separation_prep',
    type: 'life_event',
    feature: 'nexus_helper',
    title: 'Preparing for Separation?',
    message: 'The nexus connection guide helps you document exactly how each condition connects to your service — the #1 factor in claim approval.',
    cta: 'Get Nexus Guidance',
    dismissLabel: 'Not separating yet',
    priority: 9,
    conditions: [{ type: 'feature_used', field: 'status_separated' }],
    cooldownDays: 30,
  },
];

// ============================================================================
// SERVICE
// ============================================================================

class ConversionTriggerService {
  private shownThisSession: boolean = false;
  private triggerHistory: TriggerEvent[] = [];
  private loaded: boolean = false;

  // =========================================================================
  // EVALUATION
  // =========================================================================

  /**
   * Evaluate all triggers and return the highest-priority one that should fire.
   * Called at natural pause points (screen load, after completing an action).
   * Returns null if no trigger should fire.
   */
  async evaluate(context: {
    appointmentCount?: number;
    deploymentCount?: number;
    conditionCount?: number;
    attachmentCount?: number;
    buddyLettersSentThisMonth?: number;
    daysOnFreeT?: number;
    justExportedText?: boolean;
    justSentBuddyLetter?: boolean;
    serviceStatus?: string;
  }): Promise<ConversionTrigger | null> {
    // Never show if already subscribed
    if (!subscriptionService.isFree()) return null;

    // Max 1 prompt per session
    if (this.shownThisSession) return null;

    await this.ensureLoaded();

    // Filter triggers by conditions and cooldown
    const eligible: ConversionTrigger[] = [];

    for (const trigger of TRIGGERS) {
      // Check cooldown
      if (this.isInCooldown(trigger.id, trigger.cooldownDays)) continue;

      // Check conditions
      let conditionsMet = true;
      for (const condition of trigger.conditions) {
        switch (condition.type) {
          case 'min_records':
            const count = this.getRecordCount(condition.field!, context);
            if (count < (condition.value || 0)) conditionsMet = false;
            break;
          case 'min_days':
            if ((context.daysOnFreeT || 0) < (condition.value || 0)) conditionsMet = false;
            break;
          case 'limit_reached':
            if (condition.field === 'attachments') {
              if ((context.attachmentCount || 0) < FREE_LIMITS.maxAttachments) conditionsMet = false;
            } else if (condition.field === 'buddy_letters') {
              if ((context.buddyLettersSentThisMonth || 0) < FREE_LIMITS.maxBuddyLettersPerMonth) conditionsMet = false;
            }
            break;
          case 'feature_used':
            if (condition.field === 'text_export' && !context.justExportedText) conditionsMet = false;
            if (condition.field === 'buddy_letter_sent' && !context.justSentBuddyLetter) conditionsMet = false;
            if (condition.field === 'status_separated' && context.serviceStatus !== 'separated' && context.serviceStatus !== 'retired') conditionsMet = false;
            break;
          case 'never_shown':
            if (this.hasBeenShown(trigger.id)) conditionsMet = false;
            break;
        }
        if (!conditionsMet) break;
      }

      if (conditionsMet) {
        eligible.push(trigger);
      }
    }

    if (eligible.length === 0) return null;

    // Return highest priority
    eligible.sort((a, b) => b.priority - a.priority);
    return eligible[0];
  }

  /**
   * Call when a trigger is shown to the user
   */
  async markShown(triggerId: string): Promise<void> {
    this.shownThisSession = true;
    await this.ensureLoaded();

    const event: TriggerEvent = {
      triggerId,
      shownAt: getNowISO(),
      dismissed: false,
      converted: false,
    };

    this.triggerHistory.push(event);
    await this.save();
  }

  /**
   * Call when user dismisses a trigger
   */
  async markDismissed(triggerId: string): Promise<void> {
    await this.ensureLoaded();
    const event = this.triggerHistory.find(
      (e) => e.triggerId === triggerId && !e.dismissed && !e.converted
    );
    if (event) {
      event.dismissed = true;
      await this.save();
    }
  }

  /**
   * Call when user converts (taps CTA and navigates to paywall)
   */
  async markConverted(triggerId: string): Promise<void> {
    await this.ensureLoaded();
    const event = this.triggerHistory.find(
      (e) => e.triggerId === triggerId && !e.converted
    );
    if (event) {
      event.converted = true;
      await this.save();
    }
  }

  /**
   * Reset session flag (call at app launch)
   */
  resetSession(): void {
    this.shownThisSession = false;
  }

  // =========================================================================
  // DIRECT TRIGGER (for specific moments)
  // =========================================================================

  /**
   * Get trigger for a specific feature attempt (called when user hits a gate)
   * This bypasses the evaluation system — always returns the relevant trigger
   */
  getTriggerForFeature(feature: PremiumFeature): ConversionTrigger | null {
    return TRIGGERS.find((t) => t.feature === feature) || null;
  }

  /**
   * Check if a specific limit trigger should fire
   */
  async shouldShowAttachmentLimit(): Promise<boolean> {
    if (!subscriptionService.isFree()) return false;
    const reached = await subscriptionService.hasReachedAttachmentLimit();
    if (!reached) return false;
    return !this.isInCooldown('attachment_limit', 14);
  }

  /**
   * Check if buddy letter limit trigger should fire
   */
  async shouldShowBuddyLetterLimit(): Promise<boolean> {
    if (!subscriptionService.isFree()) return false;
    const reached = await subscriptionService.hasReachedBuddyLetterLimit();
    if (!reached) return false;
    return !this.isInCooldown('buddy_letter_limit', 7);
  }

  // =========================================================================
  // ANALYTICS (for understanding conversion)
  // =========================================================================

  /**
   * Get conversion stats
   */
  async getStats(): Promise<{
    totalShown: number;
    totalDismissed: number;
    totalConverted: number;
    conversionRate: number;
    topConvertingTrigger: string | null;
  }> {
    await this.ensureLoaded();

    const totalShown = this.triggerHistory.length;
    const totalDismissed = this.triggerHistory.filter((e) => e.dismissed).length;
    const totalConverted = this.triggerHistory.filter((e) => e.converted).length;
    const conversionRate = totalShown > 0 ? totalConverted / totalShown : 0;

    // Find most converting trigger
    const conversionsByTrigger: Record<string, number> = {};
    this.triggerHistory
      .filter((e) => e.converted)
      .forEach((e) => {
        conversionsByTrigger[e.triggerId] = (conversionsByTrigger[e.triggerId] || 0) + 1;
      });

    let topConvertingTrigger: string | null = null;
    let maxConversions = 0;
    Object.entries(conversionsByTrigger).forEach(([id, count]) => {
      if (count > maxConversions) {
        maxConversions = count;
        topConvertingTrigger = id;
      }
    });

    return { totalShown, totalDismissed, totalConverted, conversionRate, topConvertingTrigger };
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  private isInCooldown(triggerId: string, cooldownDays: number): boolean {
    const lastShown = this.triggerHistory
      .filter((e) => e.triggerId === triggerId)
      .sort((a, b) => b.shownAt.localeCompare(a.shownAt))[0];

    if (!lastShown) return false;

    const elapsed = Date.now() - new Date(lastShown.shownAt).getTime();
    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
    return elapsed < cooldownMs;
  }

  private hasBeenShown(triggerId: string): boolean {
    return this.triggerHistory.some((e) => e.triggerId === triggerId);
  }

  private getRecordCount(field: string, context: any): number {
    switch (field) {
      case 'appointments': return context.appointmentCount || 0;
      case 'deployments': return context.deploymentCount || 0;
      case 'conditions': return context.conditionCount || 0;
      case 'attachments': return context.attachmentCount || 0;
      default: return 0;
    }
  }

  // =========================================================================
  // PERSISTENCE
  // =========================================================================

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const data = await database.getSetting('conversion_trigger_history');
      if (data) {
        this.triggerHistory = JSON.parse(data);
      }
    } catch (e) {
      this.triggerHistory = [];
    }
    this.loaded = true;
  }

  private async save(): Promise<void> {
    await database.setSetting('conversion_trigger_history', JSON.stringify(this.triggerHistory));
  }
}

export const conversionTriggers = new ConversionTriggerService();
