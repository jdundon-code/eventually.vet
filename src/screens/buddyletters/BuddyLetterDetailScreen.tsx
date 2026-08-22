// ============================================================================
// EVENTUALLY.VET - Buddy Letter Detail Screen
// View letter details, manage status, resend, or attach returned document
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
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { buddyLetterService, BuddyLetter, BuddyLetterStatus } from '../../services/buddyLetterService';
import { database } from '../../services/database';
import { UserProfile } from '../../models/types';
import { formatDate, formatDateTime } from '../../utils/dates';

const statusSteps: { key: BuddyLetterStatus; label: string; icon: string }[] = [
  { key: 'draft', label: 'Created', icon: 'create' },
  { key: 'sent', label: 'Sent', icon: 'send' },
  { key: 'received', label: 'Received', icon: 'checkmark-circle' },
  { key: 'attached', label: 'Attached', icon: 'attach' },
];

export function BuddyLetterDetailScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { id } = route.params;
  const [letter, setLetter] = useState<BuddyLetter | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadLetter();
  }, [id]);

  async function loadLetter() {
    const letters = await buddyLetterService.getLetters();
    const found = letters.find((l) => l.id === id);
    setLetter(found || null);
    const prof = await database.getUserProfile();
    setProfile(prof);
  }

  async function handleResend() {
    if (!letter || !profile) return;
    const sent = await buddyLetterService.sendViaEmail(letter, profile);
    if (sent) {
      Alert.alert('Sent', `Email sent to ${letter.buddyEmail}`);
      await loadLetter();
    } else {
      // Fall back to share
      await buddyLetterService.sharePdf(letter);
    }
  }

  async function handleMarkReceived() {
    if (!letter) return;

    Alert.alert(
      'Mark as Received',
      'Did the buddy return their completed statement? You can attach the file now or later.',
      [
        {
          text: 'Attach File Now',
          onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                await buddyLetterService.markReceived(letter.id, asset.uri);
                await loadLetter();
              }
            } catch (e) {
              console.error(e);
            }
          },
        },
        {
          text: 'Mark Without File',
          onPress: async () => {
            await buddyLetterService.markReceived(letter.id);
            await loadLetter();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  async function handleAttachToCondition() {
    if (!letter) return;
    await buddyLetterService.markAttached(letter.id);
    Alert.alert(
      'Attached!',
      `The buddy statement from ${letter.buddyName} has been attached to your "${letter.conditionName}" condition.`
    );
    await loadLetter();
  }

  async function handleSharePdf() {
    if (!letter) return;
    await buddyLetterService.sharePdf(letter);
  }

  async function handleDelete() {
    if (!letter) return;
    Alert.alert('Delete Letter', 'Are you sure you want to delete this buddy letter request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await buddyLetterService.deleteLetter(letter.id);
          navigation.goBack();
        },
      },
    ]);
  }

  if (!letter) return null;

  const currentStepIndex = statusSteps.findIndex((s) => s.key === letter.status);

  function getStepColor(index: number): string {
    if (index <= currentStepIndex) return theme.success;
    return theme.textMuted;
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
          <Text style={[typography.h3, { color: theme.text }]}>Letter Details</Text>
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Pipeline */}
        <Card style={{ margin: spacing.lg }} elevated>
          <Text style={[typography.label, { color: theme.primary, marginBottom: spacing.md }]}>STATUS</Text>
          <View style={styles.statusPipeline}>
            {statusSteps.map((step, index) => (
              <React.Fragment key={step.key}>
                <View style={styles.stepItem}>
                  <View style={[styles.stepDot, { backgroundColor: getStepColor(index) }]}>
                    <Ionicons name={step.icon as any} size={14} color="#FFFFFF" />
                  </View>
                  <Text style={[typography.caption, { color: getStepColor(index) }]}>{step.label}</Text>
                </View>
                {index < statusSteps.length - 1 && (
                  <View style={[styles.stepLine, { backgroundColor: getStepColor(index + 1) }]} />
                )}
              </React.Fragment>
            ))}
          </View>
        </Card>

        {/* Buddy Info */}
        <Card style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md }}>
          <Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.sm }]}>RECIPIENT</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={18} color={theme.textMuted} />
            <View>
              <Text style={[typography.bodyBold, { color: theme.text }]}>
                {letter.buddyRank ? `${letter.buddyRank} ` : ''}{letter.buddyName}
              </Text>
              <Text style={[typography.caption, { color: theme.textMuted }]}>{letter.buddyRelationship}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={18} color={theme.textMuted} />
            <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>{letter.buddyEmail}</Text>
          </View>
        </Card>

        {/* Condition */}
        <Card style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md }}>
          <Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.sm }]}>FOR CONDITION</Text>
          <View style={styles.infoRow}>
            <Ionicons name="fitness" size={18} color={theme.warning} />
            <Text style={[typography.bodyBold, { color: theme.text }]}>{letter.conditionName}</Text>
          </View>
        </Card>

        {/* Timeline */}
        <Card style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md }}>
          <Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.sm }]}>TIMELINE</Text>
          <TimelineItem label="Created" date={letter.createdAt} theme={theme} />
          {letter.sentAt && <TimelineItem label="Sent" date={letter.sentAt} theme={theme} />}
          {letter.receivedAt && <TimelineItem label="Received" date={letter.receivedAt} theme={theme} />}
          {letter.attachedAt && <TimelineItem label="Attached to Condition" date={letter.attachedAt} theme={theme} />}
        </Card>

        {/* Returned File */}
        {letter.returnedFileUri && (
          <Card style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md }}>
            <View style={styles.infoRow}>
              <Ionicons name="document-attach" size={20} color={theme.success} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodySmall, { color: theme.text }]}>Returned Statement</Text>
                <Text style={[typography.caption, { color: theme.textMuted }]}>File attached</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={theme.success} />
            </View>
          </Card>
        )}

        {/* Actions */}
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.xxl }}>
          {letter.status === 'draft' && (
            <Button
              title="Send via Email"
              onPress={handleResend}
              variant="primary"
              icon={<Ionicons name="send" size={18} color="#FFFFFF" />}
            />
          )}

          {letter.status === 'sent' && (
            <>
              <Button
                title="Resend Email"
                onPress={handleResend}
                variant="outline"
                icon={<Ionicons name="refresh" size={18} color={theme.primary} />}
              />
              <Button
                title="Mark as Received"
                onPress={handleMarkReceived}
                variant="primary"
                icon={<Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />}
              />
            </>
          )}

          {letter.status === 'received' && (
            <Button
              title="Attach to Condition"
              onPress={handleAttachToCondition}
              variant="primary"
              icon={<Ionicons name="attach" size={18} color="#FFFFFF" />}
            />
          )}

          <Button
            title="Share PDF Template"
            onPress={handleSharePdf}
            variant="outline"
            icon={<Ionicons name="share" size={18} color={theme.primary} />}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function TimelineItem({ label, date, theme }: { label: string; date: string; theme: any }) {
  return (
    <View style={styles.timelineItem}>
      <View style={[styles.timelineDot, { backgroundColor: theme.success }]} />
      <View style={styles.timelineContent}>
        <Text style={[typography.bodySmall, { color: theme.text }]}>{label}</Text>
        <Text style={[typography.caption, { color: theme.textMuted }]}>{formatDateTime(date)}</Text>
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
  content: {
    paddingBottom: 40,
  },
  statusPipeline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    width: 24,
    height: 2,
    marginHorizontal: spacing.xs,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  timelineContent: {
    flex: 1,
  },
});
