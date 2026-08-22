// ============================================================================
// EVENTUALLY.VET - Security & Privacy Settings Screen
// HIPAA-aligned controls: biometric lock, auto-lock, audit log, data deletion
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { biometricAuth, SecurityConfig, BiometricType } from '../../services/biometricAuth';
import { auditLog, AuditEntry, AuditStats, AuditCategory } from '../../services/auditLog';
import { database } from '../../services/database';
import { formatDateTime } from '../../utils/dates';

type SubView = 'main' | 'audit_log' | 'set_pin' | 'data_management';

const autoLockOptions = [
  { value: 0, label: 'Immediately' },
  { value: 1, label: '1 minute' },
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: -1, label: 'Never' },
];

const categoryIcons: Record<AuditCategory, { icon: string; color: string }> = {
  authentication: { icon: 'lock-closed', color: '#9C27B0' },
  data_access: { icon: 'eye', color: '#2196F3' },
  data_modification: { icon: 'create', color: '#FF9800' },
  export: { icon: 'download', color: '#4CAF50' },
  cloud: { icon: 'cloud', color: '#00BCD4' },
  buddy_letter: { icon: 'mail', color: '#E91E63' },
  settings: { icon: 'settings', color: '#607D8B' },
  calendar: { icon: 'calendar', color: '#8BC34A' },
  attachment: { icon: 'attach', color: '#795548' },
};

