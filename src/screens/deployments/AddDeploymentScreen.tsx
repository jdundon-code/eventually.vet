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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { DatePicker } from '../../components/common/DatePicker';
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

// Known military bases/FOBs for quick selection
const knownLocations: Record<string, string[]> = {
  'Afghanistan': [
    'Bagram Airfield',
    'Camp Leatherneck',
    'Camp Dwyer',
    'FOB Salerno',
    'FOB Shank',
    'FOB Sharana',
    'Kandahar Airfield',
    'Camp Bastion',
    'Camp Phoenix',
    'FOB Ghazni',
  ],
  'Iraq': [
    'Al Asad Air Base',
    'Camp Taji',
    'Camp Victory',
    'FOB Hammer',
    'Camp Speicher',
    'Camp Buehring (Kuwait staging)',
    'Al Udeid Air Base (Qatar staging)',
    'Camp Arifjan (Kuwait)',
    'Joint Base Balad',
    'Camp Fallujah',
  ],
  'Kuwait': [
    'Camp Buehring',
    'Camp Arifjan',
    'Camp Patriot',
    'Ali Al Salem Air Base',
    'Camp Virginia',
  ],
  'Japan': [
    'Camp Hansen',
    'Camp Schwab',
    'Camp Foster',
    'Kadena Air Base',
    'Camp Kinser',
    'MCB Camp Butler',
    'Yokota Air Base',
    'Camp Zama',
    'MCAS Iwakuni',
    'Sasebo Naval Base',
  ],
  'South Korea': [
    'Camp Humphreys',
    'Camp Casey',
    'Osan Air Base',
    'Camp Red Cloud',
    'Kunsan Air Base',
    'Camp Stanley',
  ],
  'Germany': [
    'Ramstein Air Base',
    'Landstuhl Regional Medical Center',
    'Grafenwöhr Training Area',
    'Camp Vilseck',
    'Baumholder',
    'Spangdahlem Air Base',
  ],
  'Qatar': [
    'Al Udeid Air Base',
    'Camp As Sayliyah',
  ],
  'Djibouti': [
    'Camp Lemonnier',
  ],
  'Syria': [
    'Green Village',
    'Al-Tanf Garrison',
    'Mission Support Site Conoco',
  ],
  'Other': [],
};

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
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [customSpecificLocation, setCustomSpecificLocation] = useState('');
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
    const trimmed = customHazard.trim();
    if (trimmed && !hazards.includes(trimmed)) {
      setHazards([...hazards, trimmed]);
      setCustomHazard('');
    }
  }

  function selectSpecificLocation(loc: string) {
    if (loc === '__other__') {
      setSpecificLocation('');
      setShowLocationPicker(false);
      // Let them type custom
    } else {
      setSpecificLocation(loc);
      setShowLocationPicker(false);
    }
  }

  // Get available locations for the selected country/region
  function getAvailableLocations(): string[] {
    if (!location) return [];
    const locationLower = location.toLowerCase();
    for (const [country, bases] of Object.entries(knownLocations)) {
      if (locationLower.includes(country.toLowerCase()) || country.toLowerCase().includes(locationLower)) {
        return bases;
      }
    }
    return [];
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Required';
    if (!location.trim()) newErrors.location = 'Required';
    if (!startDate) {
      newErrors.startDate = 'Required';
    }
    if (endDate && startDate) {
      if (endDate <= startDate) {
        newErrors.endDate = 'End date must be after start date';
      }
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

      const finalSpecificLocation = specificLocation || customSpecificLocation.trim() || undefined;

      const deployment: Deployment = {
        id: editId || generateId(),
        userId: profile.id,
        name: name.trim(),
        location: location.trim(),
        specificLocation: finalSpecificLocation,
        startDate,
        endDate: endDate || undefined,
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

  const availableLocations = getAvailableLocations();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
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
        keyboardDismissMode="interactive"
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
          onChangeText={(text) => {
            setLocation(text);
            setSpecificLocation(''); // Reset specific location when country changes
          }}
          placeholder="Afghanistan, Iraq, Kuwait..."
          required
          error={errors.location}
        />

        {/* Specific Location — Searchable List */}
        <Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.sm }]}>
          SPECIFIC LOCATION (BASE/FOB)
        </Text>

        {availableLocations.length > 0 ? (
          <View style={{ marginBottom: spacing.md }}>
            <TouchableOpacity
              style={[styles.locationField, { backgroundColor: theme.surface, borderColor: specificLocation ? theme.primary : theme.border }]}
              onPress={() => setShowLocationPicker(!showLocationPicker)}
            >
              <Ionicons name="location" size={18} color={specificLocation ? theme.primary : theme.textMuted} />
              <Text style={[typography.body, { color: specificLocation ? theme.text : theme.textMuted, flex: 1 }]}>
                {specificLocation || 'Select base/FOB...'}
              </Text>
              <Ionicons name={showLocationPicker ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted} />
            </TouchableOpacity>

            {showLocationPicker && (
              <View style={[styles.locationDropdown, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                {availableLocations.map((loc) => (
                  <TouchableOpacity
                    key={loc}
                    style={[styles.locationOption, { borderBottomColor: theme.border }]}
                    onPress={() => selectSpecificLocation(loc)}
                  >
                    <Ionicons
                      name={specificLocation === loc ? 'radio-button-on' : 'radio-button-off'}
                      size={16}
                      color={specificLocation === loc ? theme.primary : theme.textMuted}
                    />
                    <Text style={[typography.bodySmall, { color: specificLocation === loc ? theme.primary : theme.text }]}>
                      {loc}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.locationOption, { borderBottomWidth: 0 }]}
                  onPress={() => selectSpecificLocation('__other__')}
                >
                  <Ionicons name="create-outline" size={16} color={theme.accent} />
                  <Text style={[typography.bodySmall, { color: theme.accent, fontWeight: '600' }]}>
                    Other (type custom)
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {!specificLocation && !showLocationPicker && (
              <Input
                label=""
                value={customSpecificLocation}
                onChangeText={setCustomSpecificLocation}
                placeholder="Or type a custom location..."
                containerStyle={{ marginTop: spacing.xs }}
              />
            )}
          </View>
        ) : (
          <Input
            value={specificLocation || customSpecificLocation}
            onChangeText={(text) => {
              setSpecificLocation('');
              setCustomSpecificLocation(text);
            }}
            placeholder="FOB name, base, camp..."
            containerStyle={{ marginBottom: spacing.md }}
          />
        )}

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
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
              placeholder="Select date"
              required
              error={errors.startDate}
              maximumDate={new Date()}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={setEndDate}
              placeholder="Select date"
              maximumDate={new Date()}
              minimumDate={startDate ? new Date(startDate + 'T00:00:00') : undefined}
              error={errors.endDate}
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
          Select all hazards you were exposed to. Critical for VA presumptive claims.
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
        <View style={styles.customHazardRow}>
          <View style={{ flex: 1 }}>
            <Input
              label="Other Hazard"
              value={customHazard}
              onChangeText={setCustomHazard}
              placeholder="Type and tap + to add..."
              returnKeyType="done"
              onSubmitEditing={addCustomHazard}
            />
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: customHazard.trim() ? theme.primary : theme.border }]}
            onPress={addCustomHazard}
            disabled={!customHazard.trim()}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Show custom hazards that were added */}
        {hazards.filter((h) => !commonHazards.includes(h)).length > 0 && (
          <View style={{ marginBottom: spacing.md }}>
            <Text style={[typography.caption, { color: theme.textMuted, marginBottom: spacing.xs }]}>Custom hazards added:</Text>
            <View style={styles.hazardGrid}>
              {hazards.filter((h) => !commonHazards.includes(h)).map((hazard) => (
                <TouchableOpacity
                  key={hazard}
                  style={[styles.hazardChip, { backgroundColor: theme.warning + '20', borderColor: theme.warning }]}
                  onPress={() => toggleHazard(hazard)}
                >
                  <Ionicons name="close" size={12} color={theme.warning} />
                  <Text style={[typography.caption, { color: theme.warning }]}>{hazard}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        <Input
          label="Additional Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Any other details about this deployment..."
          multiline
          numberOfLines={4}
        />

        <View style={{ height: 100 }} />
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
    </KeyboardAvoidingView>
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
    alignItems: 'flex-start',
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
  customHazardRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16, // Align with input field
  },
  locationField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
  },
  locationDropdown: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderRadius: borderRadius.md,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: 250,
    overflow: 'hidden',
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
});
