// ============================================================================
// EVENTUALLY.VET - Profile Setup Screen
// User enters their basic service information
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BranchOfService, ServiceStatus, UserProfile } from '../../models/types';
import { branchThemes, branchData, typography, spacing, borderRadius } from '../../theme';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { generateId } from '../../utils/uuid';
import { getNowISO } from '../../utils/dates';

interface ProfileSetupScreenProps {
  branch: BranchOfService;
  onComplete: (profile: UserProfile) => void;
  onBack: () => void;
}

const serviceStatuses: { value: ServiceStatus; label: string }[] = [
  { value: 'active_duty', label: 'Active Duty' },
  { value: 'reserve', label: 'Reserve' },
  { value: 'national_guard', label: 'National Guard' },
  { value: 'separated', label: 'Separated' },
  { value: 'retired', label: 'Retired' },
  { value: 'medically_retired', label: 'Medically Retired' },
];

export function ProfileSetupScreen({ branch, onComplete, onBack }: ProfileSetupScreenProps) {
  const theme = branchThemes[branch];
  const branchInfo = branchData[branch];

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rank, setRank] = useState('');
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>('active_duty');
  const [serviceStartDate, setServiceStartDate] = useState('');
  const [mos, setMos] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = 'Required';
    if (!lastName.trim()) newErrors.lastName = 'Required';
    if (!serviceStartDate.trim()) {
      newErrors.serviceStartDate = 'Required (YYYY-MM-DD)';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceStartDate)) {
      newErrors.serviceStartDate = 'Use format YYYY-MM-DD';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    const profile: UserProfile = {
      id: generateId(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      branch,
      rank: rank.trim() || undefined,
      serviceStatus,
      serviceStartDate,
      mос: mos.trim() || undefined,
      createdAt: getNowISO(),
      updatedAt: getNowISO(),
    };

    onComplete(profile);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name={branchInfo.icon as any} size={24} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Service Profile</Text>
        </View>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Tell us about your service. You can update this anytime.
        </Text>
      </View>

      <ScrollView
        style={styles.form}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="John"
              required
              error={errors.firstName}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Doe"
              required
              error={errors.lastName}
            />
          </View>
        </View>

        <Input
          label="Rank"
          value={rank}
          onChangeText={setRank}
          placeholder={branchInfo.ranks[5] || 'E-5'}
        />

        <Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.sm }]}>
          SERVICE STATUS *
        </Text>
        <View style={styles.statusGrid}>
          {serviceStatuses.map((status) => (
            <TouchableOpacity
              key={status.value}
              style={[
                styles.statusChip,
                {
                  backgroundColor:
                    serviceStatus === status.value ? theme.primary : theme.surface,
                  borderColor:
                    serviceStatus === status.value ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setServiceStatus(status.value)}
            >
              <Text
                style={[
                  styles.statusChipText,
                  {
                    color: serviceStatus === status.value ? '#FFFFFF' : theme.textSecondary,
                  },
                ]}
              >
                {status.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Service Start Date"
          value={serviceStartDate}
          onChangeText={setServiceStartDate}
          placeholder="2018-06-15"
          required
          error={errors.serviceStartDate}
          keyboardType="numbers-and-punctuation"
        />

        <Input
          label={branch === 'navy' || branch === 'coast_guard' ? 'Rating/NEC' : 'MOS/AFSC'}
          value={mos}
          onChangeText={setMos}
          placeholder={
            branch === 'army'
              ? '11B - Infantryman'
              : branch === 'navy'
              ? 'ET - Electronics Technician'
              : branch === 'air_force'
              ? '1A8X1 - Airborne Cryptologic'
              : branch === 'marines'
              ? '0311 - Rifleman'
              : branch === 'coast_guard'
              ? 'BM - Boatswain\'s Mate'
              : '5C0X1 - Command & Control'
          }
        />

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Button
          title="Complete Setup"
          onPress={handleSubmit}
          variant="primary"
          size="large"
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
  backButton: {
    marginBottom: spacing.sm,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.h2,
  },
  subtitle: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
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
  statusGrid: {
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
  statusChipText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
});
