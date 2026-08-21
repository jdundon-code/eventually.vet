// ============================================================================
// EVENTUALLY.VET - Typography
// Military-inspired typography system - clean, bold, authoritative
// ============================================================================

import { TextStyle } from 'react-native';

export const typography = {
  // Headers - Bold, commanding presence
  h1: {
    fontSize: 32,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0,
    lineHeight: 28,
  },
  h4: {
    fontSize: 17,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0.1,
    lineHeight: 24,
  },

  // Body text
  body: {
    fontSize: 16,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0.15,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0.15,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0.1,
    lineHeight: 20,
  },

  // Captions & Labels
  caption: {
    fontSize: 12,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0.4,
    lineHeight: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 1.2,
    textTransform: 'uppercase' as TextStyle['textTransform'],
    lineHeight: 16,
  },
  overline: {
    fontSize: 10,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: 1.5,
    textTransform: 'uppercase' as TextStyle['textTransform'],
    lineHeight: 14,
  },

  // Button text
  button: {
    fontSize: 15,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: 0.8,
    textTransform: 'uppercase' as TextStyle['textTransform'],
    lineHeight: 20,
  },
  buttonSmall: {
    fontSize: 13,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0.5,
    lineHeight: 18,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};
