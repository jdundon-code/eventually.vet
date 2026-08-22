// ============================================================================
// EVENTUALLY.VET - Resources Service
// Directory of VA claim assistance resources — VSOs, attorneys, claim agents
// Location-based search, free/paid indicators, veteran community ratings
// ============================================================================

import { supabase } from './supabase';
import { database } from './database';
import { generateId } from '../utils/uuid';
import { getNowISO } from '../utils/dates';

// ============================================================================
// TYPES
// ============================================================================

export type ResourceType =
  | 'vso'              // Veterans Service Organization (free)
  | 'attorney'         // VA-accredited attorney (paid, contingency)
  | 'claims_agent'     // VA-accredited claims agent (paid)
  | 'va_facility'      // VA Medical Center / Regional Office
  | 'vet_center'       // Vet Center (free counseling)
  | 'nonprofit'        // Nonprofit assistance
  | 'online_service'   // Online claim filing service
  | 'support_group'    // Peer support group
  | 'other';

export type CostType = 'free' | 'paid' | 'contingency' | 'sliding_scale';

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  costType: CostType;
  costDetails?: string; // e.g., "20% of backpay" or "$150/hr"
  description: string;
  services: string[]; // What they help with
  address?: string;
  city: string;
  state: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
  accreditedByVA: boolean; // VA OGC accredited
  specialties?: string[]; // e.g., ["PTSD", "TBI", "burn pit", "appeals"]
  averageRating: number; // 1-5 average
  totalReviews: number;
  isNational: boolean; // Available nationwide (online services, national VSOs)
  operatingHours?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceReview {
  id: string;
  resourceId: string;
  userId: string; // Anonymous identifier
  rating: number; // 1-5
  title: string;
  comment: string;
  helpful: boolean; // Did they help with the claim?
  claimOutcome?: 'approved' | 'denied' | 'pending' | 'increased' | 'not_applicable';
  serviceUsed?: string; // What service was used
  createdAt: string;
  displayName?: string; // Optional display name (branch + "Veteran")
}

export interface ResourceSearchParams {
  query?: string;
  type?: ResourceType;
  costType?: CostType;
  state?: string;
  city?: string;
  zipCode?: string;
  specialty?: string;
  minRating?: number;
  nationalOnly?: boolean;
  freeOnly?: boolean;
}

// ============================================================================
// SERVICE
// ============================================================================

class ResourcesService {
  private cachedResources: Resource[] = [];
  private lastFetch: string | null = null;

  // =========================================================================
  // RESOURCE FETCHING
  // =========================================================================

  /**
   * Get all resources, with optional filtering
   */
  async getResources(params?: ResourceSearchParams): Promise<Resource[]> {
    // Try fetching from Supabase first
    await this.fetchFromCloud();

    let results = [...this.cachedResources];

    if (!params) return results;

    // Apply filters
    if (params.query) {
      const q = params.query.toLowerCase();
      results = results.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.services.some((s) => s.toLowerCase().includes(q)) ||
          (r.specialties || []).some((s) => s.toLowerCase().includes(q))
      );
    }

    if (params.type) {
      results = results.filter((r) => r.type === params.type);
    }

    if (params.costType) {
      results = results.filter((r) => r.costType === params.costType);
    }

    if (params.freeOnly) {
      results = results.filter((r) => r.costType === 'free');
    }

    if (params.state) {
      const state = params.state.toLowerCase();
      results = results.filter(
        (r) => r.state.toLowerCase() === state || r.isNational
      );
    }

    if (params.city) {
      const city = params.city.toLowerCase();
      results = results.filter(
        (r) => r.city.toLowerCase().includes(city) || r.isNational
      );
    }

    if (params.specialty) {
      const spec = params.specialty.toLowerCase();
      results = results.filter((r) =>
        (r.specialties || []).some((s) => s.toLowerCase().includes(spec))
      );
    }

    if (params.minRating) {
      results = results.filter((r) => r.averageRating >= params.minRating!);
    }

    if (params.nationalOnly) {
      results = results.filter((r) => r.isNational);
    }

    // Sort by rating (highest first), then by review count
    results.sort((a, b) => {
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
      return b.totalReviews - a.totalReviews;
    });

