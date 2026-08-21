// ============================================================================
// EVENTUALLY.VET - Appointment Detail Screen
// Full view of a single appointment with all its data
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { database } from '../../services/database';
import { MedicalAppointment, Note, Attachment } from '../../models/types';
import { formatDateTime } from '../../utils/dates';

export function AppointmentDetailScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { id } = route.params;
  const [appointment, setAppointment] = useState<MedicalAppointment | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    const apt = await database.getAppointmentById(id);
    setAppointment(apt);

    const notesList = await database.getNotes(id, 'appointment');
    setNotes(notesList);

    const attachList = await database.getAttachments(id, 'appointment');
    setAttachments(attachList);
  }

  function handleDelete() {
    Alert.alert(
      'Delete Appointment',
      'Are you sure? This will permanently delete this appointment record, all notes, and attachments.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await database.deleteAppointment(id);
            navigation.goBack();
          },
        },
      ]
    );
  }

  if (!appointment) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddAppointment', { id: appointment.id })}
          >
            <Ionicons name="create-outline" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title & Date */}
        <View style={styles.titleSection}>
          <Text style={[typography.h2, { color: theme.text }]}>{appointment.title}</Text>
          <Text style={[typography.body, { color: theme.textSecondary, marginTop: spacing.xs }]}>
            {formatDateTime(appointment.date)}
          </Text>
          {appointment.relatedToService && (
            <View style={[styles.scBanner, { backgroundColor: theme.warning + '15', borderColor: theme.warning + '40' }]}>
              <Ionicons name="alert-circle" size={18} color={theme.warning} />
              <Text style={[typography.bodySmall, { color: theme.warning, fontWeight: '600' }]}>
                Marked as Service-Connected
              </Text>
              {appointment.relatedCondition && (
                <Text style={[typography.caption, { color: theme.warning }]}>
                  — {appointment.relatedCondition}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Provider & Facility */}
        <Card style={{ margin: spacing.lg }}>
          <DetailRow icon="person" label="Provider" value={appointment.provider} theme={theme} />
          <DetailRow icon="business" label="Facility" value={appointment.facility} theme={theme} />
          {appointment.facilityAddress && (
            <DetailRow icon="location" label="Address" value={appointment.facilityAddress} theme={theme} />
          )}
        </Card>

        {/* Clinical Details */}
        <Card style={{ marginHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <Text style={[typography.label, { color: theme.primary, marginBottom: spacing.md }]}>
            CLINICAL DETAILS
          </Text>
          <DetailBlock label="Chief Complaint" value={appointment.chiefComplaint} theme={theme} />
          {appointment.diagnosis && (
            <DetailBlock label="Diagnosis" value={appointment.diagnosis} theme={theme} />
          )}
          {appointment.treatmentPlan && (
            <DetailBlock label="Treatment Plan" value={appointment.treatmentPlan} theme={theme} />
          )}
          {appointment.medications && (
            <DetailBlock label="Medications" value={appointment.medications} theme={theme} />
          )}
          {appointment.followUpRequired && (
            <View style={[styles.followUpBanner, { backgroundColor: theme.info + '15' }]}>
              <Ionicons name="calendar" size={16} color={theme.info} />
              <Text style={[typography.bodySmall, { color: theme.info }]}>
                Follow-up: {appointment.followUpDate || 'Date not set'}
              </Text>
            </View>
          )}
        </Card>

        {/* Notes */}
        {appointment.notes ? (
          <Card style={{ marginHorizontal: spacing.lg, marginBottom: spacing.lg }}>
            <Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.sm }]}>
              NOTES
            </Text>
            <Text style={[typography.body, { color: theme.text }]}>{appointment.notes}</Text>
          </Card>
        ) : null}

        {/* Additional Notes */}
        {notes.length > 0 && (
          <View style={{ marginHorizontal: spacing.lg, marginBottom: spacing.lg }}>
            <Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.sm }]}>
              ADDITIONAL NOTES ({notes.length})
            </Text>
            {notes.map((note) => (
              <Card key={note.id} style={{ marginBottom: spacing.sm }}>
                <Text style={[typography.bodyBold, { color: theme.text }]}>{note.title}</Text>
                <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>{note.content}</Text>
              </Card>
            ))}
          </View>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <View style={{ marginHorizontal: spacing.lg, marginBottom: spacing.lg }}>
            <Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.sm }]}>
              ATTACHMENTS ({attachments.length})
            </Text>
            {attachments.map((att) => (
              <Card key={att.id} style={{ marginBottom: spacing.sm }}>
                <View style={styles.attachmentRow}>
                  <Ionicons name="document-attach" size={20} color={theme.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodySmall, { color: theme.text }]}>{att.fileName}</Text>
                    <Text style={[typography.caption, { color: theme.textMuted }]}>{att.fileType}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xxl, gap: spacing.sm }}>
          <Button
            title="Add Note"
            onPress={() => navigation.navigate('AddNote', { parentId: id, parentType: 'appointment' })}
            variant="outline"
            icon={<Ionicons name="create" size={18} color={theme.primary} />}
          />
          <Button
            title="Add Attachment"
            onPress={() => navigation.navigate('AddAttachment', { parentId: id, parentType: 'appointment' })}
            variant="outline"
            icon={<Ionicons name="attach" size={18} color={theme.primary} />}
          />
          <Button
            title="Delete Appointment"
            onPress={handleDelete}
            variant="ghost"
            textStyle={{ color: theme.error }}
            icon={<Ionicons name="trash" size={18} color={theme.error} />}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  theme,
}: {
  icon: string;
  label: string;
  value: string;
  theme: any;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon as any} size={18} color={theme.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={[typography.caption, { color: theme.textMuted }]}>{label}</Text>
        <Text style={[typography.body, { color: theme.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function DetailBlock({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={styles.detailBlock}>
      <Text style={[typography.caption, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[typography.body, { color: theme.text }]}>{value}</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingBottom: 40,
  },
  titleSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  scBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  detailBlock: {
    marginBottom: spacing.md,
  },
  followUpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
