// ============================================================================
// EVENTUALLY.VET - Privacy Policy Screen (In-App Viewer)
// Displays the privacy policy in a readable format within the app
// ============================================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';
import { Card } from '../../components/common/Card';

export function PrivacyPolicyScreen({ navigation }: any) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: theme.text }]}>Privacy Policy</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={[typography.caption, { color: theme.textMuted, marginTop: spacing.xs }]}>
          Last Updated: August 21, 2026
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* TL;DR Summary */}
        <Card style={{ marginBottom: spacing.lg }} elevated>
          <View style={styles.summaryHeader}>
            <Ionicons name="shield-checkmark" size={24} color={theme.success} />
            <Text style={[typography.h4, { color: theme.text }]}>The Short Version</Text>
          </View>
          <View style={styles.summaryList}>
            <SummaryItem icon="phone-portrait" text="Your data stays on your device by default" theme={theme} />
            <SummaryItem icon="lock-closed" text="Cloud backup is end-to-end encrypted — we cannot read it" theme={theme} />
            <SummaryItem icon="close-circle" text="We never sell, share, or monetize your data" theme={theme} />
            <SummaryItem icon="trash" text="You can delete everything at any time" theme={theme} />
            <SummaryItem icon="eye-off" text="No tracking, no ads, no analytics SDKs" theme={theme} />
            <SummaryItem icon="key" text="Only your password can unlock your cloud data" theme={theme} />
          </View>
        </Card>

        {/* Section 1 */}
        <PolicySection title="1. Information We Collect" theme={theme}>
          <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
            We only store information you explicitly enter into the app:
          </Text>
          <BulletList items={[
            'Profile: Name, rank, branch, service dates, MOS',
            'Medical: Appointments, providers, diagnoses, treatments',
            'Service: Deployments, hazard exposures, duty stations',
            'Conditions: Names, descriptions, VA claim status',
            'Attachments: Documents and photos you add',
            'Cloud account: Email and encrypted password (if opted in)',
          ]} theme={theme} />
          <Text style={[styles.bodyText, { color: theme.textSecondary, marginTop: spacing.md }]}>
            We do NOT collect: Social Security Numbers, GPS location, advertising data, or information from other apps.
          </Text>
        </PolicySection>

        {/* Section 2 */}
        <PolicySection title="2. How Data Is Stored" theme={theme}>
          <SubHeading text="Local Storage (Default)" theme={theme} />
          <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
            All data is stored on your device in an encrypted database. It never leaves your device unless you explicitly choose to enable cloud backup or share data.
          </Text>

          <SubHeading text="Cloud Backup (Optional)" theme={theme} />
          <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
            If you enable cloud backup, all data is encrypted on your device before transmission using your password as the encryption key. We operate on a zero-knowledge architecture — even with full server access, your records cannot be read.
          </Text>

          <View style={[styles.encryptionTable, { borderColor: theme.border }]}>
            <EncRow label="Local database" value="Device OS encryption (AES-256)" theme={theme} />
            <EncRow label="Cloud transit" value="TLS 1.3 (HTTPS)" theme={theme} />
            <EncRow label="Cloud at rest" value="AES-256 via password-derived key" theme={theme} />
            <EncRow label="Passwords & PINs" value="SHA-256 hashed (never stored plaintext)" theme={theme} last />
          </View>
        </PolicySection>

        {/* Section 3 */}
        <PolicySection title="3. How Data Is Used" theme={theme}>
          <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
            Your data is used solely to provide app functionality: storing records, generating claim summaries, matching exposures to presumptive conditions, and syncing between your devices.
          </Text>
          <Text style={[styles.bodyText, { color: theme.error, fontWeight: '600', marginTop: spacing.md }]}>
            We NEVER use your data for advertising, profiling, sharing with government agencies, sale to third parties, or AI training.
          </Text>
        </PolicySection>

        {/* Section 4 */}
        <PolicySection title="4. Data Sharing" theme={theme}>
          <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
            Data is only shared when YOU explicitly initiate it:
          </Text>
          <BulletList items={[
            'Export: When you export a claim summary',
            'Email: When you send a buddy letter request',
            'Share: When you use the system share sheet',
            'Cloud: When you opt into encrypted backup',
          ]} theme={theme} />
        </PolicySection>

        {/* Section 5 */}
        <PolicySection title="5. Your Rights" theme={theme}>
          <BulletList items={[
            'Access: Full access to all your data at all times',
            'Correction: Edit any record at any time',
            'Deletion: Delete individual records, all local data, cloud data, or your entire account',
            'Portability: Export all data in structured format',
            'Withdrawal: Disable cloud backup or delete the app at any time',
          ]} theme={theme} />
        </PolicySection>

        {/* Section 6 */}
        <PolicySection title="6. Security Measures" theme={theme}>
          <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
            We implement controls aligned with HIPAA requirements:
          </Text>
          <BulletList items={[
            'Encryption at rest and in transit',
            'Biometric + PIN authentication',
            'Comprehensive audit logging',
            'Configurable auto-lock timeout',
            'Minimum necessary data collection',
            'Hash verification for backup integrity',
          ]} theme={theme} />

          <SubHeading text="Breach Notification" theme={theme} />
          <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
            In the event of a breach, we will notify affected users within 72 hours. Because cloud data is E2E encrypted, a server breach would expose only encrypted data unreadable without your password.
          </Text>
        </PolicySection>

        {/* Section 7 */}
        <PolicySection title="7. HIPAA Disclaimer" theme={theme}>
          <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
            EVENTUALLY.VET is a personal health record maintained by the individual user. It is not a covered entity under HIPAA. However, we voluntarily implement HIPAA-level security because your medical information deserves the highest protection regardless of legal requirements.
          </Text>
          <Text style={[styles.bodyText, { color: theme.textSecondary, marginTop: spacing.sm }]}>
            This app does not replace official medical records maintained by the VA, DoD, or healthcare providers.
          </Text>
        </PolicySection>

        {/* Section 8 */}
        <PolicySection title="8. Data Retention" theme={theme}>
          <BulletList items={[
            'Local data: Persists indefinitely (VA claims span a lifetime)',
            'Cloud backups: Retained while account is active; deleted within 30 days of account deletion',
            'Audit logs: Up to 10,000 entries; exportable and clearable by user',
          ]} theme={theme} />
        </PolicySection>

        {/* Contact */}
        <Card style={{ marginTop: spacing.lg }}>
          <View style={styles.contactSection}>
            <Ionicons name="mail" size={20} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: theme.text }]}>Questions?</Text>
              <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>
                privacy@eventually.vet
              </Text>
              <Text style={[typography.caption, { color: theme.textMuted, marginTop: 4 }]}>
                We respond to all privacy inquiries within 30 days.
              </Text>
            </View>
          </View>
        </Card>

        {/* Disclaimer */}
        <Text style={[typography.caption, { color: theme.textMuted, textAlign: 'center', marginTop: spacing.lg, marginBottom: spacing.xxl, paddingHorizontal: spacing.lg }]}>
          EVENTUALLY.VET is not affiliated with, endorsed by, or connected to the U.S. Department of Veterans Affairs, the Department of Defense, or any branch of the U.S. military.
        </Text>
      </ScrollView>
    </View>
  );
}