    return results;
  }

  /**
   * Get a single resource by ID
   */
  async getResourceById(id: string): Promise<Resource | null> {
    await this.fetchFromCloud();
    return this.cachedResources.find((r) => r.id === id) || null;
  }

  /**
   * Get resources near a location (by state/city)
   */
  async getLocalResources(state: string, city?: string): Promise<Resource[]> {
    return this.getResources({ state, city });
  }

  /**
   * Get free resources only
   */
  async getFreeResources(state?: string): Promise<Resource[]> {
    return this.getResources({ freeOnly: true, state });
  }

  // =========================================================================
  // REVIEWS
  // =========================================================================

  /**
   * Get reviews for a specific resource
   */
  async getReviews(resourceId: string): Promise<ResourceReview[]> {
    try {
      const { data, error } = await supabase
        .from('resource_reviews')
        .select('*')
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false });

      if (error || !data) {
        // Fall back to cached reviews
        const cached = await database.getSetting(`reviews_${resourceId}`);
        return cached ? JSON.parse(cached) : [];
      }

      const reviews = data.map((row) => ({
        id: row.id,
        resourceId: row.resource_id,
        userId: row.user_id,
        rating: row.rating,
        title: row.title,
        comment: row.comment,
        helpful: row.helpful,
        claimOutcome: row.claim_outcome,
        serviceUsed: row.service_used,
        createdAt: row.created_at,
        displayName: row.display_name,
      })) as ResourceReview[];

      // Cache locally
      await database.setSetting(`reviews_${resourceId}`, JSON.stringify(reviews));

      return reviews;
    } catch (e) {
      const cached = await database.getSetting(`reviews_${resourceId}`);
      return cached ? JSON.parse(cached) : [];
    }
  }

  /**
   * Submit a review for a resource
   */
  async submitReview(review: {
    resourceId: string;
    rating: number;
    title: string;
    comment: string;
    helpful: boolean;
    claimOutcome?: string;
    serviceUsed?: string;
    displayName?: string;
  }): Promise<{ success: boolean; error: string | null }> {
    try {
      const session = await supabase.auth.getSession();
      const userId = session.data.session?.user?.id || `anon_${generateId().slice(0, 8)}`;

      const { error } = await supabase
        .from('resource_reviews')
        .insert({
          id: generateId(),
          resource_id: review.resourceId,
          user_id: userId,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          helpful: review.helpful,
          claim_outcome: review.claimOutcome || null,
          service_used: review.serviceUsed || null,
          display_name: review.displayName || null,
          created_at: getNowISO(),
        });

      if (error) {
        return { success: false, error: error.message };
      }

      // Update resource average rating
      await this.updateResourceRating(review.resourceId);

      return { success: true, error: null };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to submit review' };
    }
  }

  /**
   * Recalculate average rating for a resource
   */
  private async updateResourceRating(resourceId: string): Promise<void> {
    try {
      const { data } = await supabase
        .from('resource_reviews')
        .select('rating')
        .eq('resource_id', resourceId);

      if (data && data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        await supabase
          .from('resources')
          .update({
            average_rating: Math.round(avg * 10) / 10,
            total_reviews: data.length,
          })
          .eq('id', resourceId);

        // Update local cache
        const resource = this.cachedResources.find((r) => r.id === resourceId);
        if (resource) {
          resource.averageRating = Math.round(avg * 10) / 10;
          resource.totalReviews = data.length;
        }
      }
    } catch (e) {
      console.warn('Failed to update resource rating:', e);
    }
  }

  // =========================================================================
  // CLOUD SYNC
  // =========================================================================

  private async fetchFromCloud(): Promise<void> {
    // Only fetch every 30 minutes
    if (this.lastFetch) {
      const elapsed = Date.now() - new Date(this.lastFetch).getTime();
      if (elapsed < 30 * 60 * 1000 && this.cachedResources.length > 0) return;
    }

    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('is_active', true)
        .order('average_rating', { ascending: false });

      if (!error && data && data.length > 0) {
        this.cachedResources = data.map((row) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          costType: row.cost_type,
          costDetails: row.cost_details,
          description: row.description,
          services: row.services || [],
          address: row.address,
          city: row.city,
          state: row.state,
          zipCode: row.zip_code,
          latitude: row.latitude,
          longitude: row.longitude,
          phone: row.phone,
          email: row.email,
          website: row.website,
          accreditedByVA: row.accredited_by_va,
          specialties: row.specialties || [],
          averageRating: row.average_rating || 0,
          totalReviews: row.total_reviews || 0,
          isNational: row.is_national,
          operatingHours: row.operating_hours,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })) as Resource[];

        this.lastFetch = getNowISO();
        await database.setSetting('cached_resources', JSON.stringify(this.cachedResources));
      }
    } catch (e) {
      // Fall back to cache
      const cached = await database.getSetting('cached_resources');
      if (cached && this.cachedResources.length === 0) {
        this.cachedResources = JSON.parse(cached);
      }
    }

    // If still empty, load built-in defaults
    if (this.cachedResources.length === 0) {
      this.cachedResources = DEFAULT_RESOURCES;
    }
  }

  /**
   * Get list of all states represented in resources
   */
  getAvailableStates(): string[] {
    const states = new Set(this.cachedResources.map((r) => r.state));
    return Array.from(states).sort();
  }

  /**
   * Get resource type display info
   */
  static getTypeInfo(type: ResourceType): { label: string; icon: string; color: string } {
    const typeInfo: Record<ResourceType, { label: string; icon: string; color: string }> = {
      vso: { label: 'Veterans Service Organization', icon: 'shield-checkmark', color: '#4CAF50' },
      attorney: { label: 'VA-Accredited Attorney', icon: 'briefcase', color: '#2196F3' },
      claims_agent: { label: 'Claims Agent', icon: 'person-circle', color: '#9C27B0' },
      va_facility: { label: 'VA Facility', icon: 'business', color: '#F44336' },
      vet_center: { label: 'Vet Center', icon: 'heart', color: '#E91E63' },
      nonprofit: { label: 'Nonprofit', icon: 'hand-left', color: '#FF9800' },
      online_service: { label: 'Online Service', icon: 'globe', color: '#00BCD4' },
      support_group: { label: 'Support Group', icon: 'people', color: '#8BC34A' },
      other: { label: 'Other Resource', icon: 'help-circle', color: '#607D8B' },
    };
    return typeInfo[type] || typeInfo.other;
  }

  /**
   * Get cost type display info
   */
  static getCostInfo(costType: CostType): { label: string; color: string; icon: string } {
    const costInfo: Record<CostType, { label: string; color: string; icon: string }> = {
      free: { label: 'Free', color: '#4CAF50', icon: 'checkmark-circle' },
      paid: { label: 'Paid', color: '#F44336', icon: 'cash' },
      contingency: { label: 'Contingency Fee', color: '#FF9800', icon: 'trending-up' },
      sliding_scale: { label: 'Sliding Scale', color: '#2196F3', icon: 'options' },
    };
    return costInfo[costType] || costInfo.paid;
  }
}

