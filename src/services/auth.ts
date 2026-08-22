// ============================================================================
// EVENTUALLY.VET - Authentication Context
// Manages user auth state for cloud backup features
// ============================================================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { cloudSync, CloudUser } from './cloudSync';
import { database } from './database';

export interface AuthState {
  isAuthenticated: boolean;
  user: CloudUser | null;
  cloudEnabled: boolean;
  loading: boolean;
}

export async function initAuth(): Promise<AuthState> {
  try {
    const cloudEnabled = await database.getSetting('cloud_enabled');
    if (cloudEnabled !== 'true') {
      return { isAuthenticated: false, user: null, cloudEnabled: false, loading: false };
    }

    const user = await cloudSync.getSession();
    return {
      isAuthenticated: !!user,
      user,
      cloudEnabled: true,
      loading: false,
    };
  } catch (e) {
    return { isAuthenticated: false, user: null, cloudEnabled: false, loading: false };
  }
}
