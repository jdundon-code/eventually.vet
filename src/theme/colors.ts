// ============================================================================
// EVENTUALLY.VET - Branch of Service Color Themes
// Each branch has authentic military colors for branding
// ============================================================================

import { BranchOfService } from '../models/types';

export interface BranchTheme {
  primary: string;       // Main brand color
  primaryDark: string;   // Darker variant
  primaryLight: string;  // Lighter variant
  secondary: string;     // Accent color
  secondaryDark: string;
  accent: string;        // Highlight color
  background: string;    // Main background (dark)
  surface: string;       // Card/surface background
  surfaceElevated: string; // Elevated surface
  text: string;          // Primary text
  textSecondary: string; // Secondary text
  textMuted: string;     // Muted/disabled text
  border: string;        // Border color
  success: string;
  warning: string;
  error: string;
  info: string;
}

// === ARMY ===
// Black and Gold - "This We'll Defend"
const armyTheme: BranchTheme = {
  primary: '#C1A63D',        // Army Gold
  primaryDark: '#8B7A2B',
  primaryLight: '#D4BE5E',
  secondary: '#4B5320',      // Army Green (OD Green)
  secondaryDark: '#2E3312',
  accent: '#C1A63D',
  background: '#0D0D0D',     // Near black
  surface: '#1A1A1A',
  surfaceElevated: '#2A2A2A',
  text: '#FFFFFF',
  textSecondary: '#C8C8C8',
  textMuted: '#888888',
  border: '#3A3A3A',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  info: '#2196F3',
};

// === NAVY ===
// Navy Blue and Gold - "Non Sibi Sed Patriae"
const navyTheme: BranchTheme = {
  primary: '#003B7A',        // Navy Blue
  primaryDark: '#002552',
  primaryLight: '#1565C0',
  secondary: '#C5A54E',     // Navy Gold
  secondaryDark: '#9C8133',
  accent: '#C5A54E',
  background: '#0A0E1A',    // Deep navy dark
  surface: '#121828',
  surfaceElevated: '#1E2A3F',
  text: '#FFFFFF',
  textSecondary: '#B8C5D6',
  textMuted: '#6B7B8F',
  border: '#2A3A52',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  info: '#42A5F5',
};

// === AIR FORCE ===
// Ultramarine Blue and Silver - "Aim High...Fly-Fight-Win"
const airForceTheme: BranchTheme = {
  primary: '#00308F',        // Air Force Blue
  primaryDark: '#001F5C',
  primaryLight: '#4169E1',
  secondary: '#A8B4C2',     // Air Force Silver
  secondaryDark: '#7A8A9C',
  accent: '#72A0C1',        // Air superiority blue
  background: '#0A0F1F',
  surface: '#121A2E',
  surfaceElevated: '#1C2840',
  text: '#FFFFFF',
  textSecondary: '#B0BEC5',
  textMuted: '#607D8B',
  border: '#263545',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  info: '#64B5F6',
};

// === MARINES ===
// Scarlet and Gold - "Semper Fidelis"
const marinesTheme: BranchTheme = {
  primary: '#C62828',        // Marine Corps Scarlet
  primaryDark: '#8E0000',
  primaryLight: '#EF5350',
  secondary: '#C5A54E',     // Marine Gold
  secondaryDark: '#9C8133',
  accent: '#FFD700',
  background: '#0D0A0A',    // Deep dark red-black
  surface: '#1A1212',
  surfaceElevated: '#2E1E1E',
  text: '#FFFFFF',
  textSecondary: '#D4B8B8',
  textMuted: '#8C6B6B',
  border: '#3D2626',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#FF5252',
  info: '#2196F3',
};

// === COAST GUARD ===
// Blue and Orange Racing Stripe - "Semper Paratus"
const coastGuardTheme: BranchTheme = {
  primary: '#003366',        // CG Blue
  primaryDark: '#002244',
  primaryLight: '#1976D2',
  secondary: '#FF6600',     // CG Orange (racing stripe)
  secondaryDark: '#CC5200',
  accent: '#FF6600',
  background: '#0A0F1A',
  surface: '#121C2B',
  surfaceElevated: '#1A283D',
  text: '#FFFFFF',
  textSecondary: '#B0C4D8',
  textMuted: '#6B8099',
  border: '#2A3D55',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#29B6F6',
};

// === SPACE FORCE ===
// Dark Blue/Black and Silver - "Semper Supra"
const spaceForceTheme: BranchTheme = {
  primary: '#0B1B3A',        // Space dark blue
  primaryDark: '#060E1F',
  primaryLight: '#1A3A6B',
  secondary: '#C0C0C0',     // Silver
  secondaryDark: '#909090',
  accent: '#7EB7E8',        // Light space blue
  background: '#050A14',    // Near space-black
  surface: '#0C1425',
  surfaceElevated: '#142240',
  text: '#FFFFFF',
  textSecondary: '#A8C4DE',
  textMuted: '#5A7A96',
  border: '#1E3456',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  info: '#80DEEA',
};

// === Theme Map ===
export const branchThemes: Record<BranchOfService, BranchTheme> = {
  army: armyTheme,
  navy: navyTheme,
  air_force: airForceTheme,
  marines: marinesTheme,
  coast_guard: coastGuardTheme,
  space_force: spaceForceTheme,
};

// Default theme (used before branch selection)
export const defaultTheme: BranchTheme = {
  primary: '#4A7C59',        // Military green
  primaryDark: '#2E5339',
  primaryLight: '#6B9B7A',
  secondary: '#C5A54E',
  secondaryDark: '#9C8133',
  accent: '#C5A54E',
  background: '#0D1117',
  surface: '#161B22',
  surfaceElevated: '#21262D',
  text: '#FFFFFF',
  textSecondary: '#B0BEC5',
  textMuted: '#6B7B8F',
  border: '#30363D',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  info: '#2196F3',
};
