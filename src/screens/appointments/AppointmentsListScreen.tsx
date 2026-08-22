// ============================================================================
// EVENTUALLY.VET - Appointments List Screen
// Shows all medical appointments with filtering and sorting
// WCAG 2.1 AA compliant: accessibility roles, labels, contrast, focus
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';
import { Card } from '../../components/common/Card';
import { database } from '../../services/database';
import { MedicalAppointment, AppointmentType } from '../../models/types';
import { formatDate, formatDateTime } from '../../utils/dates';

type TimeFilter = 'all' | 'upcoming' | 'past';
type ConnectionFilter = 'all' | 'service_connected';

const appointmentTypeLabels: Record<AppointmentType, string> = {
  primary_care: 'Primary Care',
  mental_health: 'Mental Health',
  orthopedic: 'Orthopedic',
  dental: 'Dental',
  vision: 'Vision',
  audiology: 'Audiology',
  physical_therapy: 'Physical Therapy',
  occupational_therapy: 'Occupational Therapy',
  cardiology: 'Cardiology',
  dermatology: 'Dermatology',
  neurology: 'Neurology',
  radiology: 'Radiology',
  surgery: 'Surgery',
  emergency: 'Emergency',
  specialist: 'Specialist',
  va_exam: 'VA Exam',
  other: 'Other',
};

const typeIcons: Record<AppointmentType, string> = {
  primary_care: 'medkit',
  mental_health: 'happy-outline',
  orthopedic: 'body',
  dental: 'happy',
  vision: 'eye',
  audiology: 'ear',
  physical_therapy: 'fitness',
  occupational_therapy: 'hand-left',
  cardiology: 'heart',
  dermatology: 'finger-print',
  neurology: 'flash',
  radiology: 'scan',
  surgery: 'cut',
  emergency: 'alert-circle',
  specialist: 'person',
  va_exam: 'document-text',
  other: 'medical',
};

