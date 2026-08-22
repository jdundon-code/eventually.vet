// ============================================================================
// EVENTUALLY.VET - Deployments List Screen
// Shows all deployments with status, location, and hazard indicators
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';
import { Card } from '../../components/common/Card';
import { database } from '../../services/database';
import { Deployment } from '../../models/types';
import { formatDateRange, daysBetween } from '../../utils/dates';

export function DeploymentsListScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [deployments, setDeployments] = useState<Deployment[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadDeployments();
    }, [])
  );

  async function loadDeployments() {
    try {
      const profile = await database.getUserProfile();
      if (profile) {
        const deps = await database.getDeployments(profile.id);
        setDeployments(deps);
      }
    } catch (error) {
      console.error('Failed to load deployments:', error);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'active':
        return theme.success;
      case 'completed':
        return theme.textMuted;
      case 'planned':
        return theme.info;
      default:
        return theme.textMuted;
    }
  }

  function renderDeployment({ item }: { item: Deployment }) {
    const duration = item.endDate
      ? `${daysBetween(item.startDate, item.endDate)} days`
      : 'Ongoing';

    return (
      <Card
        style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm }}
        onPress={() => navigation.navigate('DeploymentDetail', { id: item.id })}
      >
        <View style={styles.deploymentCard}>
          <View style={styles.deploymentHeader}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[typography.bodyBold, { color: theme.text, flex: 1 }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.combatZone && (
              <View style={[styles.combatBadge, { backgroundColor: theme.error + '20' }]}>
                <Ionicons name="alert" size={12} color={theme.error} />
                <Text style={[typography.overline, { color: theme.error }]}>COMBAT</Text>
              </View>
            )}
          </View>

          <View style={styles.deploymentDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="location" size={14} color={theme.textMuted} />
              <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>
                {item.location}
                {item.specificLocation ? ` — ${item.specificLocation}` : ''}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="time" size={14} color={theme.textMuted} />
              <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>
                {formatDateRange(item.startDate, item.endDate)} ({duration})
              </Text>
            </View>
          </View>

          {/* Hazard Tags */}
          {item.hazards.length > 0 && (
            <View style={styles.hazardRow}>
              {item.hazards.slice(0, 3).map((hazard, idx) => (
                <View
                  key={idx}
                  style={[styles.hazardTag, { backgroundColor: theme.warning + '15', borderColor: theme.warning + '40' }]}
                >
                  <Ionicons name="warning" size={10} color={theme.warning} />
                  <Text style={[typography.overline, { color: theme.warning }]}>
                    {hazard.toUpperCase()}
                  </Text>
                </View>
              ))}
              {item.hazards.length > 3 && (
                <Text style={[typography.caption, { color: theme.textMuted }]}>
                  +{item.hazards.length - 3} more
                </Text>
              )}
            </View>
          )}

          {/* Pay indicators */}
          <View style={styles.payRow}>
            {item.hostileFirePay && (
              <Text style={[typography.caption, { color: theme.error }]}>● HFP</Text>
            )}
            {item.immediateDangerPay && (
              <Text style={[typography.caption, { color: theme.warning }]}>● IDP</Text>
            )}
          </View>
        </View>
      </Card>
    );
  }

  // Calculate total deployment time
  const totalDays = deployments.reduce((sum, dep) => {
    if (dep.endDate) {
      return sum + daysBetween(dep.startDate, dep.endDate);
    }
    return sum + daysBetween(dep.startDate, new Date().toISOString());
  }, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[typography.h2, { color: theme.text }]}>Deployments</Text>
          <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Home')} style={{ padding: 8 }}>
            <Ionicons name="home-outline" size={22} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerStats}>
          <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>
            {deployments.length} deployment{deployments.length !== 1 ? 's' : ''}
          </Text>
          {totalDays > 0 && (
            <Text style={[typography.bodySmall, { color: theme.accent }]}>
              {totalDays} total days deployed
            </Text>
          )}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={deployments}
        keyExtractor={(item) => item.id}
        renderItem={renderDeployment}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="globe-outline" size={56} color={theme.textMuted} />
            <Text style={[typography.h4, { color: theme.textMuted, marginTop: spacing.md }]}>
              No deployments recorded
            </Text>
            <Text style={[typography.bodySmall, { color: theme.textMuted, textAlign: 'center', marginTop: spacing.xs }]}>
              Document your deployments — locations, hazards, and dates matter for your VA claim
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate('AddDeployment')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
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
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: 100,
  },
  deploymentCard: {
    gap: spacing.sm,
  },
  deploymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  combatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  deploymentDetails: {
    gap: spacing.xs,
    paddingLeft: spacing.md + spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hazardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingLeft: spacing.md + spacing.sm,
  },
  hazardTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  payRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingLeft: spacing.md + spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: spacing.xl,
  },
  fab: {
    position: 'absolute',
    bottom: 90,
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
