// ============================================================================
// EVENTUALLY.VET - Add/Edit Appointment Screen
// Full form for entering medical appointment details
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { database } from '../../services/database';
import { MedicalAppointment, AppointmentType } from '../../models/types';
import { generateId } from '../../utils/uuid';
import { getNowISO } from '../../utils/dates';

const appointmentTypes: { value: AppointmentType; label: string }[] = [
  { value: 'primary_care', label: 'Primary Care' },
  { value: 'mental_health', label: 'Mental Health' },
  { value: 'orthopedic', label: 'Orthopedic' },
  { value: 'dental', label: 'Dental' },
  { value: 'vision', label: 'Vision' },
  { value: 'audiology', label: 'Audiology' },
  { value: 'physical_therapy', label: 'Physical Therapy' },
  { value: 'occupational_therapy', label: 'Occupational Therapy' },
  { value: 'cardiology', label: 'Cardiology' },
  { value: 'dermatology', label: 'Dermatology' },
  { value: 'neurology', label: 'Neurology' },
  { value: 'radiology', label: 'Radiology' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'specialist', label: 'Specialist' },
  { value: 'va_exam', label: 'VA C&P Exam' },
  { value: 'other', label: 'Other' },
];

interface AddAppointmentScreenProps {
  navigation: any;
  route?: { params?: { id?: string; prefill?: Partial<MedicalAppointment> } };
}

