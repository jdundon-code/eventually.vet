// ============================================================================
// EVENTUALLY.VET - Resources Directory Screen
// Browse claim assistance resources with filtering, location, and ratings
// WCAG 2.1 AA compliant
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import {
  resourcesService,
  Resource,
  ResourceType,
  CostType,
  ResourcesService,
} from '../../services/resourcesService';

type CostFilter = 'all' | 'free' | 'paid' | 'contingency';

export function ResourcesListScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [costFilter, setCostFilter] = useState<CostFilter>('all');
  const [typeFilter, setTypeFilter] = useState<ResourceType | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadResources();
    }, [])
  );

  async function loadResources() {
    setLoading(true);
    const all = await resourcesService.getResources();
    setResources(all);
    setLoading(false);
  }

  // Apply local filters
  const filteredResources = resources.filter((r) => {
    if (costFilter === 'free' && r.costType !== 'free') return false;
    if (costFilter === 'paid' && r.costType !== 'paid') return false;
    if (costFilter === 'contingency' && r.costType !== 'contingency') return false;
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.services.some((s) => s.toLowerCase().includes(q)) ||
        (r.specialties || []).some((s) => s.toLowerCase().includes(q)) ||
        r.city.toLowerCase().includes(q) ||
        r.state.toLowerCase().includes(q)
      );
    }
    return true;
  });

  function renderStars(rating: number) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={14}
          color={i <= Math.round(rating) ? '#FFC107' : theme.textMuted}
        />
      );
    }
    return stars;
  }

  function renderResource({ item }: { item: Resource }) {
    const typeInfo = ResourcesService.getTypeInfo(item.type);
    const costInfo = ResourcesService.getCostInfo(item.costType);

    return (
      <Card
        style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm }}
        onPress={() => navigation.navigate('ResourceDetail', { id: item.id })}
      >
        <View
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${item.name}. ${typeInfo.label}. ${costInfo.label}. Rating: ${item.averageRating > 0 ? `${item.averageRating} out of 5 stars, ${item.totalReviews} reviews` : 'No reviews yet'}. ${item.description}`}
          accessibilityHint="Tap to view details and reviews"
        >
          {/* Header Row */}
          <View style={styles.resourceHeader}>
            <View style={[styles.typeIconContainer, { backgroundColor: typeInfo.color + '20' }]}>
              <Ionicons name={typeInfo.icon as any} size={20} color={typeInfo.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: theme.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[typography.caption, { color: theme.textMuted }]}>
                {typeInfo.label}
              </Text>
            </View>
            {/* Cost Badge */}
            <View style={[styles.costBadge, { backgroundColor: costInfo.color + '15', borderColor: costInfo.color + '40' }]}>
              <Ionicons name={costInfo.icon as any} size={12} color={costInfo.color} />
              <Text style={[styles.costText, { color: costInfo.color }]}>{costInfo.label}</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={[typography.bodySmall, { color: theme.textSecondary, marginTop: spacing.sm }]} numberOfLines={2}>
            {item.description}
          </Text>

          {/* Location */}
          {!item.isNational ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={theme.textMuted} />
              <Text style={[typography.caption, { color: theme.textMuted }]}>
                {item.city}, {item.state}
              </Text>
            </View>
          ) : (
            <View style={styles.locationRow}>
              <Ionicons name="globe-outline" size={14} color={theme.textMuted} />
              <Text style={[typography.caption, { color: theme.textMuted }]}>Available Nationwide</Text>
            </View>
          )}

          {/* Rating & Specialties */}
          <View style={styles.resourceFooter}>
            <View style={styles.ratingRow}>
              {item.averageRating > 0 ? (
                <>
                  <View style={styles.starsRow}>{renderStars(item.averageRating)}</View>
                  <Text style={[typography.caption, { color: theme.textSecondary }]}>
                    {item.averageRating.toFixed(1)} ({item.totalReviews})
                  </Text>
                </>
              ) : (
                <Text style={[typography.caption, { color: theme.textMuted }]}>No reviews yet</Text>
              )}
            </View>
            {item.accreditedByVA && (
              <View style={[styles.accreditedBadge, { backgroundColor: theme.success + '15' }]}>
                <Ionicons name="shield-checkmark" size={11} color={theme.success} />
                <Text style={[styles.accreditedText, { color: theme.success }]}>VA ACCREDITED</Text>
              </View>
            )}
          </View>

          {/* Specialties Tags */}
          {item.specialties && item.specialties.length > 0 && (
            <View style={styles.specialtiesRow}>
              {item.specialties.slice(0, 3).map((spec, idx) => (
                <View key={idx} style={[styles.specTag, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[typography.overline, { color: theme.textSecondary }]}>{spec}</Text>
                </View>
              ))}
              {item.specialties.length > 3 && (
                <Text style={[typography.caption, { color: theme.textMuted }]}>
                  +{item.specialties.length - 3}
                </Text>
              )}
            </View>
          )}
        </View>
      </Card>
    );
  }

  const costFilters: { key: CostFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'free', label: '🆓 Free' },
    { key: 'contingency', label: '💰 Contingency' },
    { key: 'paid', label: '💲 Paid' },
  ];

  const typeFilters: { key: ResourceType | 'all'; label: string }[] = [
    { key: 'all', label: 'All Types' },
    { key: 'vso', label: 'VSOs' },
    { key: 'attorney', label: 'Attorneys' },
    { key: 'nonprofit', label: 'Nonprofits' },
    { key: 'va_facility', label: 'VA Facilities' },
    { key: 'vet_center', label: 'Vet Centers' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: theme.text }]}>Claim Resources</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={[typography.bodySmall, { color: theme.textSecondary, marginTop: spacing.xs }]}>
          Find help with your VA claim — rated by fellow veterans
        </Text>

        {/* Search */}
        <View style={{ marginTop: spacing.md }}>
          <Input
            placeholder="Search by name, location, or specialty..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search resources"
          />
        </View>

        {/* Cost Filters */}
        <View style={styles.filterScroll} accessibilityRole="tablist" accessibilityLabel="Filter by cost">
          {costFilters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                {
                  borderColor: costFilter === f.key ? theme.primary : theme.border,
                  backgroundColor: costFilter === f.key ? theme.primary + '15' : 'transparent',
                },
              ]}
              onPress={() => setCostFilter(f.key)}
              accessible={true}
              accessibilityRole="tab"
              accessibilityState={{ selected: costFilter === f.key }}
              accessibilityLabel={f.label}
            >
              <Text
                style={[
                  typography.caption,
                  { color: costFilter === f.key ? theme.primary : theme.textMuted, fontWeight: '600' },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Type Filters */}
        <View style={styles.filterScroll} accessibilityRole="tablist" accessibilityLabel="Filter by type">
          {typeFilters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                {
                  borderColor: typeFilter === f.key ? theme.primary : theme.border,
                  backgroundColor: typeFilter === f.key ? theme.primary + '15' : 'transparent',
                },
              ]}
              onPress={() => setTypeFilter(f.key)}
              accessible={true}
              accessibilityRole="tab"
              accessibilityState={{ selected: typeFilter === f.key }}
              accessibilityLabel={f.label}
            >
              <Text
                style={[
                  typography.caption,
                  { color: typeFilter === f.key ? theme.primary : theme.textMuted, fontWeight: '600' },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Results */}
      <FlatList
        data={filteredResources}
        keyExtractor={(item) => item.id}
        renderItem={renderResource}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState} accessible={true} accessibilityRole="text">
            <Ionicons name="search-outline" size={48} color={theme.textMuted} />
            <Text style={[typography.h4, { color: theme.textMuted, marginTop: spacing.md }]}>
              No resources found
            </Text>
            <Text style={[typography.bodySmall, { color: theme.textMuted, textAlign: 'center' }]}>
              Try adjusting your filters or search terms
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  filterScroll: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    minHeight: 32,
    justifyContent: 'center',
  },
  listContent: { paddingTop: spacing.md, paddingBottom: 40 },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  costText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  resourceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  accreditedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  accreditedText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  specialtiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  specTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
  },
});
