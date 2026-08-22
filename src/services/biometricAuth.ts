// ============================================================================
// EVENTUALLY.VET - Biometric Authentication Service
// Face ID / Touch ID / Fingerprint with PIN fallback
// HIPAA-aligned: Protects PHI from unauthorized device access
// ============================================================================

import * as LocalAuthentication from 'expo-local-authentication';
import { database } from './database';
import { auditLog } from './auditLog';

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';
export type AuthMethod = 'biometric' | 'pin' | 'none';

export interface SecurityConfig {
  biometricEnabled: boolean;
  pinEnabled: boolean;
  pinHash?: string; // SHA-256 hash of PIN, never stored plaintext
  autoLockTimeout: number; // minutes (0 = immediate, -1 = never)
  lockOnBackground: boolean;
  requireAuthForExport: boolean;
  requireAuthForDelete: boolean;
  screenshotProtection: boolean; // Android only
  lastAuthenticatedAt?: string;
}

const DEFAULT_CONFIG: SecurityConfig = {
  biometricEnabled: false,
  pinEnabled: false,
  autoLockTimeout: 5, // 5 minutes
  lockOnBackground: true,
  requireAuthForExport: true,
  requireAuthForDelete: true,
  screenshotProtection: true,
};

class BiometricAuthService {
  private config: SecurityConfig = DEFAULT_CONFIG;
  private isLocked: boolean = true;
  private lastActivityTime: number = Date.now();
  private lockListeners: ((locked: boolean) => void)[] = [];

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  async initialize(): Promise<void> {
    await this.loadConfig();
    // If no auth is configured, don't lock
    if (!this.config.biometricEnabled && !this.config.pinEnabled) {
      this.isLocked = false;
    }
  }

  // =========================================================================
  // DEVICE CAPABILITIES
  // =========================================================================

  /**
   * Check if device supports biometric authentication
   */
  async isBiometricAvailable(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  }