// ============================================================================
// DEFAULT RESOURCES (ships with app, updated via Supabase)
// ============================================================================

const DEFAULT_RESOURCES: Resource[] = [
  {
    id: 'res-dav',
    name: 'Disabled American Veterans (DAV)',
    type: 'vso',
    costType: 'free',
    description: 'One of the largest VSOs providing free claim assistance. Over 1,700 DAV-trained volunteers help with claims.',
    services: ['Initial claims', 'Appeals', 'Higher-level reviews', 'Supplemental claims', 'Benefits counseling'],
    city: 'National',
    state: 'ALL',
    website: 'https://www.dav.org',
    phone: '877-426-2838',
    accreditedByVA: true,
    specialties: ['All disability types', 'Appeals', 'Benefits coordination'],
    averageRating: 4.2,
    totalReviews: 0,
    isNational: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'res-vfw',
    name: 'Veterans of Foreign Wars (VFW)',
    type: 'vso',
    costType: 'free',
    description: 'Free claims assistance through accredited service officers at local VFW posts and VA regional offices.',
    services: ['Disability claims', 'Pension claims', 'Appeals', 'DIC claims', 'Education benefits'],
    city: 'National',
    state: 'ALL',
    website: 'https://www.vfw.org',
    phone: '800-839-1899',
    accreditedByVA: true,
    specialties: ['Combat veterans', 'All disability types', 'Pension'],
    averageRating: 4.0,
    totalReviews: 0,
    isNational: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'res-amlegion',
    name: 'American Legion',
    type: 'vso',
    costType: 'free',
    description: 'Free accredited representatives help with disability claims. Local posts in every state.',
    services: ['Disability claims', 'Appeals', 'Benefits counseling', 'Transition assistance'],
    city: 'National',
    state: 'ALL',
    website: 'https://www.legion.org',
    phone: '800-433-3318',
    accreditedByVA: true,
    specialties: ['All disability types', 'Transition', 'Education'],
    averageRating: 3.9,
    totalReviews: 0,
    isNational: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'res-va-aid',
    name: 'VA.gov - File a Claim Online',
    type: 'va_facility',
    costType: 'free',
    description: 'Official VA website for filing disability claims directly. Free, no representative needed.',
    services: ['File initial claims', 'File supplemental claims', 'Request higher-level review', 'Check claim status'],
    city: 'National',
    state: 'ALL',
    website: 'https://www.va.gov/disability/file-disability-claim-form-21-526ez/',
    accreditedByVA: true,
    specialties: ['Self-file', 'All claim types'],
    averageRating: 3.5,
    totalReviews: 0,
    isNational: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'res-vetscenter',
    name: 'Vet Centers (Readjustment Counseling)',
    type: 'vet_center',
    costType: 'free',
    description: 'Free counseling for combat veterans, MST survivors, and families. 300+ locations. No VA enrollment required.',
    services: ['PTSD counseling', 'MST counseling', 'Transition support', 'Group therapy', 'Family counseling'],
    city: 'National',
    state: 'ALL',
    website: 'https://www.vetcenter.va.gov',
    phone: '877-927-8387',
    accreditedByVA: true,
    specialties: ['PTSD', 'MST', 'Readjustment', 'Combat stress'],
    averageRating: 4.5,
    totalReviews: 0,
    isNational: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'res-nvlsp',
    name: 'National Veterans Legal Services Program (NVLSP)',
    type: 'nonprofit',
    costType: 'free',
    description: 'Free legal representation for veterans in VA benefit matters. Specializes in complex appeals and federal court cases.',
    services: ['Appeals', 'Board of Veterans Appeals', 'Court of Appeals for Veterans Claims', 'Class actions'],
    city: 'National',
    state: 'ALL',
    website: 'https://www.nvlsp.org',
    accreditedByVA: true,
    specialties: ['Complex appeals', 'Federal court', 'Systemic issues'],
    averageRating: 4.6,
    totalReviews: 0,
    isNational: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'res-va-attorney-example',
    name: 'Example: VA-Accredited Attorney',
    type: 'attorney',
    costType: 'contingency',
    costDetails: 'Typically 20-33% of backpay awarded. No upfront cost. Only paid if you win.',
    description: 'VA-accredited attorneys can represent you after initial denial. They specialize in complex claims and appeals.',
    services: ['Higher-level reviews', 'Board appeals', 'CAVC appeals', 'CUE motions', 'TDIU claims'],
    city: 'Various',
    state: 'ALL',
    website: 'https://www.va.gov/ogc/apps/accreditation/index.asp',
    accreditedByVA: true,
    specialties: ['Appeals', 'Denials', 'Complex claims', 'TDIU'],
    averageRating: 0,
    totalReviews: 0,
    isNational: true,
    operatingHours: 'Varies by firm',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'res-wwp',
    name: 'Wounded Warrior Project',
    type: 'nonprofit',
    costType: 'free',
    description: 'Free programs for post-9/11 veterans including benefits counseling, mental health support, and peer connections.',
    services: ['Benefits counseling', 'Mental health programs', 'Peer support', 'Career counseling', 'Family support'],
    city: 'National',
    state: 'ALL',
    website: 'https://www.woundedwarriorproject.org',
    phone: '888-997-2586',
    accreditedByVA: false,
    specialties: ['Post-9/11 veterans', 'Mental health', 'Transition', 'Peer support'],
    averageRating: 4.1,
    totalReviews: 0,
    isNational: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

export const resourcesService = new ResourcesService();