// === Sub-Components ===

function PolicySection({ title, theme, children }: { title: string; theme: any; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[typography.h4, { color: theme.text, marginBottom: spacing.sm }]}>{title}</Text>
      {children}
    </View>
  );
}

function SubHeading({ text, theme }: { text: string; theme: any }) {
  return (
    <Text style={[typography.bodyBold, { color: theme.text, marginTop: spacing.md, marginBottom: spacing.xs }]}>
      {text}
    </Text>
  );
}

function SummaryItem({ icon, text, theme }: { icon: string; text: string; theme: any }) {
  return (
    <View style={styles.summaryItem}>
      <Ionicons name={icon as any} size={18} color={theme.success} />
      <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>{text}</Text>
    </View>
  );
}

function BulletList({ items, theme }: { items: string[]; theme: any }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item, idx) => (
        <View key={idx} style={styles.bulletItem}>
          <View style={[styles.bullet, { backgroundColor: theme.primary }]} />
          <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function EncRow({ label, value, theme, last }: { label: string; value: string; theme: any; last?: boolean }) {
  return (
    <View style={[styles.encRow, !last && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
      <Text style={[typography.caption, { color: theme.textMuted, width: 110 }]}>{label}</Text>
      <Text style={[typography.caption, { color: theme.textSecondary, flex: 1 }]}>{value}</Text>
    </View>
  );
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
  content: { padding: spacing.lg },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryList: { gap: spacing.sm },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
  },
  bulletList: {
    marginTop: spacing.sm,
    gap: spacing.xs + 2,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  encryptionTable: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  encRow: {
    flexDirection: 'row',
    padding: spacing.sm + 2,
  },
  contactSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
});