  /**
   * Get the type of biometric available on this device
   */
  async getBiometricType(): Promise<BiometricType> {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'facial';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'iris';
    }
    return 'none';
  }

  /**
   * Get human-readable label for the biometric type
   */
  async getBiometricLabel(): Promise<string> {
    const type = await this.getBiometricType();
    switch (type) {
      case 'facial': return 'Face ID';
      case 'fingerprint': return 'Touch ID / Fingerprint';
      case 'iris': return 'Iris Scan';
      default: return 'Biometric';
    }
  }

  // =========================================================================
  // AUTHENTICATION
  // =========================================================================

  /**
   * Authenticate the user via biometric or PIN
   * Returns true if authenticated, false if failed/cancelled
   */
  async authenticate(reason?: string): Promise<boolean> {
    const promptMessage = reason || 'Authenticate to access EVENTUALLY.VET';

    // If no auth configured, auto-pass
    if (!this.config.biometricEnabled && !this.config.pinEnabled) {
      this.unlock();
      return true;
    }

    // Try biometric first
    if (this.config.biometricEnabled) {
      const result = await this.authenticateBiometric(promptMessage);
      if (result) {
        this.unlock();
        await auditLog.log('auth_success', 'authentication', undefined, {
          method: 'biometric',
        });
        return true;
      }
      // Biometric failed — fall through to PIN if available
    }

    // PIN fallback handled by caller (UI shows PIN entry)
    // Return false to indicate biometric failed, caller should show PIN screen
    if (this.config.pinEnabled) {
      await auditLog.log('auth_biometric_failed', 'authentication', undefined, {
        reason: 'Biometric failed or cancelled, PIN fallback available',
      });
      return false; // Caller handles PIN UI
    }

    await auditLog.log('auth_failed', 'authentication', undefined, {
      reason: 'Authentication failed',
    });
    return false;
  }

  /**
   * Authenticate with biometric only
   */
  private async authenticateBiometric(promptMessage: string): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Use PIN',
        disableDeviceFallback: true, // We handle our own PIN
        fallbackLabel: 'Enter PIN',
      });
      return result.success;
    } catch (error) {
      console.error('Biometric auth error:', error);
      return false;
    }
  }

  /**
   * Verify PIN against stored hash
   */
  async verifyPin(pin: string): Promise<boolean> {
    if (!this.config.pinHash) return false;

    const Crypto = require('expo-crypto');
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `eventually.vet:pin:${pin}`
    );

    if (hash === this.config.pinHash) {
      this.unlock();
      await auditLog.log('auth_success', 'authentication', undefined, {
        method: 'pin',
      });
      return true;
    }

    await auditLog.log('auth_failed', 'authentication', undefined, {
      method: 'pin',
      reason: 'Incorrect PIN',
    });
    return false;
  }

  /**
   * Set a new PIN
   */
  async setPin(pin: string): Promise<void> {
    const Crypto = require('expo-crypto');
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `eventually.vet:pin:${pin}`
    );
    this.config.pinHash = hash;
    this.config.pinEnabled = true;
    await this.saveConfig();
    await auditLog.log('security_setting_changed', 'settings', undefined, {
      setting: 'pin',
      action: 'enabled',
    });
  }

  /**
   * Remove PIN
   */
  async removePin(): Promise<void> {
    this.config.pinHash = undefined;
    this.config.pinEnabled = false;
    await this.saveConfig();
    await auditLog.log('security_setting_changed', 'settings', undefined, {
      setting: 'pin',
      action: 'disabled',
    });
  }

  // =========================================================================
  // LOCK STATE
  // =========================================================================

  /**
   * Check if app is currently locked
   */
  getIsLocked(): boolean {
    return this.isLocked;
  }

  /**
   * Unlock the app (called after successful auth)
   */
  private unlock(): void {
    this.isLocked = false;
    this.lastActivityTime = Date.now();
    this.config.lastAuthenticatedAt = new Date().toISOString();
    this.notifyListeners();
  }

  /**
   * Lock the app
   */
  lock(): void {
    if (this.config.biometricEnabled || this.config.pinEnabled) {
      this.isLocked = true;
      this.notifyListeners();
      auditLog.log('app_locked', 'authentication', undefined, {
        reason: 'manual_or_timeout',
      });
    }
  }

  /**
   * Record user activity (resets auto-lock timer)
   */
  recordActivity(): void {
    this.lastActivityTime = Date.now();
  }

  /**
   * Check if auto-lock timeout has elapsed
   * Should be called when app returns to foreground
   */
  checkAutoLock(): boolean {
    if (!this.config.biometricEnabled && !this.config.pinEnabled) {
      return false; // No auth configured
    }
    if (this.config.autoLockTimeout === -1) {
      return false; // Auto-lock disabled
    }
    if (this.config.autoLockTimeout === 0) {
      this.lock();
      return true; // Lock immediately
    }

    const elapsed = Date.now() - this.lastActivityTime;
    const timeoutMs = this.config.autoLockTimeout * 60 * 1000;

    if (elapsed >= timeoutMs) {
      this.lock();
      return true;
    }
    return false;
  }

  /**
   * Handle app going to background
   */
  onAppBackground(): void {
    if (this.config.lockOnBackground) {
      // Don't lock immediately — use the timeout
      // But record the time for auto-lock check on return
    }
  }

  /**
   * Handle app coming to foreground
   */
  onAppForeground(): void {
    this.checkAutoLock();
  }

  // =========================================================================
  // CONFIGURATION
  // =========================================================================

  /**
   * Get current security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Enable/disable biometric authentication
   */
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    this.config.biometricEnabled = enabled;
    await this.saveConfig();
    await auditLog.log('security_setting_changed', 'settings', undefined, {
      setting: 'biometric',
      action: enabled ? 'enabled' : 'disabled',
    });
    if (!enabled && !this.config.pinEnabled) {
      this.isLocked = false;
      this.notifyListeners();
    }
  }

  /**
   * Set auto-lock timeout (minutes)
   */
  async setAutoLockTimeout(minutes: number): Promise<void> {
    this.config.autoLockTimeout = minutes;
    await this.saveConfig();
    await auditLog.log('security_setting_changed', 'settings', undefined, {
      setting: 'autoLockTimeout',
      value: `${minutes} minutes`,
    });
  }

  /**
   * Set lock-on-background preference
   */
  async setLockOnBackground(enabled: boolean): Promise<void> {
    this.config.lockOnBackground = enabled;
    await this.saveConfig();
  }

  /**
   * Set require-auth-for-export preference
   */
  async setRequireAuthForExport(enabled: boolean): Promise<void> {
    this.config.requireAuthForExport = enabled;
    await this.saveConfig();
  }

  /**
   * Set require-auth-for-delete preference
   */
  async setRequireAuthForDelete(enabled: boolean): Promise<void> {
    this.config.requireAuthForDelete = enabled;
    await this.saveConfig();
  }

  // =========================================================================
  // LISTENERS
  // =========================================================================

  onLockStateChange(listener: (locked: boolean) => void): () => void {
    this.lockListeners.push(listener);
    return () => {
      this.lockListeners = this.lockListeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.lockListeners.forEach((l) => l(this.isLocked));
  }

  // =========================================================================
  // PERSISTENCE
  // =========================================================================

  private async loadConfig(): Promise<void> {
    try {
      const data = await database.getSetting('security_config');
      if (data) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
      }
    } catch (e) {
      this.config = DEFAULT_CONFIG;
    }
  }

  private async saveConfig(): Promise<void> {
    await database.setSetting('security_config', JSON.stringify(this.config));
  }
}

export const biometricAuth = new BiometricAuthService();
