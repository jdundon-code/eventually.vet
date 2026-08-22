// ============================================================================
// EVENTUALLY.VET - Accessibility Utilities
// WCAG 2.1 AA compliance helpers for React Native
// ============================================================================

import { AccessibilityInfo, Platform } from 'react-native';

/**
 * WCAG 2.1 AA Requirements implemented in this app:
 *
 * 1. PERCEIVABLE
 *    - All images/icons have accessibilityLabel or are marked decorative
 *    - Color is not the only means of conveying information (badges have text)
 *    - Text contrast ratio ≥ 4.5:1 (normal) / 3:1 (large text)
 *    - Content can be resized up to 200% without loss
 *
 * 2. OPERABLE
 *    - All interactive elements have minimum 44x44pt touch targets
 *    - All functionality available via screen reader
 *    - No time limits on user actions
 *    - Focus order follows logical reading order
 *    - All buttons/links have accessibilityRole and accessibilityLabel
 *
 * 3. UNDERSTANDABLE
 *    - Labels clearly describe form inputs
 *    - Error messages are associated with fields
 *    - Navigation is consistent across screens
 *    - Language is declared (English)
 *
 * 4. ROBUST
 *    - accessibilityRole used correctly for all elements
 *    - accessibilityState for toggles/selections
 *    - Works with VoiceOver (iOS) and TalkBack (Android)
 *    - accessibilityHint provides context for actions
 */

// Minimum contrast ratios (WCAG AA)
export const CONTRAST_RATIOS = {
  normalText: 4.5,    // 4.5:1 for normal text
  largeText: 3.0,     // 3:1 for large text (18pt+ or 14pt bold)
  uiComponents: 3.0,  // 3:1 for UI components and graphics
};

// Minimum touch target sizes (WCAG 2.5.5 / Apple HIG / Material)
export const TOUCH_TARGETS = {
  minimum: 44, // 44x44 points minimum
  recommended: 48, // 48x48 for comfortable tapping
};

/**
 * Check if screen reader is active
 */
export async function isScreenReaderActive(): Promise<boolean> {
  return AccessibilityInfo.isScreenReaderEnabled();
}

/**
 * Announce to screen reader (for dynamic content updates)
 */
export function announceForAccessibility(message: string): void {
  AccessibilityInfo.announceForAccessibility(message);
}

/**
 * Calculate relative luminance of a color
 */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 */
export function contrastRatio(color1: string, color2: string): number {
  const l1 = relativeLuminance(color1);
  const l2 = relativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG AA for normal text
 */
export function meetsContrastAA(foreground: string, background: string): boolean {
  return contrastRatio(foreground, background) >= CONTRAST_RATIOS.normalText;
}

/**
 * Helper to convert hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Generate accessible label for appointment time
 */
export function getTimeAccessibilityLabel(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const isPast = date < now;

  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${isPast ? 'Past appointment' : 'Upcoming appointment'} on ${dateStr} at ${timeStr}`;
}

/**
 * Format duration for screen readers
 */
export function getDurationAccessibilityLabel(days: number): string {
  if (days === 0) return 'less than one day';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''}`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`;
  return `${years} year${years > 1 ? 's' : ''} and ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
}
