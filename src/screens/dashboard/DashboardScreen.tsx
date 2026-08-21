// ============================================================================
// EVENTUALLY.VET - Dashboard Screen
// Main home screen with service overview, stats, and quick actions
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';
import { Card } from '../../components/common/Card';
import { database } from '../../services/database';
import { UserProfile, MedicalAppointment, Deployment, DutyStation } from '../../models/types';
import { calculateServiceLength, formatDate } from '../../utils/dates';

interface DashboardStats {
  totalAppointments: number;
  totalDeployments: number;
  totalDutyStations: number;
  totalConditions: number;
  serviceConnectedConditions: number;
  claimedConditions: number;
}

export function DashboardScreen({ navigation }: any) {
  const { theme, branchInfo } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAppointments, setRecentAppointments] = useState<MedicalAppointment[]>([]);
  const [currentStation, setCurrentStation] = useState<DutyStation | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    try {
      const userProfile = await database.getUserProfile();
      setProfile(userProfile);

      if (userProfile) {
        const dashStats = await database.getStats(userProfile.id);
        setStats(dashStats);

        const appointments = await database.getAppointments(userProfile.id);
        setRecentAppointments(appointments.slice(0, 3));

        const stations = await database.getDutyStations(userProfile.id);
        const current = stations.find((s) => s.isCurrent);
        setCurrentStation(current || null);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  if (!profile) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[typography.overline, { color: theme.primary }]}>
                {branchInfo?.shortName?.toUpperCase() || 'SERVICE'}
              </Text>
              <Text style={[typography.h2, { color: theme.text }]}>
                {profile.rank ? `${profile.rank} ` : ''}{profile.lastName}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.profileButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="person-circle" size={28} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* Service Banner */}
          <View style={[styles.serviceBanner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.serviceBannerRow}>
              <View style={styles.serviceInfo}>
                <Ionicons name={branchInfo?.icon as any || 'shield'} size={20} color={theme.primary} />
                <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>
                  {branchInfo?.name || 'United States Military'}
                </Text>
              </View>
              <Text style={[typography.bodySmall, { color: theme.accent }]}>
                {calculateServiceLength(profile.serviceStartDate, profile.serviceEndDate)}
              </Text>
            </View>
            {currentStation && (
              <View style={[styles.stationRow, { borderTopColor: theme.border }]}>
                <Ionicons name="location" size={16} color={theme.textMuted} />
                <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>
                  {currentStation.name} — {currentStation.unit}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="medical"
            label="Appointments"
            value={stats?.totalAppointments || 0}
            color={theme.info}
            theme={theme}
            onPress={() => navigation.navigate('Appointments')}
          />
          <StatCard
            icon="globe"
            label="Deployments"
            value={stats?.totalDeployments || 0}
            color={theme.warning}
            theme={theme}
            onPress={() => navigation.navigate('Deployments')}
          />
          <StatCard
            icon="business"
            label="Duty Stations"
            value={stats?.totalDutyStations || 0}
            color={theme.success}
            theme={theme}
            onPress={() => navigation.navigate('DutyStations')}
          />
          <StatCard
            icon="fitness"
            label="Conditions"
            value={stats?.totalConditions || 0}
            color={theme.error}
            theme={theme}
            onPress={() => navigation.navigate('Conditions')}
          />
        </View>

        {/* VA Claim Readiness */}
        <Card style={{ marginHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <View style={styles.claimHeader}>
            <View style={styles.claimHeaderLeft}>
              <Ionicons name="document-text" size={24} color={theme.primary} />
              <Text style={[typography.h4, { color: theme.text }]}>VA Claim Readiness</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('VAClaim')}>
              <Text style={[typography.buttonSmall, { color: theme.primary }]}>VIEW</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.claimStats}>
            <ClaimStat
              label="Conditions Tracked"
              value={stats?.totalConditions || 0}
              theme={theme}
            />
            <ClaimStat
              label="Service-Connected"
              value={stats?.serviceConnectedConditions || 0}
              theme={theme}
            />
            <ClaimStat
              label="Claimed"
              value={stats?.claimedConditions || 0}
              theme={theme}
            />
          </View>
          {(stats?.totalConditions || 0) === 0 && (
            <Text style={[typography.bodySmall, { color: theme.textMuted, marginTop: spacing.sm }]}>
              Start tracking conditions to build your claim evidence.
            </Text>
          )}
        </Card>

        {/* Recent Appointments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[typography.h4, { color: theme.text }]}>Recent Appointments</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Appointments')}>
              <Text style={[typography.buttonSmall, { color: theme.primary }]}>SEE ALL</Text>
            </TouchableOpacity>
          </View>

          {recentAppointments.length === 0 ? (
            <Card style={{ marginHorizontal: spacing.lg }}>
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color={theme.textMuted} />
                <Text style={[typography.body, { color: theme.textMuted, marginTop: spacing.sm }]}>
                  No appointments yet
                </Text>
                <Text style={[typography.bodySmall, { color: theme.textMuted, textAlign: 'center' }]}>
                  Add your medical appointments or import from your calendar
                </Text>
              </View>
            </Card>
          ) : (
            <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
              {recentAppointments.map((apt) => (
                <Card
                  key={apt.id}
                  onPress={() => navigation.navigate('AppointmentDetail', { id: apt.id })}
                >
                  <View style={styles.appointmentRow}>
                    <View style={[styles.appointmentIcon, { backgroundColor: theme.primary + '20' }]}>
                      <Ionicons name="medical" size={18} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.bodyBold, { color: theme.text }]} numberOfLines={1}>
                        {apt.title}
                      </Text>
                      <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>
                        {apt.provider} • {formatDate(apt.date)}
                      </Text>
                    </View>
                    {apt.relatedToService && (
                      <View style={[styles.scBadge, { backgroundColor: theme.warning + '20' }]}>
                        <Text style={[typography.overline, { color: theme.warning }]}>SC</Text>
                      </View>
                    )}
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={[styles.section, { marginBottom: spacing.xxl }]}>
          <Text style={[typography.h4, { color: theme.text, paddingHorizontal: spacing.lg }]}>
            Quick Actions
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActions}
          >
            <QuickActionButton
              icon="add-circle"
              label="New Appointment"
              theme={theme}
              onPress={() => navigation.navigate('AddAppointment')}
            />
            <QuickActionButton
              icon="calendar"
              label="Import Calendar"
              theme={theme}
              onPress={() => navigation.navigate('CalendarImport')}
            />
            <QuickActionButton
              icon="globe"
              label="Add Deployment"
              theme={theme}
              onPress={() => navigation.navigate('AddDeployment')}
            />
            <QuickActionButton
              icon="business"
              label="Add Duty Station"
              theme={theme}
              onPress={() => navigation.navigate('AddDutyStation')}
            />
            <QuickActionButton
              icon="fitness"
              label="Track Condition"
              theme={theme}
              onPress={() => navigation.navigate('AddCondition')}
            />
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

// === Sub-components ===

function StatCard({
  icon,
  label,
  value,
  color,
  theme,
  onPress,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
  theme: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon as any} size={22} color={color} />
      <Text style={[typography.h2, { color: theme.text, marginTop: spacing.xs }]}>
        {value}
      </Text>
      <Text style={[typography.caption, { color: theme.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ClaimStat({ label, value, theme }: { label: string; value: number; theme: any }) {
  return (
    <View style={styles.claimStatItem}>
      <Text style={[typography.h3, { color: theme.text }]}>{value}</Text>
      <Text style={[typography.caption, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

function QuickActionButton({
  icon,
  label,
  theme,
  onPress,
}: {
  icon: string;
  label: string;
  theme: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.quickAction, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: theme.primary + '20' }]}>
        <Ionicons name={icon as any} size={24} color={theme.primary} />
      </View>
      <Text style={[typography.caption, { color: theme.textSecondary, textAlign: 'center' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
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
    paddingBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  serviceBanner: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  serviceBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  claimHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  claimStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  claimStatItem: {
    alignItems: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  appointmentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  quickActions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  quickAction: {
    width: 100,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    gap: spacing.sm,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