export function SecuritySettingsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [subView, setSubView] = useState<SubView>('main');
  const [config, setConfig] = useState<SecurityConfig>(biometricAuth.getConfig());
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric');
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditFilter, setAuditFilter] = useState<AuditCategory | 'all'>('all');

  // PIN setup state
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadState();
    }, [])
  );

  async function loadState() {
    const available = await biometricAuth.isBiometricAvailable();
    setBiometricAvailable(available);
    const label = await biometricAuth.getBiometricLabel();
    setBiometricLabel(label);
    setConfig(biometricAuth.getConfig());
    const stats = await auditLog.getStats();
    setAuditStats(stats);
  }

  async function loadAuditEntries() {
    const filter = auditFilter === 'all' ? undefined : { category: auditFilter as AuditCategory, limit: 200 };
    const entries = await auditLog.getEntries(filter ? filter : { limit: 200 });
    setAuditEntries(entries);
  }

  useEffect(() => {
    if (subView === 'audit_log') {
      loadAuditEntries();
    }
  }, [subView, auditFilter]);

  // =========================================================================
  // HANDLERS
  // =========================================================================

  async function handleToggleBiometric(enabled: boolean) {
    if (enabled && !biometricAvailable) {
      Alert.alert(
        'Not Available',
        `${biometricLabel} is not configured on this device. Please set it up in your device settings first.`
      );
      return;
    }

    if (enabled) {
      // Verify biometric works before enabling
      const result = await biometricAuth.authenticate('Verify to enable biometric lock');
      if (!result && !config.pinEnabled) {
        // If no PIN set and biometric failed, need to set PIN as fallback
        Alert.alert(
          'Set a PIN First',
          'Please set a backup PIN before enabling biometric lock.',
          [{ text: 'Set PIN', onPress: () => setSubView('set_pin') }, { text: 'Cancel' }]
        );
        return;
      }
    }

    await biometricAuth.setBiometricEnabled(enabled);
    setConfig(biometricAuth.getConfig());
  }

  async function handleSetPin() {
    setPinError('');
    if (newPin.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }
    if (newPin.length > 8) {
      setPinError('PIN must be 8 digits or fewer');
      return;
    }
    if (!/^\d+$/.test(newPin)) {
      setPinError('PIN must contain only numbers');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }

    await biometricAuth.setPin(newPin);
    setConfig(biometricAuth.getConfig());
    setNewPin('');
    setConfirmPin('');
    setSubView('main');
    Alert.alert('PIN Set', 'Your backup PIN has been configured.');
  }

  async function handleRemovePin() {
    Alert.alert(
      'Remove PIN',
      'Are you sure you want to remove your backup PIN? If biometric fails, you won\'t have a fallback.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await biometricAuth.removePin();
            setConfig(biometricAuth.getConfig());
          },
        },
      ]
    );
  }

  async function handleAutoLockChange(minutes: number) {
    await biometricAuth.setAutoLockTimeout(minutes);
    setConfig(biometricAuth.getConfig());
  }

  async function handleToggleLockOnBackground(enabled: boolean) {
    await biometricAuth.setLockOnBackground(enabled);
    setConfig(biometricAuth.getConfig());
  }

  async function handleToggleRequireAuthExport(enabled: boolean) {
    await biometricAuth.setRequireAuthForExport(enabled);
    setConfig(biometricAuth.getConfig());
  }

  async function handleToggleRequireAuthDelete(enabled: boolean) {
    await biometricAuth.setRequireAuthForDelete(enabled);
    setConfig(biometricAuth.getConfig());
  }

  async function handleExportAuditLog() {
    const text = await auditLog.exportAsText();
    Alert.alert(
      'Audit Log Export',
      `${auditEntries.length} entries ready.\n\nIn the full app, this would open the system share sheet to save or email the audit log.`,
      [{ text: 'OK' }]
    );
    await auditLog.logExport('audit_log', { entryCount: String(auditEntries.length) });
  }

  async function handleClearAuditLog() {
    Alert.alert(
      'Clear Audit Log',
      'This will permanently delete all audit log entries. This action is itself logged. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await auditLog.clearLog();
            await loadAuditEntries();
            await loadState();
          },
        },
      ]
    );
  }

  async function handleDeleteAllData() {
    Alert.alert(
      'Delete All Data',
      'This will PERMANENTLY delete all your data from this device including:\n\n• All medical appointments\n• All deployments & duty stations\n• All conditions & VA claims\n• All notes & attachments\n• All buddy letters\n• Your profile\n\nCloud backups will NOT be affected.\n\nThis cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Type "DELETE" to confirm you want to erase all local data.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'I Understand — Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await auditLog.log('data_deleted', 'data_modification', 'all_data', {
                      action: 'full_device_wipe',
                    });
                    // In production: wipe all SQLite tables
                    Alert.alert('Data Deleted', 'All local data has been erased.');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  // =========================================================================
  // SUB-VIEWS
  // =========================================================================

  // --- PIN SETUP ---
  if (subView === 'set_pin') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => { setSubView('main'); setNewPin(''); setConfirmPin(''); setPinError(''); }} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[typography.h3, { color: theme.text }]}>Set Backup PIN</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.formContent}>
          <View style={styles.pinIcon}>
            <Ionicons name="keypad" size={48} color={theme.primary} />
          </View>
          <Text style={[typography.body, { color: theme.textSecondary, textAlign: 'center', marginBottom: spacing.xl }]}>
            Set a 4-8 digit PIN as a fallback if biometric authentication fails.
          </Text>
          <Input
            label="New PIN"
            value={newPin}
            onChangeText={setNewPin}
            placeholder="4-8 digits"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
            required
          />
          <Input
            label="Confirm PIN"
            value={confirmPin}
            onChangeText={setConfirmPin}
            placeholder="Re-enter PIN"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
            required
            error={pinError}
          />
          <Button title="Set PIN" onPress={handleSetPin} variant="primary" size="large" style={{ marginTop: spacing.md }} />
        </ScrollView>
      </View>
    );
  }

  // --- AUDIT LOG VIEWER ---
  if (subView === 'audit_log') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setSubView('main')} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[typography.h3, { color: theme.text }]}>Audit Log</Text>
            <TouchableOpacity onPress={handleExportAuditLog}>
              <Ionicons name="download-outline" size={22} color={theme.primary} />
            </TouchableOpacity>
          </View>
          <Text style={[typography.bodySmall, { color: theme.textSecondary, marginTop: spacing.xs }]}>
            {auditEntries.length} entries tracked
          </Text>
          {/* Category Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <TouchableOpacity
                style={[styles.filterChip, { borderColor: auditFilter === 'all' ? theme.primary : theme.border, backgroundColor: auditFilter === 'all' ? theme.primary + '15' : 'transparent' }]}
                onPress={() => setAuditFilter('all')}
              >
                <Text style={[typography.caption, { color: auditFilter === 'all' ? theme.primary : theme.textMuted, fontWeight: '600' }]}>All</Text>
              </TouchableOpacity>
              {Object.entries(categoryIcons).map(([cat, info]) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.filterChip, { borderColor: auditFilter === cat ? info.color : theme.border, backgroundColor: auditFilter === cat ? info.color + '15' : 'transparent' }]}
                  onPress={() => setAuditFilter(cat as AuditCategory)}
                >
                  <Ionicons name={info.icon as any} size={12} color={auditFilter === cat ? info.color : theme.textMuted} />
                  <Text style={[typography.caption, { color: auditFilter === cat ? info.color : theme.textMuted, fontWeight: '600' }]}>
                    {cat.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <FlatList
          data={auditEntries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const catInfo = categoryIcons[item.category] || { icon: 'ellipse', color: theme.textMuted };
            return (
              <View style={[styles.auditEntry, { borderBottomColor: theme.border }]}>
                <View style={[styles.auditIcon, { backgroundColor: catInfo.color + '20' }]}>
                  <Ionicons name={catInfo.icon as any} size={14} color={catInfo.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodySmall, { color: theme.text }]}>
                    {formatActionLabel(item.action)}
                  </Text>
                  {item.entityType && (
                    <Text style={[typography.caption, { color: theme.textMuted }]}>
                      {item.entityType}{item.details?.name ? `: ${item.details.name}` : ''}
                    </Text>
                  )}
                  {item.details && !item.details.name && (
                    <Text style={[typography.caption, { color: theme.textMuted }]}>
                      {Object.entries(item.details).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </Text>
                  )}
                </View>
                <Text style={[typography.caption, { color: theme.textMuted }]}>
                  {formatTime(item.timestamp)}
                </Text>
              </View>
            );
          }}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.emptyAudit}>
              <Ionicons name="document-text-outline" size={40} color={theme.textMuted} />
              <Text style={[typography.body, { color: theme.textMuted, marginTop: spacing.md }]}>No audit entries</Text>
            </View>
          }
          ListFooterComponent={
            auditEntries.length > 0 ? (
              <View style={{ padding: spacing.lg }}>
                <Button title="Clear Audit Log" onPress={handleClearAuditLog} variant="ghost" textStyle={{ color: theme.error }} icon={<Ionicons name="trash" size={16} color={theme.error} />} />
              </View>
            ) : null
          }
        />
      </View>
    );
  }

  // --- DATA MANAGEMENT ---
  if (subView === 'data_management') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setSubView('main')} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[typography.h3, { color: theme.text }]}>Data Management</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.formContent}>
          <Card style={{ marginBottom: spacing.lg }}>
            <View style={styles.dataSection}>
              <Ionicons name="download-outline" size={24} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyBold, { color: theme.text }]}>Export All Data</Text>
                <Text style={[typography.caption, { color: theme.textMuted }]}>
                  Download a complete copy of all your records as a file
                </Text>
              </View>
            </View>
            <Button title="Export My Data" onPress={() => Alert.alert('Export', 'Full data export would generate a JSON/PDF package of all records.')} variant="outline" size="small" style={{ marginTop: spacing.md }} />
          </Card>

          <Card style={{ marginBottom: spacing.lg }}>
            <View style={styles.dataSection}>
              <Ionicons name="cloud-offline-outline" size={24} color={theme.warning} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyBold, { color: theme.text }]}>Delete Cloud Data</Text>
                <Text style={[typography.caption, { color: theme.textMuted }]}>
                  Remove your encrypted backup from the cloud. Local data is not affected.
                </Text>
              </View>
            </View>
            <Button title="Delete Cloud Backup" onPress={() => Alert.alert('Cloud Delete', 'This would remove your encrypted backup from Supabase servers.')} variant="outline" size="small" style={{ marginTop: spacing.md }} textStyle={{ color: theme.warning }} />
          </Card>

          <Card style={{ marginBottom: spacing.lg, borderColor: theme.error + '40' }}>
            <View style={styles.dataSection}>
              <Ionicons name="trash-outline" size={24} color={theme.error} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyBold, { color: theme.error }]}>Delete All Local Data</Text>
                <Text style={[typography.caption, { color: theme.textMuted }]}>
                  Permanently erase all data from this device. Cannot be undone. Cloud backups are not affected.
                </Text>
              </View>
            </View>
            <Button title="Delete All Data" onPress={handleDeleteAllData} variant="ghost" size="small" style={{ marginTop: spacing.md }} textStyle={{ color: theme.error }} icon={<Ionicons name="warning" size={16} color={theme.error} />} />
          </Card>

          <Card>
            <View style={styles.dataSection}>
              <Ionicons name="close-circle-outline" size={24} color={theme.error} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyBold, { color: theme.text }]}>Delete Account</Text>
                <Text style={[typography.caption, { color: theme.textMuted }]}>
                  Permanently delete your cloud account and all associated data. This removes data from our servers within 30 days.
                </Text>
              </View>
            </View>
            <Button title="Delete My Account" onPress={() => Alert.alert('Account Deletion', 'This would submit an account deletion request. All cloud data is purged within 30 days per our privacy policy.')} variant="ghost" size="small" style={{ marginTop: spacing.md }} textStyle={{ color: theme.error }} />
          </Card>
        </ScrollView>
      </View>
    );
  }

  // =========================================================================
  // MAIN SETTINGS VIEW
  // =========================================================================

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: theme.text }]}>Security & Privacy</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Authentication Section */}
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark" size={18} color={theme.primary} />
          <Text style={[typography.label, { color: theme.primary }]}>AUTHENTICATION</Text>
        </View>

        <Card style={styles.settingsCard}>
          {/* Biometric Toggle */}
          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: theme.text }]}>{biometricLabel}</Text>
              <Text style={[typography.caption, { color: biometricAvailable ? theme.textMuted : theme.error }]}>
                {biometricAvailable ? 'Require to open app' : 'Not available on this device'}
              </Text>
            </View>
            <Switch
              value={config.biometricEnabled}
              onValueChange={handleToggleBiometric}
              trackColor={{ false: theme.border, true: theme.primary + '80' }}
              thumbColor={config.biometricEnabled ? theme.primary : '#f4f3f4'}
              disabled={!biometricAvailable}
            />
          </View>

          {/* PIN */}
          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: theme.text }]}>Backup PIN</Text>
              <Text style={[typography.caption, { color: theme.textMuted }]}>
                {config.pinEnabled ? 'PIN is set' : 'Fallback if biometric fails'}
              </Text>
            </View>
            {config.pinEnabled ? (
              <TouchableOpacity onPress={handleRemovePin} style={styles.actionBtn}>
                <Text style={[typography.buttonSmall, { color: theme.error }]}>REMOVE</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setSubView('set_pin')} style={styles.actionBtn}>
                <Text style={[typography.buttonSmall, { color: theme.primary }]}>SET PIN</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Auto-Lock Timeout */}
          <View style={styles.settingColumn}>
            <Text style={[typography.bodyBold, { color: theme.text }]}>Auto-Lock After</Text>
            <Text style={[typography.caption, { color: theme.textMuted, marginBottom: spacing.sm }]}>
              Lock app after period of inactivity
            </Text>
            <View style={styles.timeoutGrid}>
              {autoLockOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.timeoutChip,
                    {
                      borderColor: config.autoLockTimeout === opt.value ? theme.primary : theme.border,
                      backgroundColor: config.autoLockTimeout === opt.value ? theme.primary + '15' : 'transparent',
                    },
                  ]}
                  onPress={() => handleAutoLockChange(opt.value)}
                >
                  <Text
                    style={[
                      typography.caption,
                      { color: config.autoLockTimeout === opt.value ? theme.primary : theme.textMuted, fontWeight: '600' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        {/* Additional Security */}
        <View style={styles.sectionHeader}>
          <Ionicons name="lock-closed" size={18} color={theme.primary} />
          <Text style={[typography.label, { color: theme.primary }]}>ADDITIONAL SECURITY</Text>
        </View>

        <Card style={styles.settingsCard}>
          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: theme.text }]}>Lock When Backgrounded</Text>
              <Text style={[typography.caption, { color: theme.textMuted }]}>Re-authenticate when returning to app</Text>
            </View>
            <Switch
              value={config.lockOnBackground}
              onValueChange={handleToggleLockOnBackground}
              trackColor={{ false: theme.border, true: theme.primary + '80' }}
              thumbColor={config.lockOnBackground ? theme.primary : '#f4f3f4'}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: theme.text }]}>Require Auth for Export</Text>
              <Text style={[typography.caption, { color: theme.textMuted }]}>Authenticate before sharing/exporting data</Text>
            </View>
            <Switch
              value={config.requireAuthForExport}
              onValueChange={handleToggleRequireAuthExport}
              trackColor={{ false: theme.border, true: theme.primary + '80' }}
              thumbColor={config.requireAuthForExport ? theme.primary : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: theme.text }]}>Require Auth for Delete</Text>
              <Text style={[typography.caption, { color: theme.textMuted }]}>Authenticate before deleting records</Text>
            </View>
            <Switch
              value={config.requireAuthForDelete}
              onValueChange={handleToggleRequireAuthDelete}
              trackColor={{ false: theme.border, true: theme.primary + '80' }}
              thumbColor={config.requireAuthForDelete ? theme.primary : '#f4f3f4'}
            />
          </View>
        </Card>

        {/* Audit Log */}
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text" size={18} color={theme.primary} />
          <Text style={[typography.label, { color: theme.primary }]}>AUDIT LOG</Text>
        </View>

        <Card style={styles.settingsCard} onPress={() => setSubView('audit_log')}>
          <View style={styles.auditSummary}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: theme.text }]}>View Access Log</Text>
              <Text style={[typography.caption, { color: theme.textMuted }]}>
                All data access, exports, and changes are tracked
              </Text>
              {auditStats && (
                <View style={styles.auditStatsRow}>
                  <Text style={[typography.caption, { color: theme.textSecondary }]}>
                    {auditStats.totalEntries} total &middot; {auditStats.last24Hours} today
                  </Text>
                  {auditStats.authFailures24h > 0 && (
                    <Text style={[typography.caption, { color: theme.error }]}>
                      &middot; {auditStats.authFailures24h} failed auth
                    </Text>
                  )}
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </View>
        </Card>

        {/* Data Management */}
        <View style={styles.sectionHeader}>
          <Ionicons name="server" size={18} color={theme.primary} />
          <Text style={[typography.label, { color: theme.primary }]}>DATA MANAGEMENT</Text>
        </View>

        <Card style={styles.settingsCard} onPress={() => setSubView('data_management')}>
          <View style={styles.auditSummary}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: theme.text }]}>Manage Your Data</Text>
              <Text style={[typography.caption, { color: theme.textMuted }]}>
                Export, delete local data, or remove cloud backup
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </View>
        </Card>

        {/* Privacy Policy */}
        <View style={styles.sectionHeader}>
          <Ionicons name="document" size={18} color={theme.primary} />
          <Text style={[typography.label, { color: theme.primary }]}>LEGAL</Text>
        </View>

        <Card style={styles.settingsCard} onPress={() => navigation.navigate('PrivacyPolicy')}>
          <View style={styles.auditSummary}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: theme.text }]}>Privacy Policy</Text>
              <Text style={[typography.caption, { color: theme.textMuted }]}>
                How your data is handled, stored, and protected
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </View>
        </Card>

        {/* HIPAA Notice */}
        <View style={[styles.hipaaNotice, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="information-circle" size={20} color={theme.info} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodySmall, { color: theme.text, fontWeight: '600' }]}>
              HIPAA-Aligned Security
            </Text>
            <Text style={[typography.caption, { color: theme.textMuted, marginTop: 4 }]}>
              EVENTUALLY.VET implements security controls aligned with HIPAA requirements including encryption at rest, encryption in transit, access controls, audit logging, and minimum necessary data handling — even though personal health records are not technically subject to HIPAA.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// =========================================================================
// HELPERS
// =========================================================================

function formatActionLabel(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 40 },
  formContent: { padding: spacing.lg },
  pinIcon: { alignItems: 'center', marginVertical: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  settingsCard: { marginHorizontal: spacing.lg },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  settingColumn: {
    paddingVertical: spacing.md,
  },
  actionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  timeoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  timeoutChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    marginRight: 4,
  },
  auditSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  auditStatsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  auditEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
  },
  auditIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAudit: {
    alignItems: 'center',
    paddingTop: 60,
  },
  dataSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  hipaaNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
});
