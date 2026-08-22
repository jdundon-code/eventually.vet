// ============================================================================
// EVENTUALLY.VET - VA Content & Regulations Screen
// Browse presumptive conditions, rating criteria, and VA news
// Auto-flags conditions matching user's exposures
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StatusBar,
  RefreshControl,
  AccessibilityInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import {
  vaContentService,
  PresumptiveCondition,
  PresumptiveCategory,
  VANewsItem,
  RatingCriteria,
} from '../../services/vaContentService';
import { database } from '../../services/database';
import { Deployment } from '../../models/types';
import { formatDate } from '../../utils/dates';

type TabView = 'matches' | 'all' | 'ratings' | 'news';

const categoryLabels: Record<PresumptiveCategory, string> = {
  respiratory: 'Respiratory',
  cancer: 'Cancer',
  musculoskeletal: 'Musculoskeletal',
  neurological: 'Neurological',
  cardiovascular: 'Cardiovascular',
  hearing: 'Hearing',
  mental_health: 'Mental Health',
  skin: 'Skin',
  gastrointestinal: 'GI / Digestive',
  reproductive: 'Reproductive',
  other: 'Other',
};

const categoryIcons: Record<PresumptiveCategory, string> = {
  respiratory: 'cloud',
  cancer: 'alert-circle',
  musculoskeletal: 'body',
  neurological: 'flash',
  cardiovascular: 'heart',
  hearing: 'ear',
  mental_health: 'brain',
  skin: 'finger-print',
  gastrointestinal: 'nutrition',
  reproductive: 'people',
  other: 'medical',
};

