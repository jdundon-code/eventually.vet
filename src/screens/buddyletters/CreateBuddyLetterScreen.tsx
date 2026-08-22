// ============================================================================
// EVENTUALLY.VET - Create Buddy Letter Screen
// Step-by-step flow to generate a buddy statement request
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
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { database } from '../../services/database';
import { buddyLetterService } from '../../services/buddyLetterService';
import { ServiceCondition, DutyStation, Deployment, UserProfile } from '../../models/types';

export function CreateBuddyLetterScreen({ navigation }: any) {
  const { theme } = useTheme();

  // Data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [conditions, setConditions] = useState<ServiceCondition[]>([]);
  const [dutyStations, setDutyStations] = useState<DutyStation[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);

  // Form state
  const [selectedConditionId, setSelectedConditionId] = useState('');
  const [buddyName, setBuddyName] = useState('');
  const [buddyEmail, setBuddyEmail] = useState('');
  const [buddyRank, setBuddyRank] = useState('');
  const [buddyRelationship, setBuddyRelationship] = useState('');
  const [selectedStationId, setSelectedStationId] = useState('');
  const [selectedDeploymentId, setSelectedDeploymentId] = useState('');
  const [customPrompt1, setCustomPrompt1] = useState('');
  const [customPrompt2, setCustomPrompt2] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const prof = await database.getUserProfile();
    setProfile(prof);
    if (prof) {
      const conds = await database.getConditions(prof.id);
      setConditions(conds);
      const stations = await database.getDutyStations(prof.id);
      setDutyStations(stations);
      const deps = await database.getDeployments(prof.id);
      setDeployments(deps);
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!selectedConditionId) newErrors.condition = 'Select a condition';
    if (!buddyName.trim()) newErrors.buddyName = 'Required';
    if (!buddyEmail.trim()) newErrors.buddyEmail = 'Required';
    else if (!buddyEmail.includes('@')) newErrors.buddyEmail = 'Invalid email';
    if (!buddyRelationship.trim()) newErrors.buddyRelationship = 'Required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleGenerate() {
    if (!validate() || !profile) return;

    setSaving(true);
    try {
      const condition = conditions.find((c) => c.id === selectedConditionId);
      if (!condition) return;

      const sharedStation = dutyStations.find((s) => s.id === selectedStationId);
      const sharedDeployment = deployments.find((d) => d.id === selectedDeploymentId);

      const customPrompts = [customPrompt1, customPrompt2].filter((p) => p.trim());

      const letter = await buddyLetterService.generateLetter({
        condition,
        profile,
        buddyName: buddyName.trim(),
        buddyEmail: buddyEmail.trim(),
        buddyRelationship: buddyRelationship.trim(),
        buddyRank: buddyRank.trim() || undefined,
        sharedDutyStation: sharedStation,
        sharedDeployment: sharedDeployment,
        customPrompts,
      });

      // Ask what to do next
      Alert.alert(
        'Letter Generated',
        `Buddy statement template created for ${buddyName}. What would you like to do?`,
        [
          {
            text: 'Send via Email',
            onPress: async () => {
              const sent = await buddyLetterService.sendViaEmail(letter, profile);
              if (!sent) {
                Alert.alert('Email Unavailable', 'Email is not configured. You can share the PDF instead.');
              }
              navigation.goBack();
            },
          },
          {
            text: 'Share PDF',
            onPress: async () => {
              await buddyLetterService.sharePdf(letter);
              navigation.goBack();
            },
          },
          {
            text: 'Save as Draft',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate letter');
    } finally {
      setSaving(false);
    }
  }

  const relationships = [
    'Fellow squad/team member',
    'Supervisor/NCO',
    'Platoon mate',
    'Roommate/Bunkmate',
    'Co-worker (same shop)',
    'Battle buddy',
    'Spouse/Family member',
    'Other',
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: theme.text }]}>Request Buddy Statement</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        style={styles.form}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step 1: Select Condition */}
        <Text style={[typography.label, { color: theme.primary, marginBottom: spacing.sm }]}>
          1. WHICH CONDITION IS THIS FOR?
        </Text>
        {errors.condition && (
          <Text style={[typography.caption, { color: theme.error, marginBottom: spacing.sm }]}>{errors.condition}</Text>
        )}

        {conditions.length === 0 ? (
          <Card>
            <View style={styles.emptyConditions}>
              <Ionicons name="alert-circle" size={24} color={theme.warning} />
              <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>
                No conditions tracked yet. Add a service condition first.
              </Text>
              <Button
                title="Track Condition"
                onPress={() => navigation.navigate('AddCondition')}
                variant="outline"
                size="small"
              />
            </View>
          </Card>
        ) : (
          <View style={styles.conditionList}>
            {conditions.map((condition) => (
              <TouchableOpacity
                key={condition.id}
                style={[
                  styles.conditionChip,
                  {
                    backgroundColor: selectedConditionId === condition.id ? theme.primary : theme.surface,
                    borderColor: selectedConditionId === condition.id ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setSelectedConditionId(condition.id)}
              >
                <Text
                  style={[
                    typography.bodySmall,
                    { color: selectedConditionId === condition.id ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  {condition.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 2: Buddy Info */}
        <Text style={[typography.label, { color: theme.primary, marginBottom: spacing.sm, marginTop: spacing.xl }]}>
          2. WHO ARE YOU REQUESTING THIS FROM?
        </Text>

        <Input
          label="Buddy's Full Name"
          value={buddyName}
          onChangeText={setBuddyName}
          placeholder="John Smith"
          required
          error={errors.buddyName}
        />

        <Input
          label="Buddy's Email"
          value={buddyEmail}
          onChangeText={setBuddyEmail}
          placeholder="john.smith@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          required
          error={errors.buddyEmail}
        />

        <Input
          label="Buddy's Rank (if applicable)"
          value={buddyRank}
          onChangeText={setBuddyRank}
          placeholder="SSG, PO2, TSgt..."
        />

        {/* Relationship */}
        <Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.sm }]}>
          RELATIONSHIP *
        </Text>
        {errors.buddyRelationship && (
          <Text style={[typography.caption, { color: theme.error, marginBottom: spacing.sm }]}>{errors.buddyRelationship}</Text>
        )}
        <View style={styles.relationshipGrid}>
          {relationships.map((rel) => (
            <TouchableOpacity
              key={rel}
              style={[
                styles.relChip,
                {
                  backgroundColor: buddyRelationship === rel ? theme.primary : theme.surface,
                  borderColor: buddyRelationship === rel ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setBuddyRelationship(rel)}
            >
              <Text
                style={[
                  typography.caption,
                  { color: buddyRelationship === rel ? '#FFFFFF' : theme.textSecondary },
                ]}
              >
                {rel}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Step 3: Shared Service Context */}
        <Text style={[typography.label, { color: theme.primary, marginBottom: spacing.sm, marginTop: spacing.xl }]}>
          3. WHERE DID YOU SERVE TOGETHER? (OPTIONAL)
        </Text>
        <Text style={[typography.caption, { color: theme.textMuted, marginBottom: spacing.md }]}>
          This pre-fills context in the letter template
        </Text>

        {dutyStations.length > 0 && (
          <>
            <Text style={[typography.caption, { color: theme.textSecondary, marginBottom: spacing.xs }]}>Duty Station:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <TouchableOpacity
                  style={[styles.contextChip, { borderColor: !selectedStationId ? theme.primary : theme.border, backgroundColor: !selectedStationId ? theme.primary + '15' : theme.surface }]}
                  onPress={() => setSelectedStationId('')}
                >
                  <Text style={[typography.caption, { color: !selectedStationId ? theme.primary : theme.textMuted }]}>None</Text>
                </TouchableOpacity>
                {dutyStations.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.contextChip, { borderColor: selectedStationId === s.id ? theme.primary : theme.border, backgroundColor: selectedStationId === s.id ? theme.primary + '15' : theme.surface }]}
                    onPress={() => setSelectedStationId(s.id)}
                  >
                    <Text style={[typography.caption, { color: selectedStationId === s.id ? theme.primary : theme.textSecondary }]}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </>
        )}

        {deployments.length > 0 && (
          <>
            <Text style={[typography.caption, { color: theme.textSecondary, marginBottom: spacing.xs }]}>Deployment:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <TouchableOpacity
                  style={[styles.contextChip, { borderColor: !selectedDeploymentId ? theme.primary : theme.border, backgroundColor: !selectedDeploymentId ? theme.primary + '15' : theme.surface }]}
                  onPress={() => setSelectedDeploymentId('')}
                >
                  <Text style={[typography.caption, { color: !selectedDeploymentId ? theme.primary : theme.textMuted }]}>None</Text>
                </TouchableOpacity>
                {deployments.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.contextChip, { borderColor: selectedDeploymentId === d.id ? theme.primary : theme.border, backgroundColor: selectedDeploymentId === d.id ? theme.primary + '15' : theme.surface }]}
                    onPress={() => setSelectedDeploymentId(d.id)}
                  >
                    <Text style={[typography.caption, { color: selectedDeploymentId === d.id ? theme.primary : theme.textSecondary }]}>{d.name} — {d.location}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </>
        )}

        {/* Step 4: Custom Prompts */}
        <Text style={[typography.label, { color: theme.primary, marginBottom: spacing.sm, marginTop: spacing.xl }]}>
          4. ADDITIONAL QUESTIONS (OPTIONAL)
        </Text>
        <Text style={[typography.caption, { color: theme.textMuted, marginBottom: spacing.md }]}>
          Add custom questions specific to your situation
        </Text>

        <Input
          label="Custom Question 1"
          value={customPrompt1}
          onChangeText={setCustomPrompt1}
          placeholder="e.g., Did you witness the incident on [date]?"
          multiline
          numberOfLines={2}
        />

        <Input
          label="Custom Question 2"
          value={customPrompt2}
          onChangeText={setCustomPrompt2}
          placeholder="e.g., Can you describe how my hearing changed after [event]?"
          multiline
          numberOfLines={2}
        />

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Generate Button */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Button
          title="Generate & Send Letter"
          onPress={handleGenerate}
          variant="primary"
          size="large"
          loading={saving}
          disabled={conditions.length === 0}
          style={{ width: '100%' }}
          icon={<Ionicons name="mail" size={20} color="#FFFFFF" />}
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
  emptyConditions: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  conditionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  conditionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  relationshipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  relChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  contextChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
});
