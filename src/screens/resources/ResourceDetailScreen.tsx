// ============================================================================
// EVENTUALLY.VET - Resource Detail & Reviews Screen
// Shows full resource info, veteran reviews, and submit review form
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import {
  resourcesService,
  Resource,
  ResourceReview,
  ResourcesService,
} from '../../services/resourcesService';
import { formatDate } from '../../utils/dates';

export function ResourceDetailScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { id } = route.params;
  const [resource, setResource] = useState<Resource | null>(null);
  const [reviews, setReviews] = useState<ResourceReview[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Review form state
  const [rating, setRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [claimOutcome, setClaimOutcome] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadResource();
  }, [id]);

  async function loadResource() {
    const res = await resourcesService.getResourceById(id);
    setResource(res);
    if (res) {
      const revs = await resourcesService.getReviews(id);
      setReviews(revs);
    }
  }

  async function handleSubmitReview() {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating.');
      return;
    }
    if (!reviewComment.trim()) {
      Alert.alert('Comment Required', 'Please share your experience.');
      return;
    }

    setSubmitting(true);
    const { success, error } = await resourcesService.submitReview({
      resourceId: id,
      rating,
      title: reviewTitle.trim() || `${rating}-star review`,
      comment: reviewComment.trim(),
      helpful: helpful ?? true,
      claimOutcome: claimOutcome || undefined,
      displayName: undefined, // Anonymous by default
    });
    setSubmitting(false);

    if (success) {
      Alert.alert('Thank You!', 'Your review helps other veterans find the right resources.');
      setShowReviewForm(false);
      setRating(0);
      setReviewTitle('');
      setReviewComment('');
      setHelpful(null);
      setClaimOutcome('');
      await loadResource();
    } else {
      Alert.alert('Error', error || 'Failed to submit review. Please try again.');
    }
  }

  function renderStars(value: number, interactive: boolean = false) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (interactive) {
        stars.push(
          <TouchableOpacity
            key={i}
            onPress={() => setRating(i)}
            style={styles.starButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`${i} star${i > 1 ? 's' : ''}`}
            accessibilityState={{ selected: i <= value }}
          >
            <Ionicons
              name={i <= value ? 'star' : 'star-outline'}
              size={32}
              color={i <= value ? '#FFC107' : theme.textMuted}
            />
          </TouchableOpacity>
        );
      } else {
        stars.push(
          <Ionicons
            key={i}
            name={i <= Math.round(value) ? 'star' : 'star-outline'}
            size={16}
            color={i <= Math.round(value) ? '#FFC107' : theme.textMuted}
          />
        );
      }
    }
    return stars;
  }

  if (!resource) return null;

  const typeInfo = ResourcesService.getTypeInfo(resource.type);
  const costInfo = ResourcesService.getCostInfo(resource.costType);

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
          <Text style={[typography.h3, { color: theme.text, flex: 1 }]} numberOfLines={1}>
            {resource.name}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Resource Info Card */}
        <Card style={{ margin: spacing.lg }} elevated>
          <View style={styles.resourceHeaderSection}>
            <View style={[styles.typeIcon, { backgroundColor: typeInfo.color + '20' }]}>
              <Ionicons name={typeInfo.icon as any} size={28} color={typeInfo.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.h4, { color: theme.text }]}>{resource.name}</Text>
              <Text style={[typography.bodySmall, { color: theme.textMuted }]}>{typeInfo.label}</Text>
            </View>
          </View>

          {/* Cost & Accreditation */}
          <View style={styles.badgeRow}>
            <View style={[styles.costBadgeLg, { backgroundColor: costInfo.color + '15', borderColor: costInfo.color + '40' }]}>
              <Ionicons name={costInfo.icon as any} size={16} color={costInfo.color} />
              <Text style={[typography.bodySmall, { color: costInfo.color, fontWeight: '700' }]}>
                {costInfo.label}
              </Text>
            </View>
            {resource.accreditedByVA && (
              <View style={[styles.costBadgeLg, { backgroundColor: theme.success + '15', borderColor: theme.success + '40' }]}>
                <Ionicons name="shield-checkmark" size={16} color={theme.success} />
                <Text style={[typography.bodySmall, { color: theme.success, fontWeight: '700' }]}>VA Accredited</Text>
              </View>
            )}
          </View>

          {resource.costDetails && (
            <Text style={[typography.bodySmall, { color: theme.textSecondary, marginTop: spacing.sm }]}>
              💰 {resource.costDetails}
            </Text>
          )}

          {/* Rating Summary */}
          <View style={[styles.ratingSummary, { borderTopColor: theme.border }]}>
            <View style={styles.ratingDisplay}>
              <Text style={[typography.h2, { color: theme.text }]}>
                {resource.averageRating > 0 ? resource.averageRating.toFixed(1) : '—'}
              </Text>
              <View>
                <View style={styles.starsRow}>{renderStars(resource.averageRating)}</View>
                <Text style={[typography.caption, { color: theme.textMuted }]}>
                  {resource.totalReviews} review{resource.totalReviews !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Description */}
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <Text style={[typography.label, { color: theme.primary, marginBottom: spacing.sm }]}>ABOUT</Text>
          <Text style={[typography.body, { color: theme.textSecondary }]}>{resource.description}</Text>
        </View>

        {/* Services */}
        {resource.services.length > 0 && (
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
            <Text style={[typography.label, { color: theme.primary, marginBottom: spacing.sm }]}>SERVICES</Text>
            {resource.services.map((service, idx) => (
              <View key={idx} style={styles.serviceItem}>
                <Ionicons name="checkmark" size={16} color={theme.success} />
                <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>{service}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Contact */}
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <Text style={[typography.label, { color: theme.primary, marginBottom: spacing.sm }]}>CONTACT</Text>
          {resource.phone && (
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => Linking.openURL(`tel:${resource.phone}`)}
              accessible={true}
              accessibilityRole="link"
              accessibilityLabel={`Call ${resource.phone}`}
            >
              <Ionicons name="call" size={18} color={theme.info} />
              <Text style={[typography.body, { color: theme.info }]}>{resource.phone}</Text>
            </TouchableOpacity>
          )}
          {resource.website && (
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => Linking.openURL(resource.website!)}
              accessible={true}
              accessibilityRole="link"
              accessibilityLabel={`Visit website`}
            >
              <Ionicons name="globe" size={18} color={theme.info} />
              <Text style={[typography.body, { color: theme.info }]} numberOfLines={1}>
                {resource.website.replace('https://', '').replace('www.', '')}
              </Text>
            </TouchableOpacity>
          )}
          {resource.email && (
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => Linking.openURL(`mailto:${resource.email}`)}
              accessible={true}
              accessibilityRole="link"
              accessibilityLabel={`Email ${resource.email}`}
            >
              <Ionicons name="mail" size={18} color={theme.info} />
              <Text style={[typography.body, { color: theme.info }]}>{resource.email}</Text>
            </TouchableOpacity>
          )}
          {!resource.isNational && resource.address && (
            <View style={styles.contactRow}>
              <Ionicons name="location" size={18} color={theme.textMuted} />
              <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>
                {resource.address}, {resource.city}, {resource.state} {resource.zipCode}
              </Text>
            </View>
          )}
        </View>

        {/* Reviews Section */}
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
          <View style={styles.reviewsHeader}>
            <Text style={[typography.h4, { color: theme.text }]}>
              Veteran Reviews ({reviews.length})
            </Text>
            <Button
              title="Write Review"
              onPress={() => setShowReviewForm(!showReviewForm)}
              variant="outline"
              size="small"
              icon={<Ionicons name="create" size={14} color={theme.primary} />}
            />
          </View>
        </View>

        {/* Review Form */}
        {showReviewForm && (
          <Card style={{ marginHorizontal: spacing.lg, marginBottom: spacing.lg }} elevated>
            <Text style={[typography.label, { color: theme.primary, marginBottom: spacing.md }]}>YOUR REVIEW</Text>

            {/* Star Rating */}
            <Text style={[typography.bodySmall, { color: theme.textSecondary, marginBottom: spacing.xs }]}>
              Tap to rate:
            </Text>
            <View style={styles.starRating} accessibilityRole="adjustable" accessibilityLabel={`Rating: ${rating} out of 5`}>
              {renderStars(rating, true)}
            </View>

            <Input
              label="Title (Optional)"
              value={reviewTitle}
              onChangeText={setReviewTitle}
              placeholder="Summarize your experience"
            />

            <Input
              label="Your Experience"
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="How was your experience? Did they help with your claim? Would you recommend to other veterans?"
              multiline
              numberOfLines={4}
              required
            />

            {/* Helpful? */}
            <Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.sm }]}>
              WERE THEY HELPFUL?
            </Text>
            <View style={styles.helpfulRow}>
              <TouchableOpacity
                style={[
                  styles.helpfulBtn,
                  { borderColor: helpful === true ? theme.success : theme.border, backgroundColor: helpful === true ? theme.success + '15' : 'transparent' },
                ]}
                onPress={() => setHelpful(true)}
                accessible={true}
                accessibilityRole="radio"
                accessibilityState={{ checked: helpful === true }}
                accessibilityLabel="Yes, they were helpful"
              >
                <Ionicons name="thumbs-up" size={18} color={helpful === true ? theme.success : theme.textMuted} />
                <Text style={[typography.bodySmall, { color: helpful === true ? theme.success : theme.textMuted }]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.helpfulBtn,
                  { borderColor: helpful === false ? theme.error : theme.border, backgroundColor: helpful === false ? theme.error + '15' : 'transparent' },
                ]}
                onPress={() => setHelpful(false)}
                accessible={true}
                accessibilityRole="radio"
                accessibilityState={{ checked: helpful === false }}
                accessibilityLabel="No, they were not helpful"
              >
                <Ionicons name="thumbs-down" size={18} color={helpful === false ? theme.error : theme.textMuted} />
                <Text style={[typography.bodySmall, { color: helpful === false ? theme.error : theme.textMuted }]}>No</Text>
              </TouchableOpacity>
            </View>

            {/* Claim Outcome */}
            <Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.sm, marginTop: spacing.md }]}>
              CLAIM OUTCOME (OPTIONAL)
            </Text>
            <View style={styles.outcomeRow}>
              {['approved', 'increased', 'denied', 'pending'].map((outcome) => (
                <TouchableOpacity
                  key={outcome}
                  style={[
                    styles.outcomeChip,
                    { borderColor: claimOutcome === outcome ? theme.primary : theme.border, backgroundColor: claimOutcome === outcome ? theme.primary + '15' : 'transparent' },
                  ]}
                  onPress={() => setClaimOutcome(claimOutcome === outcome ? '' : outcome)}
                  accessible={true}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: claimOutcome === outcome }}
                  accessibilityLabel={`Claim outcome: ${outcome}`}
                >
                  <Text style={[typography.caption, { color: claimOutcome === outcome ? theme.primary : theme.textMuted, fontWeight: '600' }]}>
                    {outcome.charAt(0).toUpperCase() + outcome.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title="Submit Review"
              onPress={handleSubmitReview}
              variant="primary"
              loading={submitting}
              style={{ marginTop: spacing.lg }}
            />
          </Card>
        )}

        {/* Review List */}
        {reviews.length > 0 ? (
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xxl }}>
            {reviews.map((review) => (
              <Card key={review.id} style={{ marginBottom: spacing.sm }}>
                <View accessible={true} accessibilityRole="article" accessibilityLabel={`Review by veteran. ${review.rating} stars. ${review.comment}`}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.starsRow}>{renderStars(review.rating)}</View>
                    <Text style={[typography.caption, { color: theme.textMuted }]}>
                      {formatDate(review.createdAt)}
                    </Text>
                  </View>
                  {review.title && (
                    <Text style={[typography.bodyBold, { color: theme.text, marginTop: spacing.xs }]}>
                      {review.title}
                    </Text>
                  )}
                  <Text style={[typography.bodySmall, { color: theme.textSecondary, marginTop: spacing.xs }]}>
                    {review.comment}
                  </Text>
                  <View style={styles.reviewFooter}>
                    {review.helpful !== undefined && (
                      <View style={styles.helpfulIndicator}>
                        <Ionicons
                          name={review.helpful ? 'thumbs-up' : 'thumbs-down'}
                          size={12}
                          color={review.helpful ? theme.success : theme.error}
                        />
                        <Text style={[typography.caption, { color: review.helpful ? theme.success : theme.error }]}>
                          {review.helpful ? 'Helpful' : 'Not helpful'}
                        </Text>
                      </View>
                    )}
                    {review.claimOutcome && (
                      <Text style={[typography.caption, { color: theme.textMuted }]}>
                        Outcome: {review.claimOutcome}
                      </Text>
                    )}
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xxl, alignItems: 'center' }}>
            <Text style={[typography.bodySmall, { color: theme.textMuted, textAlign: 'center' }]}>
              No reviews yet. Be the first to share your experience!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 40 },
  resourceHeaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  typeIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  costBadgeLg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  ratingSummary: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1 },
  ratingDisplay: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  starsRow: { flexDirection: 'row', gap: 2 },
  serviceItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  reviewsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  starRating: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg, justifyContent: 'center' },
  starButton: { padding: spacing.xs, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  helpfulRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  helpfulBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    minHeight: 44,
  },
  outcomeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  outcomeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    minHeight: 36,
    justifyContent: 'center',
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewFooter: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, alignItems: 'center' },
  helpfulIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