export function VAContentScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabView>('matches');
  const [matches, setMatches] = useState<PresumptiveCondition[]>([]);
  const [allConditions, setAllConditions] = useState<PresumptiveCondition[]>([]);
  const [ratingCriteria, setRatingCriteria] = useState<RatingCriteria[]>([]);
  const [news, setNews] = useState<VANewsItem[]>([]);
  const [userExposures, setUserExposures] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadContent();
    }, [])
  );

  async function loadContent() {
    await vaContentService.initialize();

    // Get user's exposures from deployments
    const profile = await database.getUserProfile();
    if (profile) {
      const deployments = await database.getDeployments(profile.id);
      const exposures = new Set<string>();
      deployments.forEach((dep: Deployment) => {
        dep.hazards.forEach((h) => exposures.add(h));
        // Add location as a potential match
        exposures.add(dep.location);
      });
      const exposureList = Array.from(exposures);
      setUserExposures(exposureList);

      // Get matching presumptives
      const matchingConditions = vaContentService.getMatchingPresumptives(exposureList);
      setMatches(matchingConditions);
    }

    setAllConditions(vaContentService.getPresumptiveConditions());
    setRatingCriteria(vaContentService.getAllRatingCriteria());
    setNews(vaContentService.getNews());
  }

  async function handleRefresh() {
    setRefreshing(true);
    const { updated, newItems } = await vaContentService.checkForUpdates();
    await loadContent();
    setRefreshing(false);
  }

  const filteredConditions = searchQuery
    ? vaContentService.searchPresumptives(searchQuery)
    : allConditions;

  function renderMatch({ item }: { item: PresumptiveCondition }) {
    const isExpanded = expandedId === item.id;
    return (
      <Card
        style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm }}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
      >
        <View
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${item.name}. Category: ${categoryLabels[item.category]}. ${item.pactActCovered ? 'PACT Act covered.' : ''}`}
          accessibilityHint="Tap to expand details"
        >
          <View style={styles.conditionHeader}>
            <View style={[styles.categoryIcon, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name={categoryIcons[item.category] as any} size={18} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: theme.text }]}>{item.name}</Text>
              <View style={styles.tagRow}>
                <View style={[styles.categoryTag, { backgroundColor: theme.surface }]}>
                  <Text style={[typography.overline, { color: theme.textMuted }]}>
                    {categoryLabels[item.category]}
                  </Text>
                </View>
                {item.pactActCovered && (
                  <View style={[styles.pactBadge, { backgroundColor: theme.success + '20' }]}>
                    <Text style={[typography.overline, { color: theme.success }]}>PACT ACT</Text>
                  </View>
                )}
              </View>
            </View>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.textMuted}
            />
          </View>

          {isExpanded && (
            <View style={[styles.expandedContent, { borderTopColor: theme.border }]}>
              <Text style={[typography.bodySmall, { color: theme.textSecondary, marginBottom: spacing.md }]}>
                {item.description}
              </Text>

              <DetailRow
                label="Eligible Exposures"
                value={item.eligibleExposures.join(', ')}
                theme={theme}
              />
              <DetailRow label="Evidence Needed" value={item.evidenceNeeded} theme={theme} />
              {item.ratingCriteria && (
                <DetailRow label="Rating Info" value={item.ratingCriteria} theme={theme} />
              )}
              <DetailRow label="VA Regulation" value={item.vaRegulationRef} theme={theme} />
              <DetailRow label="Effective Date" value={formatDate(item.effectiveDate)} theme={theme} />

              {/* Matching exposures highlight */}
              {userExposures.length > 0 && (
                <View style={[styles.matchBox, { backgroundColor: theme.warning + '10', borderColor: theme.warning + '30' }]}>
                  <Ionicons name="alert-circle" size={16} color={theme.warning} />
                  <Text style={[typography.caption, { color: theme.warning, flex: 1 }]}>
                    Your logged exposures match: {item.eligibleExposures
                      .filter((e) => userExposures.some((ue) => ue.toLowerCase().includes(e.toLowerCase())))
                      .join(', ') || 'location/service match'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Card>
    );
  }

  function renderRating({ item }: { item: RatingCriteria }) {
    const isExpanded = expandedId === item.id;
    return (
      <Card
        style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm }}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
      >
        <View
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${item.conditionName}. Diagnostic Code ${item.diagnosticCode}.`}
          accessibilityHint="Tap to see rating percentages"
        >
          <View style={styles.conditionHeader}>
            <View style={[styles.categoryIcon, { backgroundColor: theme.info + '20' }]}>
              <Text style={[typography.bodyBold, { color: theme.info, fontSize: 11 }]}>
                {item.diagnosticCode}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: theme.text }]}>{item.conditionName}</Text>
              <Text style={[typography.caption, { color: theme.textMuted }]}>DC {item.diagnosticCode} • {item.cfrReference}</Text>
            </View>
            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.textMuted} />
          </View>

          {isExpanded && (
            <View style={[styles.expandedContent, { borderTopColor: theme.border }]}>
              {item.schedule.map((level, idx) => (
                <View key={idx} style={styles.ratingRow}>
                  <View style={[styles.percentBadge, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={[typography.bodyBold, { color: theme.primary }]}>{level.percent}%</Text>
                  </View>
                  <Text style={[typography.bodySmall, { color: theme.textSecondary, flex: 1 }]}>
                    {level.criteria}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Card>
    );
  }

  function renderNewsItem({ item }: { item: VANewsItem }) {
    const priorityColors = {
      low: theme.textMuted,
      medium: theme.info,
      high: theme.warning,
      urgent: theme.error,
    };
    return (
      <Card style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm }}>
        <View
          accessible={true}
          accessibilityRole="article"
          accessibilityLabel={`${item.title}. Priority: ${item.priority}. ${item.summary}`}
        >
          <View style={styles.newsHeader}>
            <View style={[styles.priorityDot, { backgroundColor: priorityColors[item.priority] }]} />
            <Text style={[typography.bodyBold, { color: theme.text, flex: 1 }]}>{item.title}</Text>
          </View>
          <Text style={[typography.bodySmall, { color: theme.textSecondary, marginTop: spacing.xs }]}>
            {item.summary}
          </Text>
          {item.publishedAt && (
            <Text style={[typography.caption, { color: theme.textMuted, marginTop: spacing.sm }]}>
              {formatDate(item.publishedAt)}
            </Text>
          )}
        </View>
      </Card>
    );
  }

  // Determine which list to show
  const tabs: { key: TabView; label: string; count?: number }[] = [
    { key: 'matches', label: 'Your Matches', count: matches.length },
    { key: 'all', label: 'All Presumptives', count: allConditions.length },
    { key: 'ratings', label: 'Rating Criteria' },
    { key: 'news', label: 'Updates' },
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
          <Text style={[typography.h3, { color: theme.text }]}>VA Regulations</Text>
          <TouchableOpacity
            onPress={handleRefresh}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Check for content updates"
          >
            <Ionicons name="refresh" size={22} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          accessibilityRole="tablist"
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                {
                  borderColor: activeTab === tab.key ? theme.primary : theme.border,
                  backgroundColor: activeTab === tab.key ? theme.primary + '15' : 'transparent',
                },
              ]}
              onPress={() => setActiveTab(tab.key)}
              accessible={true}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === tab.key }}
              accessibilityLabel={`${tab.label}${tab.count !== undefined ? `, ${tab.count} items` : ''}`}
            >
              <Text
                style={[
                  typography.buttonSmall,
                  { color: activeTab === tab.key ? theme.primary : theme.textMuted },
                ]}
              >
                {tab.label}
                {tab.count !== undefined ? ` (${tab.count})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {activeTab === 'matches' && (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={renderMatch}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
          ListHeaderComponent={
            matches.length > 0 ? (
              <View style={styles.matchBanner} accessible={true} accessibilityRole="alert">
                <Ionicons name="alert-circle" size={20} color={theme.warning} />
                <Text style={[typography.bodySmall, { color: theme.warning, flex: 1 }]}>
                  Based on your logged deployments and exposures, you may qualify for the following presumptive conditions.
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark-outline" size={48} color={theme.textMuted} />
              <Text style={[typography.h4, { color: theme.textMuted, marginTop: spacing.md }]}>No Matches Yet</Text>
              <Text style={[typography.bodySmall, { color: theme.textMuted, textAlign: 'center' }]}>
                Add deployments with hazard exposures to see which presumptive conditions you may qualify for.
              </Text>
            </View>
          }
        />
      )}

      {activeTab === 'all' && (
        <FlatList
          data={filteredConditions}
          keyExtractor={(item) => item.id}
          renderItem={renderMatch}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
              <Input
                placeholder="Search conditions..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                accessibilityLabel="Search presumptive conditions"
              />
            </View>
          }
        />
      )}

      {activeTab === 'ratings' && (
        <FlatList
          data={ratingCriteria}
          keyExtractor={(item) => item.id}
          renderItem={renderRating}
          contentContainerStyle={styles.listContent}
        />
      )}

      {activeTab === 'news' && (
        <FlatList
          data={news}
          keyExtractor={(item) => item.id}
          renderItem={renderNewsItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="newspaper-outline" size={48} color={theme.textMuted} />
              <Text style={[typography.h4, { color: theme.textMuted, marginTop: spacing.md }]}>No Updates Yet</Text>
              <Text style={[typography.bodySmall, { color: theme.textMuted, textAlign: 'center' }]}>
                VA regulation changes and news will appear here as they're published.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function DetailRow({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={styles.detailRow} accessible={true} accessibilityLabel={`${label}: ${value}`}>
      <Text style={[typography.caption, { color: theme.textMuted, fontWeight: '600' }]}>{label}</Text>
      <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>{value}</Text>
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
    marginBottom: spacing.md,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  tabScroll: { marginBottom: spacing.sm },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    marginRight: spacing.sm,
  },
  listContent: { paddingTop: spacing.md, paddingBottom: 40 },
  matchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,193,7,0.08)',
  },
  conditionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagRow: { flexDirection: 'row', gap: spacing.xs, marginTop: 4 },
  categoryTag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  pactBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  expandedContent: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1 },
  detailRow: { marginBottom: spacing.sm },
  matchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  percentBadge: {
    width: 48,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.xl,
  },
});