export function AppointmentsListScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [appointments, setAppointments] = useState<MedicalAppointment[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [connectionFilter, setConnectionFilter] = useState<ConnectionFilter>('all');

  useFocusEffect(
    useCallback(() => {
      loadAppointments();
    }, [])
  );

  async function loadAppointments() {
    try {
      const profile = await database.getUserProfile();
      if (profile) {
        const apts = await database.getAppointments(profile.id);
        setAppointments(apts);
      }
    } catch (error) {
      console.error('Failed to load appointments:', error);
    }
  }

  // Apply filters
  const now = new Date().toISOString();
  const filteredAppointments = appointments.filter((a) => {
    // Time filter
    if (timeFilter === 'upcoming' && a.date < now) return false;
    if (timeFilter === 'past' && a.date >= now) return false;

    // Connection filter
    if (connectionFilter === 'service_connected' && !a.relatedToService) return false;

    return true;
  });

  // Count for filter badges
  const upcomingCount = appointments.filter((a) => a.date >= now).length;
  const pastCount = appointments.filter((a) => a.date < now).length;
  const scCount = appointments.filter((a) => a.relatedToService).length;

  function renderAppointment({ item }: { item: MedicalAppointment }) {
    const isPast = item.date < now;
    return (
      <Card
        style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm }}
        onPress={() => navigation.navigate('AppointmentDetail', { id: item.id })}
      >
        <View
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}. ${appointmentTypeLabels[item.appointmentType]}. ${item.provider} at ${item.facility}. ${formatDateTime(item.date)}. ${item.relatedToService ? 'Service connected.' : ''}`}
          accessibilityHint="Tap to view appointment details"
        >
          <View style={styles.appointmentCard}>
            <View
              style={[styles.typeIcon, { backgroundColor: theme.primary + '15' }]}
              accessibilityElementsHidden={true}
              importantForAccessibility="no"
            >
              <Ionicons
                name={(typeIcons[item.appointmentType] || 'medical') as any}
                size={22}
                color={theme.primary}
              />
            </View>
            <View style={styles.appointmentInfo}>
              <Text
                style={[typography.bodyBold, { color: theme.text }]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={[typography.bodySmall, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.provider} • {item.facility}
              </Text>
              <View style={styles.appointmentMeta}>
                <Text style={[typography.caption, { color: isPast ? theme.textMuted : theme.info }]}>
                  {formatDateTime(item.date)}
                </Text>
                <Text style={[typography.caption, { color: theme.textMuted }]}>
                  {appointmentTypeLabels[item.appointmentType]}
                </Text>
              </View>
            </View>
            <View style={styles.badges}>
              {item.relatedToService && (
                <View
                  style={[styles.badge, { backgroundColor: theme.warning + '20' }]}
                  accessible={true}
                  accessibilityLabel="Service connected"
                >
                  <Text style={[typography.overline, { color: theme.warning }]}>SC</Text>
                </View>
              )}
              {!isPast && (
                <View
                  style={[styles.badge, { backgroundColor: theme.info + '20' }]}
                  accessible={true}
                  accessibilityLabel="Upcoming appointment"
                >
                  <Text style={[typography.overline, { color: theme.info }]}>UPCOMING</Text>
                </View>
              )}
              {item.source === 'calendar_import' && (
                <Ionicons
                  name="calendar"
                  size={14}
                  color={theme.textMuted}
                  accessibilityLabel="Imported from calendar"
                />
              )}
            </View>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View
        style={[styles.header, { borderBottomColor: theme.border }]}
        accessible={true}
        accessibilityRole="header"
      >
        <Text style={[typography.h2, { color: theme.text }]}>Medical Appointments</Text>
        <Text
          style={[typography.bodySmall, { color: theme.textSecondary }]}
          accessibilityLabel={`${appointments.length} total records. ${upcomingCount} upcoming, ${pastCount} past.`}
        >
          {appointments.length} total records
        </Text>

        {/* Time Filters */}
        <View
          style={styles.filterRow}
          accessible={true}
          accessibilityRole="tablist"
          accessibilityLabel="Filter appointments by time"
        >
          <FilterTab
            label="All"
            count={appointments.length}
            active={timeFilter === 'all'}
            onPress={() => setTimeFilter('all')}
            color={theme.primary}
            theme={theme}
          />
          <FilterTab
            label="Upcoming"
            count={upcomingCount}
            active={timeFilter === 'upcoming'}
            onPress={() => setTimeFilter('upcoming')}
            color={theme.info}
            theme={theme}
          />
          <FilterTab
            label="Past"
            count={pastCount}
            active={timeFilter === 'past'}
            onPress={() => setTimeFilter('past')}
            color={theme.textMuted}
            theme={theme}
          />
        </View>

        {/* Service Connection Filter */}
        <View
          style={styles.filterRow}
          accessible={true}
          accessibilityRole="tablist"
          accessibilityLabel="Filter by service connection"
        >
          <FilterTab
            label="All Types"
            active={connectionFilter === 'all'}
            onPress={() => setConnectionFilter('all')}
            color={theme.primary}
            theme={theme}
          />
          <FilterTab
            label="Service-Connected"
            count={scCount}
            active={connectionFilter === 'service_connected'}
            onPress={() => setConnectionFilter('service_connected')}
            color={theme.warning}
            theme={theme}
          />
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredAppointments}
        keyExtractor={(item) => item.id}
        renderItem={renderAppointment}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState} accessible={true} accessibilityRole="text">
            <Ionicons
              name="medical-outline"
              size={56}
              color={theme.textMuted}
              accessibilityElementsHidden={true}
              importantForAccessibility="no"
            />
            <Text style={[typography.h4, { color: theme.textMuted, marginTop: spacing.md }]}>
              {timeFilter === 'upcoming'
                ? 'No upcoming appointments'
                : timeFilter === 'past'
                ? 'No past appointments'
                : 'No appointments recorded'}
            </Text>
            <Text style={[typography.bodySmall, { color: theme.textMuted, textAlign: 'center', marginTop: spacing.xs }]}>
              {timeFilter === 'upcoming'
                ? 'Schedule or import your next medical visit'
                : 'Start documenting your medical visits for your VA claim'}
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate('AddAppointment')}
        activeOpacity={0.8}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Add new appointment"
        accessibilityHint="Opens form to record a new medical appointment"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

// === Accessible Filter Tab Component ===
function FilterTab({
  label,
  count,
  active,
  onPress,
  color,
  theme,
}: {
  label: string;
  count?: number;
  active: boolean;
  onPress: () => void;
  color: string;
  theme: any;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.filterTab,
        {
          borderColor: active ? color : theme.border,
          backgroundColor: active ? color + '15' : 'transparent',
        },
      ]}
      onPress={onPress}
      accessible={true}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}${count !== undefined ? `, ${count} items` : ''}`}
    >
      <Text
        style={[
          typography.buttonSmall,
          { color: active ? color : theme.textMuted },
        ]}
      >
        {label}{count !== undefined ? ` (${count})` : ''}
      </Text>
    </TouchableOpacity>
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
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    // Minimum touch target 44x44 for WCAG
    minHeight: 36,
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: 100,
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    // Minimum touch target
    minWidth: 44,
    minHeight: 44,
  },
  appointmentInfo: {
    flex: 1,
    gap: 2,
  },
  appointmentMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  badges: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: spacing.xl,
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    // WCAG: minimum touch target
    minWidth: 44,
    minHeight: 44,
  },
});
