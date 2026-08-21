// ============================================================================
// EVENTUALLY.VET - Add/Edit Deployment Screen
// Form for documenting deployment details including hazards
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
import { Deployment, DeploymentStatus } from '../../models/types';
import { generateId } from '../../utils/uuid';
import { getNowISO } from '../../utils/dates';

const commonHazards = [
  'Burn Pits',
  'Agent Orange',
  'Depleted Uranium',
  'Radiation',
  'Asbestos',
  'Lead Paint',
  'Noise Exposure',
  'Chemical Agents',
  'Contaminated Water',
  'Sand/Dust',
  'Extreme Heat',
  'Extreme Cold',
  'High Altitude',
  'PFAS/AFFF',
  'Industrial Chemicals',
  'Oil Well Fires',
];

const deploymentStatuses: { value: DeploymentStatus; label: string }[] = [
  { value: 'completed', label: 'Completed' },
  { value: 'active', label: 'Active' },
  { value: 'planned', label: 'Planned' },
];

interface AddDeploymentScreenProps {
  navigation: any;
  route?: { params?: { id?: string } };
}

export function AddDeploymentScreen({ navigation, route }: AddDeploymentScreenProps) {
  const { theme } = useTheme();
  const editId = route?.params?.id;
  const isEdit = !!editId;

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [specificLocation, setSpecificLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<DeploymentStatus>('completed');
  const [hazards, setHazards] = useState<string[]>([]);
  const [customHazard, setCustomHazard] = useState('');
  const [combatZone, setCombatZone] = useState(false);
  const [immediateDangerPay, setImmediateDangerPay] = useState(false);
  const [hostileFirePay, setHostileFirePay] = useState(false);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editId) loadDeployment(editId);
  }, [editId]);

  async function loadDeployment(id: string) {
    const deployments = await database.getDeployments((await database.getUserProfile())!.id);
    const dep = deployments.find((d) => d.id === id);
    if (dep) {
      setName(dep.name);
      setLocation(dep.location);
      setSpecificLocation(dep.specificLocation || '');
      setStartDate(dep.startDate);
      setEndDate(dep.endDate || '');
      setStatus(dep.status);
      setHazards(dep.hazards);
      setCombatZone(dep.combatZone);
      setImmediateDangerPay(dep.immediateDangerPay);
      setHostileFirePay(dep.hostileFirePay);
      setNotes(dep.notes);
    }
  }

  function toggleHazard(hazard: string) {
    setHazards((prev) =>
      prev.includes(hazard) ? prev.filter((h) => h !== hazard) : [...prev, hazard]
    );
  }

  function addCustomHazard() {
    if (customHazard.trim() && !hazards.includes(customHazard.trim())) {
      setHazards([...hazards, customHazard.trim()]);
      setCustomHazard('');
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Required';
    if (!location.trim()) newErrors.location = 'Required';
    if (!startDate.trim()) {
      newErrors.startDate = 'Required';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      newErrors.startDate = 'Use YYYY-MM-DD format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;

    setSaving(true);
    try {
      const profile = await database.getUserProfile();
      if (!profile) return;

      const deployment: Deployment = {
        id: editId || generateId(),
        userId: profile.id,
        name: name.trim(),
        location: location.trim(),
        specificLocation: specificLocation.trim() || undefined,
        startDate,
        endDate: endDate.trim() || undefined,
        status,
        hazards,
        combatZone,
        immediateDangerPay,
        hostileFirePay,
        notes: notes.trim(),
        createdAt: getNowISO(),
        updatedAt: getNowISO(),
      };

      await database.saveDeployment(deployment);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save deployment.');
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
            {isEdit ? 'Edit Deployment' : 'New Deployment'}
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
          DEPLOYMENT DETAILS
        </Text>

        <Input
          label="Operation / Deployment Name"
          value={name}
          onChangeText={setName}
          placeholder="OEF, OIR, OFS, KFOR..."
          required
          error={errors.name}
        />

        <Input
          label="Location (Country/Region)"
          value={location}
          onChangeText={setLocation}
          placeholder="Afghanistan, Iraq, Kuwait..."
          required
          error={errors.location}
        />

        <Input
          label="Specific Location (Base/FOB)"
          value={specificLocation}
          onChangeText={setSpecificLocation}
          placeholder="FOB Salerno, Camp Buehring..."
        />

        {/* Status */}
        <Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.sm }]}>
          STATUS
        </Text>
        <View style={styles.statusRow}>
          {deploymentStatuses.map((s) => (
            <TouchableOpacity
              key={s.value}
              style={[
                styles.statusChip,
                {
                  backgroundColor: status === s.value ? theme.primary : theme.surface,
                  borderColor: status === s.value ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setStatus(s.value)}
            >
              <Text
                style={[
                  typography.buttonSmall,
                  { color: status === s.value ? '#FFFFFF' : theme.textSecondary },
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
              label="Start Date"
              value={startDate}
              onChangeText={setStartDate}
              placeholder="2019-02-15"
              required
              error={errors.startDate}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="End Date"
              value={endDate}
              onChangeText={setEndDate}
              placeholder="2019-11-20"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        {/* Combat / Pay */}
        <Text
          style={[typography.label, { color: theme.error, marginBottom: spacing.md, marginTop: spacing.lg }]}
        >
          COMBAT & PAY STATUS
        </Text>

        <View style={[styles.switchRow, { borderColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyBold, { color: theme.text }]}>Combat Zone</Text>
            <Text style={[typography.caption, { color: theme.textMuted }]}>
              Tax exclusion area
            </Text>
          </View>
          <Switch
            value={combatZone}
            onValueChange={setCombatZone}
            trackColor={{ false: theme.border, true: theme.error + '80' }}
            thumbColor={combatZone ? theme.error : '#f4f3f4'}
          />
        </View>

        <View style={[styles.switchRow, { borderColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyBold, { color: theme.text }]}>Hostile Fire Pay (HFP)</Text>
          </View>
          <Switch
            value={hostileFirePay}
            onValueChange={setHostileFirePay}
            trackColor={{ false: theme.border, true: theme.warning + '80' }}
            thumbColor={hostileFirePay ? theme.warning : '#f4f3f4'}
          />
        </View>

        <View style={[styles.switchRow, { borderColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyBold, { color: theme.text }]}>Imminent Danger Pay (IDP)</Text>
          </View>
          <Switch
            value={immediateDangerPay}
            onValueChange={setImmediateDangerPay}
            trackColor={{ false: theme.border, true: theme.warning + '80' }}
            thumbColor={immediateDangerPay ? theme.warning : '#f4f3f4'}
          />
        </View>

        {/* Hazards */}
        <Text
          style={[typography.label, { color: theme.warning, marginBottom: spacing.sm, marginTop: spacing.lg }]}
        >
          ENVIRONMENTAL HAZARDS & EXPOSURES
        </Text>
        <Text style={[typography.caption, { color: theme.textMuted, marginBottom: spacing.md }]}>
          Select all hazards you were exposed to. This is critical for VA presumptive claims.
        </Text>

        <View style={styles.hazardGrid}>
          {commonHazards.map((hazard) => {
            const isSelected = hazards.includes(hazard);
            return (
              <TouchableOpacity
                key={hazard}
                style={[
                  styles.hazardChip,
                  {
                    backgroundColor: isSelected ? theme.warning + '20' : theme.surface,
                    borderColor: isSelected ? theme.warning : theme.border,
                  },
                ]}
                onPress={() => toggleHazard(hazard)}
              >
                {isSelected && <Ionicons name="checkmark" size={12} color={theme.warning} />}
                <Text
                  style={[
                    typography.caption,
                    { color: isSelected ? theme.warning : theme.textSecondary },
                  ]}
                >
                  {hazard}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom hazard */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input
              label="Other Hazard"
              value={customHazard}
              onChangeText={setCustomHazard}
              placeholder="Add custom hazard..."
            />
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: theme.primary }]}
            onPress={addCustomHazard}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Notes */}
        <Input
          label="Additional Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Any other details about this deployment..."
          multiline
          numberOfLines={4}
        />

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Button
          title={isEdit ? 'Update Deployment' : 'Save Deployment'}
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
    alignItems: 'flex-end',
  },
  statusRow: {
    flexDirection: 'row',
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
    marginBottom: spacing.xs,
  },
  hazardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  hazardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
});
