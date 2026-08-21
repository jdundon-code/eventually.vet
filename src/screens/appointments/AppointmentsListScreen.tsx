// ============================================================================
// EVENTUALLY.VET - Appointments List Screen
// Shows all medical appointments with filtering and sorting
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';
import { Card } from '../../components/common/Card';
import { database } from '../../services/database';
import { MedicalAppointment, AppointmentType } from '../../models/types';
import { formatDate, formatDateTime } from '../../utils/dates';

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
  mental_health: 'brain',
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
  const [filter, setFilter] = useState<'all' | 'service_connected'>('all');

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

  const filteredAppointments =
    filter === 'service_connected'
      ? appointments.filter((a) => a.relatedToService)
      : appointments;

  function renderAppointment({ item }: { item: MedicalAppointment }) {
    return (
      <Card
        style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm }}
        onPress={() => navigation.navigate('AppointmentDetail', { id: item.id })}
      >
        <View style={styles.appointmentCard}>
          <View style={[styles.typeIcon, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons
              name={(typeIcons[item.appointmentType] || 'medical') as any}
              size={22}
              color={theme.primary}
            />
          </View>
          <View style={styles.appointmentInfo}>
            <Text style={[typography.bodyBold, { color: theme.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[typography.bodySmall, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.provider} • {item.facility}
            </Text>
            <View style={styles.appointmentMeta}>
              <Text style={[typography.caption, { color: theme.textMuted }]}>
                {formatDateTime(item.date)}
              </Text>
              <Text style={[typography.caption, { color: theme.textMuted }]}>
                {appointmentTypeLabels[item.appointmentType]}
              </Text>
            </View>
          </View>
          <View style={styles.badges}>
            {item.relatedToService && (
              <View style={[styles.badge, { backgroundColor: theme.warning + '20' }]}>
                <Text style={[typography.overline, { color: theme.warning }]}>SC</Text>
              </View>
            )}
            {item.source === 'calendar_import' && (
              <Ionicons name="calendar" size={14} color={theme.textMuted} />
            )}
          </View>
        </View>
      </Card>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[typography.h2, { color: theme.text }]}>Medical Appointments</Text>
        <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>
          {appointments.length} total record{appointments.length !== 1 ? 's' : ''}
        </Text>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterTab,
              { borderColor: filter === 'all' ? theme.primary : theme.border },
              filter === 'all' && { backgroundColor: theme.primary + '15' },
            ]}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[
                typography.buttonSmall,
                { color: filter === 'all' ? theme.primary : theme.textMuted },
              ]}
            >
              All ({appointments.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              { borderColor: filter === 'service_connected' ? theme.warning : theme.border },
              filter === 'service_connected' && { backgroundColor: theme.warning + '15' },
            ]}
            onPress={() => setFilter('service_connected')}
          >
            <Text
              style={[
                typography.buttonSmall,
                {
                  color:
                    filter === 'service_connected' ? theme.warning : theme.textMuted,
                },
              ]}
            >
              Service-Connected ({appointments.filter((a) => a.relatedToService).length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredAppointments}
        keyExtractor={(item) => item.id}
        renderItem={renderAppointment}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="medical-outline" size={56} color={theme.textMuted} />
            <Text style={[typography.h4, { color: theme.textMuted, marginTop: spacing.md }]}>
              No appointments recorded
            </Text>
            <Text style={[typography.bodySmall, { color: theme.textMuted, textAlign: 'center', marginTop: spacing.xs }]}>
              Start documenting your medical visits for your VA claim
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate('AddAppointment')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
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
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
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
  },
});
