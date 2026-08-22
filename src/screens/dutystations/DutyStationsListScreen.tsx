// ============================================================================
// EVENTUALLY.VET - Duty Stations List Screen
// Shows PCS history with current station highlighted
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
import { DutyStation } from '../../models/types';
import { formatDateRange, calculateServiceLength } from '../../utils/dates';

export function DutyStationsListScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [stations, setStations] = useState<DutyStation[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadStations();
    }, [])
  );

  async function loadStations() {
    try {
      const profile = await database.getUserProfile();
      if (profile) {
        const data = await database.getDutyStations(profile.id);
        setStations(data);
      }
    } catch (error) {
      console.error('Failed to load duty stations:', error);
    }
  }

  function renderStation({ item, index }: { item: DutyStation; index: number }) {
    return (
      <View style={styles.timelineItem}>
        {/* Timeline connector */}
        <View style={styles.timelineLeft}>
          <View
            style={[
              styles.timelineDot,
              {
                backgroundColor: item.isCurrent ? theme.success : theme.primary,
                borderColor: item.isCurrent ? theme.success : theme.primary,
              },
            ]}
          >
            {item.isCurrent && <Ionicons name="location" size={12} color="#FFFFFF" />}
          </View>
          {index < stations.length - 1 && (
            <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
          )}
        </View>

        {/* Station Card */}
        <Card
          style={{ flex: 1, marginBottom: spacing.sm }}
          onPress={() => navigation.navigate('DutyStationDetail', { id: item.id })}
        >
          <View style={styles.stationCard}>
            {item.isCurrent && (
              <View style={[styles.currentBadge, { backgroundColor: theme.success + '20' }]}>
                <Text style={[typography.overline, { color: theme.success }]}>CURRENT STATION</Text>
              </View>
            )}

            <Text style={[typography.bodyBold, { color: theme.text }]} numberOfLines={1}>
              {item.name}
            </Text>

            <View style={styles.stationDetail}>
              <Ionicons name="location-outline" size={14} color={theme.textMuted} />
              <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>
                {item.location}
              </Text>
            </View>

            <View style={styles.stationDetail}>
              <Ionicons name="people-outline" size={14} color={theme.textMuted} />
              <Text style={[typography.bodySmall, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.unit}
              </Text>
            </View>

            {item.jobTitle && (
              <View style={styles.stationDetail}>
                <Ionicons name="briefcase-outline" size={14} color={theme.textMuted} />
                <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>
                  {item.jobTitle}
                </Text>
              </View>
            )}

            <View style={styles.stationFooter}>
              <Text style={[typography.caption, { color: theme.textMuted }]}>
                {formatDateRange(item.startDate, item.endDate)}
              </Text>
              <Text style={[typography.caption, { color: theme.accent }]}>
                {calculateServiceLength(item.startDate, item.endDate)}
              </Text>
            </View>
          </View>
        </Card>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[typography.h2, { color: theme.text }]}>Duty Stations</Text>
          <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Home')} style={{ padding: 8 }}>
            <Ionicons name="home-outline" size={22} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
        <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>
          {stations.length} station{stations.length !== 1 ? 's' : ''} — PCS History
        </Text>
      </View>

      {/* List as Timeline */}
      <FlatList
        data={stations}
        keyExtractor={(item) => item.id}
        renderItem={renderStation}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={56} color={theme.textMuted} />
            <Text style={[typography.h4, { color: theme.textMuted, marginTop: spacing.md }]}>
              No duty stations recorded
            </Text>
            <Text
              style={[
                typography.bodySmall,
                { color: theme.textMuted, textAlign: 'center', marginTop: spacing.xs },
              ]}
            >
              Track every PCS — your duty stations establish where service-connected conditions originated
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate('AddDutyStation')}
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
  listContent: {
    paddingTop: spacing.lg,
    paddingRight: spacing.lg,
    paddingBottom: 100,
  },
  timelineItem: {
    flexDirection: 'row',
    paddingLeft: spacing.lg,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 30,
    marginRight: spacing.sm,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: -2,
  },
  stationCard: {
    gap: spacing.xs,
  },
  currentBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  stationDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
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