export function AddAppointmentScreen({ navigation, route }: AddAppointmentScreenProps) {
  const { theme } = useTheme();
  const editId = route?.params?.id;
  const prefill = route?.params?.prefill;
  const isEdit = !!editId;

  const [title, setTitle] = useState(prefill?.title || '');
  const [appointmentType, setAppointmentType] = useState<AppointmentType>(
    prefill?.appointmentType || 'primary_care'
  );
  const [provider, setProvider] = useState(prefill?.provider || '');
  const [facility, setFacility] = useState(prefill?.facility || '');
  const [facilityAddress, setFacilityAddress] = useState(prefill?.facilityAddress || '');
  const [date, setDate] = useState(prefill?.date || '');
  const [chiefComplaint, setChiefComplaint] = useState(prefill?.chiefComplaint || '');
  const [diagnosis, setDiagnosis] = useState(prefill?.diagnosis || '');
  const [treatmentPlan, setTreatmentPlan] = useState(prefill?.treatmentPlan || '');
  const [medications, setMedications] = useState(prefill?.medications || '');
  const [followUpRequired, setFollowUpRequired] = useState(prefill?.followUpRequired || false);
  const [followUpDate, setFollowUpDate] = useState(prefill?.followUpDate || '');
  const [relatedToService, setRelatedToService] = useState(prefill?.relatedToService || false);
  const [relatedCondition, setRelatedCondition] = useState(prefill?.relatedCondition || '');
  const [notes, setNotes] = useState(prefill?.notes || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editId) {
      loadAppointment(editId);
    }
  }, [editId]);

  async function loadAppointment(id: string) {
    const apt = await database.getAppointmentById(id);
    if (apt) {
      setTitle(apt.title);
      setAppointmentType(apt.appointmentType);
      setProvider(apt.provider);
      setFacility(apt.facility);
      setFacilityAddress(apt.facilityAddress || '');
      setDate(apt.date);
      setChiefComplaint(apt.chiefComplaint);
      setDiagnosis(apt.diagnosis || '');
      setTreatmentPlan(apt.treatmentPlan || '');
      setMedications(apt.medications || '');
      setFollowUpRequired(apt.followUpRequired);
      setFollowUpDate(apt.followUpDate || '');
      setRelatedToService(apt.relatedToService);
      setRelatedCondition(apt.relatedCondition || '');
      setNotes(apt.notes);
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Required';
    if (!provider.trim()) newErrors.provider = 'Required';
    if (!facility.trim()) newErrors.facility = 'Required';
    if (!date.trim()) {
      newErrors.date = 'Required';
    } else if (!/^\d{4}-\d{2}-\d{2}/.test(date)) {
      newErrors.date = 'Use YYYY-MM-DD format';
    }
    if (!chiefComplaint.trim()) newErrors.chiefComplaint = 'Required - describe why you went';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;

    setSaving(true);
    try {
      const profile = await database.getUserProfile();
      if (!profile) {
        Alert.alert('Error', 'Profile not found');
        return;
      }

      const appointment: MedicalAppointment = {
        id: editId || generateId(),
        userId: profile.id,
        title: title.trim(),
        appointmentType,
        provider: provider.trim(),
        facility: facility.trim(),
        facilityAddress: facilityAddress.trim() || undefined,
        date: date.includes('T') ? date : `${date}T09:00:00.000Z`,
        chiefComplaint: chiefComplaint.trim(),
        diagnosis: diagnosis.trim() || undefined,
        treatmentPlan: treatmentPlan.trim() || undefined,
        medications: medications.trim() || undefined,
        followUpRequired,
        followUpDate: followUpDate.trim() || undefined,
        relatedToService,
        relatedCondition: relatedCondition.trim() || undefined,
        source: 'manual',
        notes: notes.trim(),
        createdAt: isEdit ? date : getNowISO(),
        updatedAt: getNowISO(),
      };

      await database.saveAppointment(appointment);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save appointment. Please try again.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: theme.text }]}>
            {isEdit ? 'Edit Appointment' : 'New Appointment'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        style={styles.form}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Basic Info */}
        <Text style={[typography.label, { color: theme.primary, marginBottom: spacing.md }]}>
          APPOINTMENT DETAILS
        </Text>

        <Input
          label="Title / Reason"
          value={title}
          onChangeText={setTitle}
          placeholder="Annual physical, knee pain follow-up..."
          required
          error={errors.title}
        />

        {/* Appointment Type */}
        <Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.sm }]}>
          TYPE *
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: spacing.md }}
          contentContainerStyle={{ gap: spacing.xs }}
        >
          {appointmentTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeChip,
                {
                  backgroundColor:
                    appointmentType === type.value ? theme.primary : theme.surface,
                  borderColor:
                    appointmentType === type.value ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setAppointmentType(type.value)}
            >
              <Text
                style={[
                  typography.caption,
                  {
                    color: appointmentType === type.value ? '#FFFFFF' : theme.textSecondary,
                    fontWeight: appointmentType === type.value ? '700' : '400',
                  },
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Input
          label="Date"
          value={date}
          onChangeText={setDate}
          placeholder="2024-03-15"
          required
          error={errors.date}
          keyboardType="numbers-and-punctuation"
        />

        <Input
          label="Provider / Doctor"
          value={provider}
          onChangeText={setProvider}
          placeholder="Dr. Smith"
          required
          error={errors.provider}
        />

        <Input
          label="Facility / Clinic"
          value={facility}
          onChangeText={setFacility}
          placeholder="Womack Army Medical Center"
          required
          error={errors.facility}
        />

        <Input
          label="Facility Address"
          value={facilityAddress}
          onChangeText={setFacilityAddress}
          placeholder="Optional - street address"
        />

        {/* Clinical Details */}
        <Text
          style={[
            typography.label,
            { color: theme.primary, marginBottom: spacing.md, marginTop: spacing.lg },
          ]}
        >
          CLINICAL INFORMATION
        </Text>

        <Input
          label="Chief Complaint / Reason for Visit"
          value={chiefComplaint}
          onChangeText={setChiefComplaint}
          placeholder="Describe why you went to this appointment..."
          multiline
          numberOfLines={3}
          required
          error={errors.chiefComplaint}
        />

        <Input
          label="Diagnosis"
          value={diagnosis}
          onChangeText={setDiagnosis}
          placeholder="What were you diagnosed with?"
          multiline
          numberOfLines={2}
        />

        <Input
          label="Treatment Plan"
          value={treatmentPlan}
          onChangeText={setTreatmentPlan}
          placeholder="Prescribed treatment, therapy, restrictions..."
          multiline
          numberOfLines={2}
        />

        <Input
          label="Medications"
          value={medications}
          onChangeText={setMedications}
          placeholder="List any medications prescribed"
          multiline
          numberOfLines={2}
        />

        {/* Follow-up */}
        <View style={[styles.switchRow, { borderColor: theme.border }]}>
          <View>
            <Text style={[typography.bodyBold, { color: theme.text }]}>Follow-Up Required</Text>
            <Text style={[typography.caption, { color: theme.textMuted }]}>
              Were you told to come back?
            </Text>
          </View>
          <Switch
            value={followUpRequired}
            onValueChange={setFollowUpRequired}
            trackColor={{ false: theme.border, true: theme.primary + '80' }}
            thumbColor={followUpRequired ? theme.primary : '#f4f3f4'}
          />
        </View>

        {followUpRequired && (
          <Input
            label="Follow-Up Date"
            value={followUpDate}
            onChangeText={setFollowUpDate}
            placeholder="2024-04-15"
            keyboardType="numbers-and-punctuation"
          />
        )}

        {/* Service Connection */}
        <Text
          style={[
            typography.label,
            { color: theme.warning, marginBottom: spacing.md, marginTop: spacing.lg },
          ]}
        >
          VA CLAIM RELEVANCE
        </Text>

        <View style={[styles.switchRow, { borderColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyBold, { color: theme.text }]}>
              Related to Military Service
            </Text>
            <Text style={[typography.caption, { color: theme.textMuted }]}>
              Could this be connected to your service?
            </Text>
          </View>
          <Switch
            value={relatedToService}
            onValueChange={setRelatedToService}
            trackColor={{ false: theme.border, true: theme.warning + '80' }}
            thumbColor={relatedToService ? theme.warning : '#f4f3f4'}
          />
        </View>

        {relatedToService && (
          <Input
            label="Related Condition"
            value={relatedCondition}
            onChangeText={setRelatedCondition}
            placeholder="e.g., Tinnitus, Lower back pain, PTSD"
          />
        )}

        {/* Notes */}
        <Input
          label="Additional Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Any additional details you want to remember..."
          multiline
          numberOfLines={4}
        />

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Button
          title={isEdit ? 'Update Appointment' : 'Save Appointment'}
          onPress={handleSave}
          variant="primary"
          size="large"
          loading={saving}
          style={{ width: '100%' }}
          icon={<Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />}
        />
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
  form: {
    flex: 1,
  },
  formContent: {
    padding: spacing.lg,
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
});
