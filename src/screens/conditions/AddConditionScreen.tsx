// ============================================================================
// EVENTUALLY.VET - Add Service Condition Screen
// Track conditions that may be service-connected for VA claims
// ============================================================================

import React, { useState } from 'react';
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
import { ServiceCondition } from '../../models/types';
import { generateId } from '../../utils/uuid';
import { getNowISO } from '../../utils/dates';

const conditionStatuses = [
  { value: 'active', label: 'Active' },
  { value: 'chronic', label: 'Chronic' },
  { value: 'worsening', label: 'Worsening' },
  { value: 'resolved', label: 'Resolved' },
] as const;

export function AddConditionScreen({ navigation }: any) {
  const { theme } = useTheme();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [onsetDate, setOnsetDate] = useState('');
  const [diagnosisDate, setDiagnosisDate] = useState('');
  const [currentStatus, setCurrentStatus] = useState<'active' | 'resolved' | 'chronic' | 'worsening'>('active');
  const [serviceConnected, setServiceConnected] = useState(true);
  const [vaClaimed, setVaClaimed] = useState(false);
  const [vaRatingPercent, setVaRatingPercent] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Required';
    if (!description.trim()) newErrors.description = 'Describe your symptoms';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;

    setSaving(true);
    try {
      const profile = await database.getUserProfile();
      if (!profile) return;

      const condition: ServiceCondition = {
        id: generateId(),
        userId: profile.id,
        name: name.trim(),
        description: description.trim(),
        onsetDate: onsetDate.trim() || undefined,
        diagnosisDate: diagnosisDate.trim() || undefined,
        currentStatus,
        serviceConnected,
        relatedDeploymentIds: [],
        relatedDutyStationIds: [],
        relatedAppointmentIds: [],
        vaClaimed,
        vaRatingPercent: vaRatingPercent ? parseInt(vaRatingPercent) : undefined,
        notes: notes.trim(),
        createdAt: getNowISO(),
        updatedAt: getNowISO(),
      };

      await database.saveCondition(condition);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save condition.');
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
          <Text style={[typography.h3, { color: theme.text }]}>Track Condition</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        style={styles.form}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[typography.label, { color: theme.primary, marginBottom: spacing.md }]}>
          CONDITION DETAILS
        </Text>

        <Input
          label="Condition Name"
          value={name}
          onChangeText={setName}
          placeholder="Tinnitus, Lower Back Pain, PTSD, Knee Injury..."
          required
          error={errors.name}
        />

        <Input
          label="Description of Symptoms"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your symptoms in detail — when they occur, severity, how they affect daily life..."
          multiline
          numberOfLines={4}
          required
          error={errors.description}
        />

        {/* Status */}
        <Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.sm }]}>
          CURRENT STATUS
        </Text>
        <View style={styles.statusRow}>
          {conditionStatuses.map((s) => (
            <TouchableOpacity
              key={s.value}
              style={[
                styles.statusChip,
                {
                  backgroundColor: currentStatus === s.value ? theme.primary : theme.surface,
                  borderColor: currentStatus === s.value ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setCurrentStatus(s.value)}
            >
              <Text
                style={[
                  typography.buttonSmall,
                  { color: currentStatus === s.value ? '#FFFFFF' : theme.textSecondary },
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dates */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input
              label="Symptom Onset Date"
              value={onsetDate}
              onChangeText={setOnsetDate}
              placeholder="2020-03-01"
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Diagnosis Date"
              value={diagnosisDate}
              onChangeText={setDiagnosisDate}
              placeholder="2020-05-15"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        {/* Service Connection */}
        <Text
          style={[typography.label, { color: theme.warning, marginBottom: spacing.md, marginTop: spacing.lg }]}
        >
          VA CLAIM STATUS
        </Text>

        <View style={[styles.switchRow, { borderColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyBold, { color: theme.text }]}>
              Service-Connected
            </Text>
            <Text style={[typography.caption, { color: theme.textMuted }]}>
              Believe this is related to military service
            </Text>
          </View>
          <Switch
            value={serviceConnected}
            onValueChange={setServiceConnected}
            trackColor={{ false: theme.border, true: theme.warning + '80' }}
            thumbColor={serviceConnected ? theme.warning : '#f4f3f4'}
          />
        </View>

        <View style={[styles.switchRow, { borderColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyBold, { color: theme.text }]}>
              Already Claimed with VA
            </Text>
            <Text style={[typography.caption, { color: theme.textMuted }]}>
              Have you filed this condition?
            </Text>
          </View>
          <Switch
            value={vaClaimed}
            onValueChange={setVaClaimed}
            trackColor={{ false: theme.border, true: theme.success + '80' }}
            thumbColor={vaClaimed ? theme.success : '#f4f3f4'}
          />
        </View>

        {vaClaimed && (
          <Input
            label="VA Rating Percentage"
            value={vaRatingPercent}
            onChangeText={setVaRatingPercent}
            placeholder="10, 30, 50..."
            keyboardType="number-pad"
          />
        )}

        <Input
          label="Additional Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Any additional context — what caused it, buddy statements, nexus..."
          multiline
          numberOfLines={3}
        />

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Button
          title="Save Condition"
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
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statusChip: {
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
    marginBottom: spacing.sm,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
});
