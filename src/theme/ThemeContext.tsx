// ============================================================================
// EVENTUALLY.VET - Theme Context
// Provides branch-specific theming throughout the app
// ============================================================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BranchOfService } from '../models/types';
import { BranchTheme, branchThemes, defaultTheme } from './colors';
import { branchData, BranchInfo } from './branchInfo';
import { database } from '../services/database';

interface ThemeContextType {
  theme: BranchTheme;
  branch: BranchOfService | null;
  branchInfo: BranchInfo | null;
  setBranch: (branch: BranchOfService) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  branch: null,
  branchInfo: null,
  setBranch: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [branch, setBranchState] = useState<BranchOfService | null>(null);

  useEffect(() => {
    loadBranch();
  }, []);

  async function loadBranch() {
    try {
      const profile = await database.getUserProfile();
      if (profile?.branch) {
        setBranchState(profile.branch);
      }
    } catch (error) {
      // Profile not yet created, use default theme
    }
  }

  function setBranch(newBranch: BranchOfService) {
    setBranchState(newBranch);
  }

  const theme = branch ? branchThemes[branch] : defaultTheme;
  const info = branch ? branchData[branch] : null;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        branch,
        branchInfo: info,
        setBranch,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
