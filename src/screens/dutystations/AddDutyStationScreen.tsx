// ============================================================================
// EVENTUALLY.VET - Add/Edit Duty Station Screen
// Form for documenting PCS history
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
import { DatePicker } from '../../components/common/DatePicker';
import { database } from '../../services/database';
import { DutyStation } from '../../models/types';
import { generateId } from '../../utils/uuid';
import { getNowISO } from '../../utils/dates';

interface AddDutyStationScreenProps {
  navigation: any;
  route?: { params?: { id?: string } };
}

export function AddDutyStationScreen({ navigation, route }: AddDutyStationScreenProps) {
  const { theme } = useTheme();
  const editId = route?.params?.id;
  const isEdit = !!editId;

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [unit, setUnit] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [supervisorName, setSupervisorName] = useState('');
  const [supervisorContact, setSupervisorContact] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editId) loadStation(editId);
  }, [editId]);

  async function loadStation(id: string) {
    const profile = await database.getUserProfile();
    if (!profile) return;
    const stations = await database.getDutyStations(profile.id);
    const station = stations.find((s) => s.id === id);
    if (station) {
      setName(station.name);
      setLocation(station.location);
      setUnit(station.unit);
      setStartDate(station.startDate);
      setEndDate(station.endDate || '');
      setIsCurrent(station.isCurrent);
      setJobTitle(station.jobTitle || '');
      setSupervisorName(station.supervisorName || '');
      setSupervisorContact(station.supervisorContact || '');
      setNotes(station.notes);
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Required';
    if (!location.trim()) newErrors.location = 'Required';
    if (!unit.trim()) newErrors.unit = 'Required';
    if (!startDate) {
      newErrors.startDate = 'Required';
    }
    // Validate end date is after start date
    if (!isCurrent && endDate && startDate) {
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

      const station: DutyStation = {
        id: editId || generateId(),
        userId: profile.id,
        name: name.trim(),
        location: location.trim(),
        unit: unit.trim(),
        startDate,
        endDate: isCurrent ? undefined : endDate.trim() || undefined,
        isCurrent,
        jobTitle: jobTitle.trim() || undefined,
        supervisorName: supervisorName.trim() || undefined,
        supervisorContact: supervisorContact.trim() || undefined,
        notes: notes.trim(),
        createdAt: getNowISO(),
        updatedAt: getNowISO(),
      };

      await database.saveDutyStation(station);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save duty station.');
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
            {isEdit ? 'Edit Duty Station' : 'New Duty Station'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        style={styles.form}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Installation Info */}
        <Text style={[typography.label, { color: theme.primary, marginBottom: spacing.md }]}>
          INSTALLATION / BASE
        </Text>

        <Input
          label="Base / Post / Station Name"
          value={name}
          onChangeText={setName}
          placeholder="Fort Liberty, Camp Pendleton, NAS Jax..."
          required
          error={errors.name}
        />

        <Input
          label="Location"
          value={location}
          onChangeText={setLocation}
          placeholder="Fayetteville, NC"
          required
          error={errors.location}
        />

        {/* Unit Info */}
        <Text
          style={[typography.label, { color: theme.primary, marginBottom: spacing.md, marginTop: spacing.lg }]}
        >
          ASSIGNMENT
        </Text>

        <Input
          label="Unit"
          value={unit}
          onChangeText={setUnit}
          placeholder="2nd BCT, 82nd Airborne Division"
          required
          error={errors.unit}
        />

        <Input
          label="Job Title / Position"
          value={jobTitle}
          onChangeText={setJobTitle}
          placeholder="Squad Leader, S3 NCO, Flight Medic..."
        />

        {/* Dates */}
        <Text
          style={[typography.label, { color: theme.primary, marginBottom: spacing.md, marginTop: spacing.lg }]}
        >
          PCS DATES
        </Text>

        <View style={[styles.switchRow, { borderColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyBold, { color: theme.text }]}>Current Station</Text>
            <Text style={[typography.caption, { color: theme.textMuted }]}>
              I am currently assigned here
            </Text>
          </View>
          <Switch
            value={isCurrent}
            onValueChange={setIsCurrent}
            trackColor={{ false: theme.border, true: theme.success + '80' }}
            thumbColor={isCurrent ? theme.success : '#f4f3f4'}
          />
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <DatePicker
              label="PCS / Report Date"
              value={startDate}
              onChange={setStartDate}
              placeholder="Select date"
              required
              error={errors.startDate}
              maximumDate={new Date()}
            />
          </View>
          {!isCurrent && (
            <View style={{ flex: 1 }}>
              <DatePicker
                label="Departure Date"
                value={endDate}
                onChange={setEndDate}
                placeholder="Select date"
                maximumDate={new Date()}
                minimumDate={startDate ? new Date(startDate + 'T00:00:00') : undefined}
                error={errors.endDate}
              />
            </View>
          )}
        </View>

        {/* Supervisor (for VA buddy letters) */}
        <Text
          style={[typography.label, { color: theme.primary, marginBottom: spacing.sm, marginTop: spacing.lg }]}
        >
          SUPERVISOR INFO
        </Text>
        <Text style={[typography.caption, { color: theme.textMuted, marginBottom: spacing.md }]}>
          Optional — helpful for buddy letters and VA statements
        </Text>

        <Input
          label="Supervisor Name"
          value={supervisorName}
          onChangeText={setSupervisorName}
          placeholder="SSG Johnson, LT Smith"
        />

        <Input
          label="Supervisor Contact"
          value={supervisorContact}
          onChangeText={setSupervisorContact}
          placeholder="Email or phone (if known)"
        />

        {/* Notes */}
        <Input
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything notable about this assignment..."
          multiline
          numberOfLines={4}
        />

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Button
          title={isEdit ? 'Update Duty Station' : 'Save Duty Station'}
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
