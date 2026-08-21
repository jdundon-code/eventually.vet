// ============================================================================
// EVENTUALLY.VET - Onboarding Flow Controller
// Manages the multi-step onboarding process
// ============================================================================

import React, { useState } from 'react';
import { BranchOfService, UserProfile } from '../../models/types';
import { WelcomeScreen } from './WelcomeScreen';
import { BranchSelectScreen } from './BranchSelectScreen';
import { ProfileSetupScreen } from './ProfileSetupScreen';
import { useTheme } from '../../theme';
import { database } from '../../services/database';

type OnboardingStep = 'welcome' | 'branch' | 'profile';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [selectedBranch, setSelectedBranch] = useState<BranchOfService | null>(null);
  const { setBranch } = useTheme();

  function handleBranchSelect(branch: BranchOfService) {
    setSelectedBranch(branch);
    setBranch(branch);
    setStep('profile');
  }

  async function handleProfileComplete(profile: UserProfile) {
    try {
      await database.saveUserProfile(profile);
      await database.setSetting('onboardingComplete', 'true');
      onComplete();
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  }

  switch (step) {
    case 'welcome':
      return <WelcomeScreen onGetStarted={() => setStep('branch')} />;
    case 'branch':
      return (
        <BranchSelectScreen
          onSelect={handleBranchSelect}
          onBack={() => setStep('welcome')}
        />
      );
    case 'profile':
      return (
        <ProfileSetupScreen
          branch={selectedBranch!}
          onComplete={handleProfileComplete}
          onBack={() => setStep('branch')}
        />
      );
  }
}
