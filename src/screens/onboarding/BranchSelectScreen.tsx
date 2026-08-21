// ============================================================================
// EVENTUALLY.VET - Branch Selection Screen
// User selects their branch of service for theming
// ============================================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BranchOfService } from '../../models/types';
import { branchThemes, branchData, allBranches, defaultTheme, typography, spacing, borderRadius } from '../../theme';
import { Button } from '../../components/common/Button';

interface BranchSelectScreenProps {
  onSelect: (branch: BranchOfService) => void;
  onBack: () => void;
}

export function BranchSelectScreen({ onSelect, onBack }: BranchSelectScreenProps) {
  const [selected, setSelected] = useState<BranchOfService | null>(null);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={defaultTheme.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Select Your Branch</Text>
        <Text style={styles.subtitle}>
          This personalizes the app with your branch's colors and insignia
        </Text>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.branchGrid}>
        {allBranches.map((branchId) => {
          const branch = branchData[branchId];
          const theme = branchThemes[branchId];
          const isSelected = selected === branchId;

          return (
            <TouchableOpacity
              key={branchId}
              style={[
                styles.branchCard,
                {
                  backgroundColor: isSelected ? theme.primary : defaultTheme.surface,
                  borderColor: isSelected ? theme.primary : defaultTheme.border,
                },
              ]}
              onPress={() => setSelected(branchId)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : theme.primary + '20',
                  },
                ]}
              >
                <Ionicons
                  name={branch.icon as any}
                  size={32}
                  color={isSelected ? '#FFFFFF' : theme.primary}
                />
              </View>
              <Text
                style={[
                  styles.branchName,
                  { color: isSelected ? '#FFFFFF' : defaultTheme.text },
                ]}
              >
                {branch.shortName}
              </Text>
              <Text
                style={[
                  styles.branchMotto,
                  { color: isSelected ? 'rgba(255,255,255,0.8)' : defaultTheme.textMuted },
                ]}
              >
                {branch.motto}
              </Text>
              {isSelected && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={() => selected && onSelect(selected)}
          variant="primary"
          size="large"
          disabled={!selected}
          style={{ width: '100%' }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: defaultTheme.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
  },
  backButton: {
    marginBottom: spacing.md,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h2,
    color: defaultTheme.text,
  },
  subtitle: {
    ...typography.bodySmall,
    color: defaultTheme.textSecondary,
    marginTop: spacing.xs,
  },
  scrollArea: {
    flex: 1,
  },
  branchGrid: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  branchCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    position: 'relative',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchName: {
    ...typography.h4,
    flex: 1,
  },
  branchMotto: {
    ...typography.caption,
    position: 'absolute',
    bottom: spacing.sm,
    left: 88,
  },
  checkmark: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
});
