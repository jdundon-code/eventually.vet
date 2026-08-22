// ============================================================================
// EVENTUALLY.VET - Buddy Letters List Screen
// Shows all buddy letter requests with status tracking pipeline
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';
import { Card } from '../../components/common/Card';
import { buddyLetterService, BuddyLetter, BuddyLetterStatus } from '../../services/buddyLetterService';
import { formatDate } from '../../utils/dates';

const statusConfig: Record<BuddyLetterStatus, { label: string; icon: string; color: string }> = {
  draft: { label: 'Draft', icon: 'create-outline', color: '#6B7B8F' },
  sent: { label: 'Sent', icon: 'send', color: '#2196F3' },
  received: { label: 'Received', icon: 'checkmark-circle', color: '#FFC107' },
  attached: { label: 'Attached', icon: 'attach', color: '#4CAF50' },
};

export function BuddyLettersListScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [letters, setLetters] = useState<BuddyLetter[]>([]);
  const [stats, setStats] = useState({ total: 0, draft: 0, sent: 0, received: 0, attached: 0 });

  useFocusEffect(
    useCallback(() => {
      loadLetters();
    }, [])
  );

  async function loadLetters() {
    const all = await buddyLetterService.getLetters();
    setLetters(all);
    const s = await buddyLetterService.getStats();
    setStats(s);
  }

  function getStatusColor(status: BuddyLetterStatus): string {
    switch (status) {
      case 'draft': return theme.textMuted;
      case 'sent': return theme.info;
      case 'received': return theme.warning;
      case 'attached': return theme.success;
    }
  }

  function renderLetter({ item }: { item: BuddyLetter }) {
    const config = statusConfig[item.status];

    return (
      <Card
        style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm }}
        onPress={() => navigation.navigate('BuddyLetterDetail', { id: item.id })}
      >
        <View style={styles.letterCard}>
          {/* Status Indicator */}
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Ionicons name={config.icon as any} size={20} color={getStatusColor(item.status)} />
          </View>

          {/* Content */}
          <View style={styles.letterInfo}>
            <Text style={[typography.bodyBold, { color: theme.text }]} numberOfLines={1}>
              {item.buddyName}
            </Text>
            <Text style={[typography.bodySmall, { color: theme.textSecondary }]} numberOfLines={1}>
              Re: {item.conditionName}
            </Text>
            <View style={styles.letterMeta}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {config.label.toUpperCase()}
                </Text>
              </View>
              <Text style={[typography.caption, { color: theme.textMuted }]}>
                {item.buddyRelationship}
              </Text>
            </View>
          </View>

          {/* Date */}
          <View style={styles.letterDate}>
            <Text style={[typography.caption, { color: theme.textMuted }]}>
              {item.sentAt ? formatDate(item.sentAt) : formatDate(item.createdAt)}
            </Text>
          </View>
        </View>
      </Card>
    );
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
          <Text style={[typography.h3, { color: theme.text }]}>Buddy Letters</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={[typography.bodySmall, { color: theme.textSecondary, marginTop: spacing.xs }]}>
          Request statements from fellow service members
        </Text>

        {/* Pipeline Stats */}
        {stats.total > 0 && (
          <View style={styles.pipeline}>
            <PipelineStat label="Draft" count={stats.draft} color={theme.textMuted} theme={theme} />
            <View style={[styles.pipelineArrow, { backgroundColor: theme.border }]} />
            <PipelineStat label="Sent" count={stats.sent} color={theme.info} theme={theme} />
            <View style={[styles.pipelineArrow, { backgroundColor: theme.border }]} />
            <PipelineStat label="Received" count={stats.received} color={theme.warning} theme={theme} />
            <View style={[styles.pipelineArrow, { backgroundColor: theme.border }]} />
            <PipelineStat label="Attached" count={stats.attached} color={theme.success} theme={theme} />
          </View>
        )}
      </View>

      {/* List */}
      <FlatList
        data={letters}
        keyExtractor={(item) => item.id}
        renderItem={renderLetter}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="mail-outline" size={56} color={theme.textMuted} />
            <Text style={[typography.h4, { color: theme.textMuted, marginTop: spacing.md }]}>
              No buddy letters yet
            </Text>
            <Text
              style={[typography.bodySmall, { color: theme.textMuted, textAlign: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.lg }]}
            >
              Buddy statements from fellow service members strengthen your VA claim. 
              They provide first-hand evidence that your condition is service-connected.
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate('CreateBuddyLetter')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

function PipelineStat({ label, count, color, theme }: { label: string; count: number; color: string; theme: any }) {
  return (
    <View style={styles.pipelineItem}>
      <Text style={[typography.h4, { color }]}>{count}</Text>
      <Text style={[typography.overline, { color: theme.textMuted }]}>{label}</Text>
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
  pipeline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  pipelineItem: {
    alignItems: 'center',
  },
  pipelineArrow: {
    width: 20,
    height: 2,
  },
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: 100,
  },
  letterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterInfo: {
    flex: 1,
    gap: 2,
  },
  letterMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  letterDate: {
    alignItems: 'flex-end',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.xl,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
