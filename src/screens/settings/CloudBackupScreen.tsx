// ============================================================================
// EVENTUALLY.VET - Cloud Backup & Storage Screen
// Manage cloud account, trigger backup/restore, view storage usage
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { cloudSync, CloudUser, SyncState } from '../../services/cloudSync';
import { database } from '../../services/database';
import { formatDateTime } from '../../utils/dates';

type ViewMode = 'overview' | 'signin' | 'signup';

export function CloudBackupScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [user, setUser] = useState<CloudUser | null>(null);
  const [syncState, setSyncState] = useState<SyncState>(cloudSync.getState());
  const [loading, setLoading] = useState(true);

  // Auth form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Storage metrics
  const [localStorage, setLocalStorage] = useState({ totalBytes: 0, attachmentBytes: 0, databaseBytes: 0 });
  const [cloudStorage, setCloudStorage] = useState({ totalBytes: 0, attachmentCount: 0, lastBackup: null as string | null });

  useEffect(() => {
    loadState();
    const unsubscribe = cloudSync.subscribe(setSyncState);
    return unsubscribe;
  }, []);

  async function loadState() {
    try {
      const session = await cloudSync.getSession();
      setUser(session);

      const local = await cloudSync.getLocalStorageUsage();
      setLocalStorage(local);

      if (session) {
        const cloud = await cloudSync.getStorageUsage();
        setCloudStorage(cloud);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    setAuthError('');
    if (!email.trim() || !password.trim()) {
      setAuthError('Email and password are required');
      return;
    }
    if (password.length < 8) {
      setAuthError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }

    setAuthLoading(true);
    const { user: newUser, error } = await cloudSync.signUp(email.trim(), password);
    setAuthLoading(false);

    if (error) {
      setAuthError(error);
      return;
    }

    setUser(newUser);
    setViewMode('overview');
    Alert.alert(
      'Account Created',
      'Your cloud backup account is ready. Your data will be encrypted before upload — only you can read it.',
      [{ text: 'Back Up Now', onPress: handleBackup }, { text: 'Later' }]
    );
  }

  async function handleSignIn() {
    setAuthError('');
    if (!email.trim() || !password.trim()) {
      setAuthError('Email and password are required');
      return;
    }

    setAuthLoading(true);
    const { user: existingUser, error } = await cloudSync.signIn(email.trim(), password);
    setAuthLoading(false);

    if (error) {
      setAuthError(error);
      return;
    }

    setUser(existingUser);
    setViewMode('overview');
    Alert.alert(
      'Signed In',
      'Would you like to restore your data from cloud backup or back up this device?',
      [
        { text: 'Restore from Cloud', onPress: handleRestore },
        { text: 'Back Up This Device', onPress: handleBackup },
        { text: 'Later', style: 'cancel' },
      ]
    );
  }

  async function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'Your data will remain on this device but will no longer sync to the cloud.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          onPress: async () => {
            await cloudSync.signOut();
            setUser(null);
          },
        },
      ]
    );
  }

  async function handleBackup() {
    const { success, error } = await cloudSync.backupAll();
    if (success) {
      Alert.alert('Backup Complete', 'All your data has been encrypted and uploaded to the cloud.');
      await loadState();
    } else {
      Alert.alert('Backup Failed', error || 'Please try again.');
    }
  }

  async function handleRestore() {
    Alert.alert(
      'Restore from Cloud',
      'This will replace all local data with your cloud backup. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            const { success, error, recordCount } = await cloudSync.restoreFromCloud();
            if (success) {
              Alert.alert(
                'Restore Complete',
                `Successfully restored ${recordCount} records from cloud backup.`
              );
            } else {
              Alert.alert('Restore Failed', error || 'Please try again.');
            }
          },
        },
      ]
    );
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  // =========================================================================
  // AUTH FORMS
  // =========================================================================

  if (viewMode === 'signup' || viewMode === 'signin') {
    const isSignUp = viewMode === 'signup';
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setViewMode('overview')} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[typography.h3, { color: theme.text }]}>
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Text>
            <View style={{ width: 40 }} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
          <View style={styles.authIcon}>
            <Ionicons name="cloud" size={48} color={theme.primary} />
          </View>
          <Text style={[typography.body, { color: theme.textSecondary, textAlign: 'center', marginBottom: spacing.lg }]}>
            {isSignUp
              ? 'Create an account to enable encrypted cloud backup. Your password is used to encrypt your data — we can never read it.'
              : 'Sign in to sync your data or restore from a previous backup.'}
          </Text>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            required
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder={isSignUp ? 'Min 8 characters (this encrypts your data)' : 'Your password'}
            secureTextEntry
            required
          />

          {isSignUp && (
            <Input
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              secureTextEntry
              required
            />
          )}

          {authError ? (
            <View style={[styles.errorBanner, { backgroundColor: theme.error + '15' }]}>
              <Ionicons name="alert-circle" size={18} color={theme.error} />
              <Text style={[typography.bodySmall, { color: theme.error }]}>{authError}</Text>
            </View>
          ) : null}

          <Button
            title={isSignUp ? 'Create Account & Enable Backup' : 'Sign In'}
            onPress={isSignUp ? handleSignUp : handleSignIn}
            variant="primary"
            size="large"
            loading={authLoading}
            style={{ marginTop: spacing.md }}
          />

          <TouchableOpacity
            style={{ marginTop: spacing.lg, alignItems: 'center' }}
            onPress={() => setViewMode(isSignUp ? 'signin' : 'signup')}
          >
            <Text style={[typography.body, { color: theme.primary }]}>
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>

          {isSignUp && (
            <View style={[styles.securityNote, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="shield-checkmark" size={20} color={theme.success} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodySmall, { color: theme.text, fontWeight: '600' }]}>
                  End-to-End Encrypted
                </Text>
                <Text style={[typography.caption, { color: theme.textMuted }]}>
                  Your data is encrypted on-device before upload. Your password is the key — even we cannot read your records. If you forget your password, data cannot be recovered.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // =========================================================================
  // MAIN OVERVIEW
  // =========================================================================

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: theme.text }]}>Cloud Backup & Storage</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cloud Status */}
        {user ? (
          <Card style={{ margin: spacing.lg }} elevated>
            <View style={styles.statusRow}>
              <View style={[styles.statusIcon, { backgroundColor: theme.success + '20' }]}>
                <Ionicons name="cloud-done" size={28} color={theme.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyBold, { color: theme.text }]}>Cloud Backup Active</Text>
                <Text style={[typography.caption, { color: theme.textMuted }]}>{user.email}</Text>
              </View>
              <TouchableOpacity onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Sync Status */}
            <View style={[styles.syncInfo, { borderTopColor: theme.border }]}>
              <View style={styles.syncRow}>
                <Text style={[typography.caption, { color: theme.textMuted }]}>Last backup:</Text>
                <Text style={[typography.caption, { color: theme.textSecondary }]}>
                  {cloudStorage.lastBackup ? formatDateTime(cloudStorage.lastBackup) : 'Never'}
                </Text>
              </View>
              <View style={styles.syncRow}>
                <Text style={[typography.caption, { color: theme.textMuted }]}>Status:</Text>
                <Text style={[typography.caption, { color: syncState.status === 'syncing' ? theme.info : theme.success }]}>
                  {syncState.status === 'syncing' ? '⟳ Syncing...' : '✓ Up to date'}
                </Text>
              </View>
            </View>
          </Card>
        ) : (
          <Card style={{ margin: spacing.lg }} elevated>
            <View style={styles.statusRow}>
              <View style={[styles.statusIcon, { backgroundColor: theme.textMuted + '20' }]}>
                <Ionicons name="cloud-offline" size={28} color={theme.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyBold, { color: theme.text }]}>Cloud Backup Disabled</Text>
                <Text style={[typography.caption, { color: theme.textMuted }]}>
                  Your data only exists on this device
                </Text>
              </View>
            </View>
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Button title="Create Account" onPress={() => setViewMode('signup')} variant="primary" />
              <Button title="Sign In (Existing Account)" onPress={() => setViewMode('signin')} variant="outline" />
            </View>
          </Card>
        )}

        {/* Storage Dashboard */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Text style={[typography.h4, { color: theme.text, marginBottom: spacing.md }]}>
            Storage Usage
          </Text>
        </View>

        <View style={styles.storageGrid}>
          <Card style={{ flex: 1 }}>
            <View style={styles.storageItem}>
              <Ionicons name="phone-portrait" size={24} color={theme.info} />
              <Text style={[typography.h4, { color: theme.text }]}>
                {formatBytes(localStorage.totalBytes)}
              </Text>
              <Text style={[typography.caption, { color: theme.textMuted }]}>On Device</Text>
            </View>
            <View style={styles.storageBreakdown}>
              <View style={styles.storageBreakdownRow}>
                <Text style={[typography.caption, { color: theme.textMuted }]}>Database</Text>
                <Text style={[typography.caption, { color: theme.textSecondary }]}>
                  {formatBytes(localStorage.databaseBytes)}
                </Text>
              </View>
              <View style={styles.storageBreakdownRow}>
                <Text style={[typography.caption, { color: theme.textMuted }]}>Attachments</Text>
                <Text style={[typography.caption, { color: theme.textSecondary }]}>
                  {formatBytes(localStorage.attachmentBytes)}
                </Text>
              </View>
            </View>
          </Card>

          <Card style={{ flex: 1 }}>
            <View style={styles.storageItem}>
              <Ionicons name="cloud" size={24} color={theme.primary} />
              <Text style={[typography.h4, { color: theme.text }]}>
                {user ? formatBytes(cloudStorage.totalBytes) : '—'}
              </Text>
              <Text style={[typography.caption, { color: theme.textMuted }]}>In Cloud</Text>
            </View>
            <View style={styles.storageBreakdown}>
              <View style={styles.storageBreakdownRow}>
                <Text style={[typography.caption, { color: theme.textMuted }]}>Attachments</Text>
                <Text style={[typography.caption, { color: theme.textSecondary }]}>
                  {user ? `${cloudStorage.attachmentCount} files` : '—'}
                </Text>
              </View>
              <View style={styles.storageBreakdownRow}>
                <Text style={[typography.caption, { color: theme.textMuted }]}>Encrypted</Text>
                <Text style={[typography.caption, { color: theme.success }]}>
                  {user ? '✓ Yes' : '—'}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Actions */}
        {user && (
          <View style={{ padding: spacing.lg, gap: spacing.sm }}>
            <Text style={[typography.h4, { color: theme.text, marginBottom: spacing.sm }]}>
              Actions
            </Text>
            <Button
              title="Back Up Now"
              onPress={handleBackup}
              variant="primary"
              loading={syncState.status === 'syncing'}
              icon={<Ionicons name="cloud-upload" size={20} color="#FFFFFF" />}
            />
            <Button
              title="Restore from Cloud"
              onPress={handleRestore}
              variant="outline"
              icon={<Ionicons name="cloud-download" size={18} color={theme.primary} />}
            />
          </View>
        )}

        {/* Security Info */}
        <View style={{ padding: spacing.lg }}>
          <Text style={[typography.h4, { color: theme.text, marginBottom: spacing.md }]}>
            Security
          </Text>
          <Card>
            <SecurityItem
              icon="lock-closed"
              title="End-to-End Encrypted"
              description="Data encrypted on your device before upload"
              theme={theme}
            />
            <SecurityItem
              icon="key"
              title="You Hold the Key"
              description="Only your password can decrypt your data"
              theme={theme}
            />
            <SecurityItem
              icon="eye-off"
              title="Zero Knowledge"
              description="Server cannot read your medical records"
              theme={theme}
            />
            <SecurityItem
              icon="server"
              title="Supabase Hosted"
              description="SOC 2 compliant infrastructure"
              theme={theme}
              last
            />
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

function SecurityItem({
  icon,
  title,
  description,
  theme,
  last,
}: {
  icon: string;
  title: string;
  description: string;
  theme: any;
  last?: boolean;
}) {
  return (
    <View style={[styles.securityItem, !last && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
      <Ionicons name={icon as any} size={20} color={theme.success} />
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodySmall, { color: theme.text, fontWeight: '600' }]}>{title}</Text>
        <Text style={[typography.caption, { color: theme.textMuted }]}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  formContent: {
    padding: spacing.lg,
  },
  authIcon: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.xl,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncInfo: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    gap: spacing.xs,
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  storageGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  storageItem: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  storageBreakdown: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  storageBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
});
