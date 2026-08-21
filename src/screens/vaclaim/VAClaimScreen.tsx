// ============================================================================
// EVENTUALLY.VET - VA Claim Preparation Screen
// Summary view organizing all tracked data for VA claim filing
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { database } from '../../services/database';
import {
  UserProfile,
  MedicalAppointment,
  Deployment,
  DutyStation,
  ServiceCondition,
  Attachment,
} from '../../models/types';
import { formatDate, formatDateRange, calculateServiceLength } from '../../utils/dates';

interface ClaimSummary {
  profile: UserProfile | null;
  appointments: MedicalAppointment[];
  deployments: Deployment[];
  dutyStations: DutyStation[];
  conditions: ServiceCondition[];
  totalAttachments: number;
  serviceConnectedAppointments: number;
  uniqueHazards: string[];
}

export function VAClaimScreen({ navigation }: any) {
  const { theme, branchInfo } = useTheme();
  const [summary, setSummary] = useState<ClaimSummary | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [])
  );

  async function loadSummary() {
    try {
      const profile = await database.getUserProfile();
      if (!profile) return;

      const appointments = await database.getAppointments(profile.id);
      const deployments = await database.getDeployments(profile.id);
      const dutyStations = await database.getDutyStations(profile.id);
      const conditions = await database.getConditions(profile.id);

      // Count all attachments
      let totalAttachments = 0;
      for (const apt of appointments) {
        const atts = await database.getAttachments(apt.id, 'appointment');
        totalAttachments += atts.length;
      }
      for (const dep of deployments) {
        const atts = await database.getAttachments(dep.id, 'deployment');
        totalAttachments += atts.length;
      }

      // Collect unique hazards
      const allHazards = new Set<string>();
      deployments.forEach((d) => d.hazards.forEach((h) => allHazards.add(h)));

      setSummary({
        profile,
        appointments,
        deployments,
        dutyStations,
        conditions,
        totalAttachments,
        serviceConnectedAppointments: appointments.filter((a) => a.relatedToService).length,
        uniqueHazards: Array.from(allHazards),
      });
    } catch (error) {
      console.error('Failed to load claim summary:', error);
    }
  }

  function generateClaimText(): string {
    if (!summary || !summary.profile) return '';

    const { profile, appointments, deployments, dutyStations, conditions } = summary;
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════');
    lines.push('EVENTUALLY.VET — VA CLAIM SUMMARY');
    lines.push('═══════════════════════════════════════');
    lines.push('');
    lines.push(`Name: ${profile.firstName} ${profile.lastName}`);
    lines.push(`Branch: ${branchInfo?.name || profile.branch}`);
    lines.push(`Rank: ${profile.rank || 'N/A'}`);
    lines.push(`Service: ${formatDate(profile.serviceStartDate)} - ${profile.serviceEndDate ? formatDate(profile.serviceEndDate) : 'Present'}`);
    lines.push(`Total Service: ${calculateServiceLength(profile.serviceStartDate, profile.serviceEndDate)}`);
    lines.push('');

    // Conditions
    if (conditions.length > 0) {
      lines.push('─── SERVICE-CONNECTED CONDITIONS ───');
      conditions.forEach((c, i) => {
        lines.push(`${i + 1}. ${c.name}`);
        lines.push(`   Status: ${c.currentStatus}`);
        if (c.onsetDate) lines.push(`   Onset: ${formatDate(c.onsetDate)}`);
        if (c.diagnosisDate) lines.push(`   Diagnosed: ${formatDate(c.diagnosisDate)}`);
        lines.push(`   Description: ${c.description}`);
        if (c.vaClaimed) lines.push(`   VA Rating: ${c.vaRatingPercent || 'Pending'}%`);
        lines.push('');
      });
    }

    // Deployments
    if (deployments.length > 0) {
      lines.push('─── DEPLOYMENTS ───');
      deployments.forEach((d) => {
        lines.push(`• ${d.name} — ${d.location}`);
        lines.push(`  ${formatDateRange(d.startDate, d.endDate)}`);
        if (d.combatZone) lines.push('  ⚠ Combat Zone');
        if (d.hazards.length > 0) lines.push(`  Hazards: ${d.hazards.join(', ')}`);
        lines.push('');
      });
    }

    // Duty Stations
    if (dutyStations.length > 0) {
      lines.push('─── DUTY STATIONS (PCS HISTORY) ───');
      dutyStations.forEach((s) => {
        lines.push(`• ${s.name} — ${s.unit}`);
        lines.push(`  ${s.location}`);
        lines.push(`  ${formatDateRange(s.startDate, s.endDate)}`);
        lines.push('');
      });
    }

    // Medical Appointments (service-connected)
    const scAppointments = appointments.filter((a) => a.relatedToService);
    if (scAppointments.length > 0) {
      lines.push('─── SERVICE-CONNECTED MEDICAL VISITS ───');
      scAppointments.forEach((a) => {
        lines.push(`• ${formatDate(a.date)} — ${a.title}`);
        lines.push(`  Provider: ${a.provider} @ ${a.facility}`);
        lines.push(`  Complaint: ${a.chiefComplaint}`);
        if (a.diagnosis) lines.push(`  Diagnosis: ${a.diagnosis}`);
        if (a.relatedCondition) lines.push(`  Related To: ${a.relatedCondition}`);
        lines.push('');
      });
    }

    // Hazards
    if (summary.uniqueHazards.length > 0) {
      lines.push('─── ENVIRONMENTAL EXPOSURES ───');
      summary.uniqueHazards.forEach((h) => lines.push(`• ${h}`));
      lines.push('');
    }

    lines.push('═══════════════════════════════════════');
    lines.push(`Generated: ${new Date().toLocaleDateString()}`);
    lines.push(`Total Records: ${appointments.length} appointments, ${deployments.length} deployments, ${dutyStations.length} duty stations`);
    lines.push(`Attachments: ${summary.totalAttachments} documents`);
    lines.push('═══════════════════════════════════════');

    return lines.join('\n');
  }

  function handleExport() {
    const text = generateClaimText();
    // In a real app, this would use Share API or write to file
    Alert.alert(
      'Export Options',
      'How would you like to export your claim summary?',
      [
        {
          text: 'Copy to Clipboard',
          onPress: () => {
            // Would use Clipboard API
            Alert.alert('Copied!', 'Claim summary copied to clipboard.');
          },
        },
        {
          text: 'Share',
          onPress: () => {
            // Would use Share API
            Alert.alert('Share', 'Share functionality would open the system share sheet.');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  if (!summary) return null;

  const readinessScore = calculateReadiness(summary);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[typography.h2, { color: theme.text }]}>VA Claim Prep</Text>
          <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>
            Your documentation summary for filing
          </Text>
        </View>

        {/* Readiness Score */}
        <Card style={{ margin: spacing.lg }} elevated>
          <View style={styles.readinessCard}>
            <View style={styles.readinessHeader}>
              <Text style={[typography.label, { color: theme.primary }]}>CLAIM READINESS</Text>
              <View
                style={[
                  styles.scoreContainer,
                  { backgroundColor: getScoreColor(readinessScore, theme) + '20' },
                ]}
              >
                <Text
                  style={[
                    typography.h2,
                    { color: getScoreColor(readinessScore, theme) },
                  ]}
                >
                  {readinessScore}%
                </Text>
              </View>
            </View>
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${readinessScore}%`,
                    backgroundColor: getScoreColor(readinessScore, theme),
                  },
                ]}
              />
            </View>
            <Text style={[typography.caption, { color: theme.textMuted, marginTop: spacing.sm }]}>
              {readinessScore < 30
                ? 'Start documenting — every record strengthens your claim.'
                : readinessScore < 60
                ? 'Good progress. Keep adding appointments and details.'
                : readinessScore < 80
                ? 'Strong documentation. Consider adding conditions and linking records.'
                : 'Excellent! Your documentation is comprehensive.'}
            </Text>
          </View>
        </Card>

        {/* Checklist */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text style={[typography.h4, { color: theme.text, marginBottom: spacing.md }]}>
            Documentation Checklist
          </Text>

          <ChecklistItem
            done={(summary.profile?.serviceStartDate || '') !== ''}
            label="Service dates recorded"
            theme={theme}
          />
          <ChecklistItem
            done={summary.dutyStations.length > 0}
            label="At least 1 duty station"
            theme={theme}
          />
          <ChecklistItem
            done={summary.appointments.length >= 3}
            label="3+ medical appointments documented"
            theme={theme}
          />
          <ChecklistItem
            done={summary.serviceConnectedAppointments > 0}
            label="Appointments marked service-connected"
            theme={theme}
          />
          <ChecklistItem
            done={summary.deployments.length > 0}
            label="Deployments logged (if applicable)"
            theme={theme}
          />
          <ChecklistItem
            done={summary.uniqueHazards.length > 0}
            label="Environmental exposures documented"
            theme={theme}
          />
          <ChecklistItem
            done={summary.conditions.length > 0}
            label="Service conditions identified"
            theme={theme}
          />
          <ChecklistItem
            done={summary.totalAttachments > 0}
            label="Supporting documents attached"
            theme={theme}
          />
        </View>

        {/* Summary Stats */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text style={[typography.h4, { color: theme.text, marginBottom: spacing.md }]}>
            Evidence Summary
          </Text>

          <View style={styles.summaryGrid}>
            <SummaryTile
              icon="medical"
              value={summary.appointments.length}
              label="Appointments"
              sublabel={`${summary.serviceConnectedAppointments} service-connected`}
              theme={theme}
            />
            <SummaryTile
              icon="globe"
              value={summary.deployments.length}
              label="Deployments"
              sublabel={`${summary.uniqueHazards.length} hazard types`}
              theme={theme}
            />
            <SummaryTile
              icon="business"
              value={summary.dutyStations.length}
              label="Duty Stations"
              sublabel="PCS history"
              theme={theme}
            />
            <SummaryTile
              icon="attach"
              value={summary.totalAttachments}
              label="Attachments"
              sublabel="Documents & photos"
              theme={theme}
            />
          </View>
        </View>

        {/* Conditions to Claim */}
        {summary.conditions.length > 0 && (
          <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
            <Text style={[typography.h4, { color: theme.text, marginBottom: spacing.md }]}>
              Conditions to Claim
            </Text>
            {summary.conditions.map((condition) => (
              <Card key={condition.id} style={{ marginBottom: spacing.sm }}>
                <View style={styles.conditionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyBold, { color: theme.text }]}>
                      {condition.name}
                    </Text>
                    <Text style={[typography.caption, { color: theme.textMuted }]}>
                      {condition.currentStatus} • {condition.serviceConnected ? 'Service-Connected' : 'Not SC'}
                    </Text>
                  </View>
                  {condition.vaClaimed ? (
                    <View style={[styles.claimedBadge, { backgroundColor: theme.success + '20' }]}>
                      <Text style={[typography.overline, { color: theme.success }]}>
                        CLAIMED {condition.vaRatingPercent ? `${condition.vaRatingPercent}%` : ''}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.claimedBadge, { backgroundColor: theme.warning + '20' }]}>
                      <Text style={[typography.overline, { color: theme.warning }]}>TO FILE</Text>
                    </View>
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Hazard Exposures */}
        {summary.uniqueHazards.length > 0 && (
          <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
            <Text style={[typography.h4, { color: theme.text, marginBottom: spacing.md }]}>
              Environmental Exposures
            </Text>
            <Card>
              <View style={styles.hazardList}>
                {summary.uniqueHazards.map((hazard, idx) => (
                  <View key={idx} style={styles.hazardItem}>
                    <Ionicons name="warning" size={14} color={theme.warning} />
                    <Text style={[typography.body, { color: theme.text }]}>{hazard}</Text>
                  </View>
                ))}
              </View>
              <Text style={[typography.caption, { color: theme.textMuted, marginTop: spacing.md }]}>
                These exposures may qualify for presumptive service connection under PACT Act and other VA regulations.
              </Text>
            </Card>
          </View>
        )}

        {/* Export Actions */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg, marginBottom: spacing.xxl }]}>
          <Text style={[typography.h4, { color: theme.text, marginBottom: spacing.md }]}>
            Export & Share
          </Text>
          <Button
            title="Export Claim Summary"
            onPress={handleExport}
            variant="primary"
            size="large"
            style={{ marginBottom: spacing.sm }}
            icon={<Ionicons name="download" size={20} color="#FFFFFF" />}
          />
          <Button
            title="Add Service Condition"
            onPress={() => navigation.navigate('AddCondition')}
            variant="outline"
            icon={<Ionicons name="add-circle" size={18} color={theme.primary} />}
          />
        </View>
      </ScrollView>
    </View>
  );
}

// === Helper Components ===

function ChecklistItem({ done, label, theme }: { done: boolean; label: string; theme: any }) {
  return (
    <View style={styles.checklistItem}>
      <Ionicons
        name={done ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={done ? theme.success : theme.textMuted}
      />
      <Text
        style={[
          typography.body,
          { color: done ? theme.text : theme.textMuted },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function SummaryTile({
  icon,
  value,
  label,
  sublabel,
  theme,
}: {
  icon: string;
  value: number;
  label: string;
  sublabel: string;
  theme: any;
}) {
  return (
    <View style={[styles.summaryTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Ionicons name={icon as any} size={20} color={theme.primary} />
      <Text style={[typography.h3, { color: theme.text }]}>{value}</Text>
      <Text style={[typography.caption, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[typography.overline, { color: theme.textMuted }]}>{sublabel}</Text>
    </View>
  );
}

// === Utility Functions ===

function calculateReadiness(summary: ClaimSummary): number {
  let score = 0;
  const maxScore = 100;

  // Profile exists (10 pts)
  if (summary.profile) score += 10;

  // Duty stations (15 pts)
  if (summary.dutyStations.length > 0) score += 10;
  if (summary.dutyStations.length >= 2) score += 5;

  // Appointments (25 pts)
  if (summary.appointments.length > 0) score += 5;
  if (summary.appointments.length >= 3) score += 5;
  if (summary.appointments.length >= 10) score += 5;
  if (summary.serviceConnectedAppointments > 0) score += 10;

  // Deployments (15 pts)
  if (summary.deployments.length > 0) score += 10;
  if (summary.uniqueHazards.length > 0) score += 5;

  // Conditions (20 pts)
  if (summary.conditions.length > 0) score += 10;
  if (summary.conditions.filter((c) => c.serviceConnected).length > 0) score += 10;

  // Attachments (15 pts)
  if (summary.totalAttachments > 0) score += 5;
  if (summary.totalAttachments >= 3) score += 5;
  if (summary.totalAttachments >= 10) score += 5;

  return Math.min(score, maxScore);
}

function getScoreColor(score: number, theme: any): string {
  if (score >= 75) return theme.success;
  if (score >= 50) return theme.info;
  if (score >= 25) return theme.warning;
  return theme.error;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
  },
  readinessCard: {},
  readinessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  scoreContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  section: {
    marginBottom: spacing.lg,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryTile: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  claimedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  hazardList: {
    gap: spacing.sm,
  },
  hazardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
