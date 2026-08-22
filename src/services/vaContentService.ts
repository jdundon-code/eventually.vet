// ============================================================================
// EVENTUALLY.VET - VA Content Service
// Over-the-Air (OTA) updates for VA regulations, presumptive conditions,
// rating criteria, and news. Content updates without app store release.
// ============================================================================

import { supabase } from './supabase';
import { database } from './database';
import { getNowISO } from '../utils/dates';

// ============================================================================
// TYPES
// ============================================================================

export interface PresumptiveCondition {
  id: string;
  name: string;
  icdCode?: string;
  category: PresumptiveCategory;
  eligibleExposures: string[]; // Hazard types that qualify
  eligibleLocations?: string[]; // Specific locations/theaters
  eligibleDateRange?: { start: string; end?: string }; // Service date requirement
  eligibleBranches?: string[]; // Specific branches (null = all)
  description: string;
  vaRegulationRef: string; // 38 CFR reference
  pactActCovered: boolean;
  effectiveDate: string; // When this presumptive became active
  ratingCriteria?: string; // Brief description of how VA rates this
  evidenceNeeded: string; // What evidence is required
  notes?: string;
}

export type PresumptiveCategory =
  | 'respiratory'
  | 'cancer'
  | 'musculoskeletal'
  | 'neurological'
  | 'cardiovascular'
  | 'hearing'
  | 'mental_health'
  | 'skin'
  | 'gastrointestinal'
  | 'reproductive'
  | 'other';

export interface RatingCriteria {
  id: string;
  conditionName: string;
  diagnosticCode: string; // VA Diagnostic Code (e.g., 6260 for tinnitus)
  schedule: RatingLevel[];
  lastUpdated: string;
  cfrReference: string;
}

export interface RatingLevel {
  percent: number;
  criteria: string;
}

export interface VANewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: 'regulation_change' | 'new_presumptive' | 'deadline' | 'resource' | 'tip';
  publishedAt: string;
  expiresAt?: string;
  actionUrl?: string;
  actionLabel?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface ContentVersion {
  presumptives: number;
  ratingCriteria: number;
  news: number;
  lastChecked: string;
}

// ============================================================================
// SERVICE
// ============================================================================

class VAContentService {
  private presumptiveConditions: PresumptiveCondition[] = [];
  private ratingCriteriaList: RatingCriteria[] = [];
  private newsItems: VANewsItem[] = [];
  private contentVersion: ContentVersion = {
    presumptives: 0,
    ratingCriteria: 0,
    news: 0,
    lastChecked: '',
  };

  // =========================================================================
  // INITIALIZATION & OTA UPDATES
  // =========================================================================

  /**
   * Initialize content - load cached content, then check for updates
   */
  async initialize(): Promise<void> {
    // Load cached content from local storage
    await this.loadCachedContent();

    // Check for OTA updates in the background
    this.checkForUpdates().catch(console.warn);
  }

  /**
   * Check Supabase for content updates
   * Only downloads if version is newer than cached
   */
  async checkForUpdates(): Promise<{ updated: boolean; newItems: number }> {
    try {
      // Fetch latest content from Supabase
      const { data: presumptiveData, error: pError } = await supabase
        .from('va_content')
        .select('*')
        .eq('content_type', 'presumptive')
        .eq('is_active', true)
        .order('effective_date', { ascending: false });

      const { data: ratingData, error: rError } = await supabase
        .from('va_content')
        .select('*')
        .eq('content_type', 'rating_criteria')
        .eq('is_active', true);

      const { data: newsData, error: nError } = await supabase
        .from('va_content')
        .select('*')
        .eq('content_type', 'news')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      let newItems = 0;

      if (!pError && presumptiveData) {
        const conditions = presumptiveData.map((row) => row.content as PresumptiveCondition);
        if (conditions.length > 0) {
          this.presumptiveConditions = conditions;
          newItems += conditions.length;
        }
      }

      if (!rError && ratingData) {
        const ratings = ratingData.map((row) => row.content as RatingCriteria);
        if (ratings.length > 0) {
          this.ratingCriteriaList = ratings;
        }
      }

      if (!nError && newsData) {
        const news = newsData.map((row) => ({
          ...row.content,
          id: row.id,
          publishedAt: row.created_at,
        })) as VANewsItem[];
        if (news.length > 0) {
          this.newsItems = news;
        }
      }

      // Cache locally
      await this.cacheContent();

      this.contentVersion.lastChecked = getNowISO();
      await database.setSetting('va_content_version', JSON.stringify(this.contentVersion));

      return { updated: newItems > 0, newItems };
    } catch (e) {
      console.warn('Failed to check for VA content updates:', e);
      return { updated: false, newItems: 0 };
    }
  }

  // =========================================================================
  // PRESUMPTIVE CONDITIONS
  // =========================================================================

  /**
   * Get all presumptive conditions
   */
  getPresumptiveConditions(): PresumptiveCondition[] {
    return this.presumptiveConditions;
  }

  /**
   * Get presumptive conditions by category
   */
  getByCategory(category: PresumptiveCategory): PresumptiveCondition[] {
    return this.presumptiveConditions.filter((c) => c.category === category);
  }

  /**
   * Get presumptive conditions that match a user's exposures
   * This is the key feature: auto-flagging conditions the veteran may qualify for
   */
  getMatchingPresumptives(userExposures: string[], serviceLocations?: string[]): PresumptiveCondition[] {
    const normalizedExposures = userExposures.map((e) => e.toLowerCase());
    const normalizedLocations = (serviceLocations || []).map((l) => l.toLowerCase());

    return this.presumptiveConditions.filter((condition) => {
      // Check if any of the user's exposures match eligible exposures
      const exposureMatch = condition.eligibleExposures.some((eligible) =>
        normalizedExposures.some((userExp) =>
          userExp.includes(eligible.toLowerCase()) || eligible.toLowerCase().includes(userExp)
        )
      );

      // Check location match if specified
      let locationMatch = true;
      if (condition.eligibleLocations && condition.eligibleLocations.length > 0) {
        locationMatch = condition.eligibleLocations.some((loc) =>
          normalizedLocations.some((userLoc) =>
            userLoc.includes(loc.toLowerCase()) || loc.toLowerCase().includes(userLoc)
          )
        );
      }

      return exposureMatch || locationMatch;
    });
  }

  /**
   * Get PACT Act covered conditions
   */
  getPactActConditions(): PresumptiveCondition[] {
    return this.presumptiveConditions.filter((c) => c.pactActCovered);
  }

  /**
   * Search presumptive conditions by name or description
   */
  searchPresumptives(query: string): PresumptiveCondition[] {
    const lower = query.toLowerCase();
    return this.presumptiveConditions.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.description.toLowerCase().includes(lower) ||
        c.category.includes(lower)
    );
  }

  // =========================================================================
  // RATING CRITERIA
  // =========================================================================

  /**
   * Get rating criteria for a specific condition
   */
  getRatingCriteria(conditionName: string): RatingCriteria | undefined {
    const lower = conditionName.toLowerCase();
    return this.ratingCriteriaList.find(
      (r) => r.conditionName.toLowerCase().includes(lower) || lower.includes(r.conditionName.toLowerCase())
    );
  }

  /**
   * Get all rating criteria
   */
  getAllRatingCriteria(): RatingCriteria[] {
    return this.ratingCriteriaList;
  }

  // =========================================================================
  // NEWS & UPDATES
  // =========================================================================

  /**
   * Get VA news/regulation updates
   */
  getNews(): VANewsItem[] {
    return this.newsItems;
  }

  /**
   * Get high priority / urgent news
   */
  getUrgentNews(): VANewsItem[] {
    return this.newsItems.filter((n) => n.priority === 'urgent' || n.priority === 'high');
  }

  /**
   * Get news by category
   */
  getNewsByCategory(category: VANewsItem['category']): VANewsItem[] {
    return this.newsItems.filter((n) => n.category === category);
  }

  // =========================================================================
  // LOCAL CACHING
  // =========================================================================

  private async loadCachedContent(): Promise<void> {
    try {
      const cached = await database.getSetting('va_presumptive_conditions');
      if (cached) {
        this.presumptiveConditions = JSON.parse(cached);
      } else {
        // Load built-in defaults if no cache exists
        this.presumptiveConditions = DEFAULT_PRESUMPTIVE_CONDITIONS;
      }

      const cachedRatings = await database.getSetting('va_rating_criteria');
      if (cachedRatings) {
        this.ratingCriteriaList = JSON.parse(cachedRatings);
      } else {
        this.ratingCriteriaList = DEFAULT_RATING_CRITERIA;
      }

      const cachedNews = await database.getSetting('va_news');
      if (cachedNews) {
        this.newsItems = JSON.parse(cachedNews);
      }

      const versionData = await database.getSetting('va_content_version');
      if (versionData) {
        this.contentVersion = JSON.parse(versionData);
      }
    } catch (e) {
      // Fall back to built-in defaults
      this.presumptiveConditions = DEFAULT_PRESUMPTIVE_CONDITIONS;
      this.ratingCriteriaList = DEFAULT_RATING_CRITERIA;
    }
  }

  private async cacheContent(): Promise<void> {
    await database.setSetting('va_presumptive_conditions', JSON.stringify(this.presumptiveConditions));
    await database.setSetting('va_rating_criteria', JSON.stringify(this.ratingCriteriaList));
    await database.setSetting('va_news', JSON.stringify(this.newsItems));
  }
}

// ============================================================================
// DEFAULT DATA (ships with the app, updated via OTA)
// Based on current VA regulations and PACT Act (2022)
// ============================================================================

const DEFAULT_PRESUMPTIVE_CONDITIONS: PresumptiveCondition[] = [
  {
    id: 'pact-001',
    name: 'Lung Cancer (any type)',
    category: 'cancer',
    eligibleExposures: ['burn pits', 'airborne hazards', 'particulate matter'],
    description: 'Any type of lung cancer for veterans exposed to burn pits or other airborne hazards during covered service.',
    vaRegulationRef: '38 CFR § 3.320',
    pactActCovered: true,
    effectiveDate: '2022-08-10',
    evidenceNeeded: 'Diagnosis + proof of service in covered location/period. No nexus letter needed for presumptive.',
    ratingCriteria: 'Rated under DC 6819-6820. Active disease rated 100%. Post-treatment minimum 6 months at 100%.',
  },
  {
    id: 'pact-002',
    name: 'Squamous Cell Carcinoma of the Head/Neck',
    category: 'cancer',
    eligibleExposures: ['burn pits', 'airborne hazards'],
    description: 'Head and neck cancers presumptively linked to toxic exposures from burn pits.',
    vaRegulationRef: '38 CFR § 3.320',
    pactActCovered: true,
    effectiveDate: '2022-08-10',
    evidenceNeeded: 'Diagnosis + covered service documentation.',
  },
  {
    id: 'pact-003',
    name: 'Respiratory Cancer (larynx, bronchus, trachea)',
    category: 'cancer',
    eligibleExposures: ['burn pits', 'airborne hazards', 'oil well fires'],
    description: 'Cancers of the respiratory system linked to airborne toxic exposures.',
    vaRegulationRef: '38 CFR § 3.320',
    pactActCovered: true,
    effectiveDate: '2022-08-10',
    evidenceNeeded: 'Diagnosis + deployment records showing covered service.',
  },
  {
    id: 'pact-004',
    name: 'Sinusitis (chronic)',
    category: 'respiratory',
    eligibleExposures: ['burn pits', 'sand/dust', 'airborne hazards'],
    description: 'Chronic sinusitis associated with prolonged exposure to airborne particulates.',
    vaRegulationRef: '38 CFR § 3.320',
    pactActCovered: true,
    effectiveDate: '2022-08-10',
    evidenceNeeded: 'Diagnosis of chronic sinusitis + covered service period.',
    ratingCriteria: 'DC 6510-6514. 0-50% based on frequency of incapacitating/non-incapacitating episodes.',
  },
  {
    id: 'pact-005',
    name: 'Rhinitis (chronic)',
    category: 'respiratory',
    eligibleExposures: ['burn pits', 'sand/dust', 'airborne hazards'],
    description: 'Chronic rhinitis presumptively linked to airborne exposures during deployment.',
    vaRegulationRef: '38 CFR § 3.320',
    pactActCovered: true,
    effectiveDate: '2022-08-10',
    evidenceNeeded: 'Diagnosis + proof of deployment exposure.',
    ratingCriteria: 'DC 6522. 10% with >50% nasal obstruction. 30% with polyps.',
  },
  {
    id: 'pact-006',
    name: 'Asthma',
    category: 'respiratory',
    eligibleExposures: ['burn pits', 'sand/dust', 'chemicals', 'airborne hazards'],
    description: 'Asthma presumptively associated with toxic airborne exposures.',
    vaRegulationRef: '38 CFR § 3.320',
    pactActCovered: true,
    effectiveDate: '2022-08-10',
    evidenceNeeded: 'PFT results + diagnosis + deployment documentation.',
    ratingCriteria: 'DC 6602. 10-100% based on FEV-1, FEV-1/FVC ratio, and medication requirements.',
  },
  {
    id: 'pact-007',
    name: 'Constrictive Bronchiolitis',
    category: 'respiratory',
    eligibleExposures: ['burn pits', 'chemicals', 'sulfur dioxide'],
    description: 'Scarring and narrowing of the bronchioles from toxic inhalation.',
    vaRegulationRef: '38 CFR § 3.320',
    pactActCovered: true,
    effectiveDate: '2022-08-10',
    evidenceNeeded: 'Lung biopsy or high-resolution CT + deployment records.',
  },
  {
    id: 'pact-008',
    name: 'GERD (Gastroesophageal Reflux Disease)',
    category: 'gastrointestinal',
    eligibleExposures: ['burn pits', 'airborne hazards'],
    description: 'Chronic GERD associated with ingested and inhaled toxins from burn pit exposure.',
    vaRegulationRef: '38 CFR § 3.320',
    pactActCovered: true,
    effectiveDate: '2022-08-10',
    evidenceNeeded: 'Diagnosis + deployment records.',
    ratingCriteria: 'DC 7346. 10-60% based on severity, substernal pain, regurgitation, and health impairment.',
  },
  {
    id: 'pre-001',
    name: 'Tinnitus',
    category: 'hearing',
    eligibleExposures: ['noise exposure'],
    description: 'Ringing in the ears. Most commonly claimed VA disability. Presumptive for combat veterans and those with high noise exposure MOSs.',
    vaRegulationRef: '38 CFR § 4.87, DC 6260',
    pactActCovered: false,
    effectiveDate: '1990-01-01',
    evidenceNeeded: 'Self-report is often sufficient. Audiogram helpful but not required. Service in noise-exposed MOS strengthens claim.',
    ratingCriteria: 'DC 6260. Maximum 10% rating. Recurrent tinnitus.',
  },
  {
    id: 'pre-002',
    name: 'Bilateral Hearing Loss',
    category: 'hearing',
    eligibleExposures: ['noise exposure'],
    description: 'Hearing loss in both ears. Common among infantry, artillery, aviation, and other high-noise MOSs.',
    vaRegulationRef: '38 CFR § 4.85-4.86',
    pactActCovered: false,
    effectiveDate: '1990-01-01',
    evidenceNeeded: 'Audiogram showing hearing loss per VA standards (38 CFR § 3.385). In-service noise exposure documentation.',
    ratingCriteria: 'DC 6100. 0-100% based on puretone average and speech recognition scores using Table VI/VIA.',
  },
  {
    id: 'pre-003',
    name: 'PTSD',
    category: 'mental_health',
    eligibleExposures: ['combat', 'military sexual trauma', 'hostile fire'],
    eligibleLocations: ['combat zone'],
    description: 'Post-Traumatic Stress Disorder. Presumptive stressor for combat veterans — no need to prove specific stressor event.',
    vaRegulationRef: '38 CFR § 3.304(f)',
    pactActCovered: false,
    effectiveDate: '2010-07-13',
    evidenceNeeded: 'PTSD diagnosis from qualified provider + combat service (or verified stressor). Combat veterans get relaxed evidentiary standard.',
    ratingCriteria: 'DC 9411. 0-100% based on occupational and social impairment. 70%+ requires inability to maintain relationships or work.',
  },
  {
    id: 'pre-004',
    name: 'Knee Condition (Patellofemoral Syndrome)',
    category: 'musculoskeletal',
    eligibleExposures: ['running', 'rucking', 'physical training', 'airborne operations'],
    description: 'Chronic knee pain from high-impact military activities. Very common among infantry and airborne.',
    vaRegulationRef: '38 CFR § 4.71a',
    pactActCovered: false,
    effectiveDate: '1990-01-01',
    evidenceNeeded: 'Medical records showing in-service treatment or complaints. Current diagnosis. Nexus opinion linking to service.',
    ratingCriteria: 'DC 5003/5010/5260/5261. Based on limitation of motion (flexion/extension), painful motion, and instability.',
  },
  {
    id: 'pre-005',
    name: 'Lower Back Condition (Lumbar Strain/DDD)',
    category: 'musculoskeletal',
    eligibleExposures: ['heavy lifting', 'rucking', 'physical training', 'vehicle vibration'],
    description: 'Chronic lower back pain including degenerative disc disease. Extremely common among service members.',
    vaRegulationRef: '38 CFR § 4.71a, DC 5237-5243',
    pactActCovered: false,
    effectiveDate: '1990-01-01',
    evidenceNeeded: 'In-service back complaints/treatment. Current diagnosis with imaging. Nexus statement.',
    ratingCriteria: 'DC 5237-5243. 10-100% based on range of motion, IVDS formula (incapacitating episodes), and combined.',
  },
  {
    id: 'ao-001',
    name: 'Type 2 Diabetes Mellitus',
    category: 'other',
    eligibleExposures: ['agent orange', 'herbicide agents'],
    eligibleLocations: ['vietnam', 'thailand'],
    description: 'Diabetes presumptively service-connected for veterans exposed to Agent Orange in Vietnam/Thailand.',
    vaRegulationRef: '38 CFR § 3.309(e)',
    pactActCovered: false,
    effectiveDate: '2001-07-09',
    evidenceNeeded: 'Diagnosis of Type 2 diabetes + proof of service in covered location during covered period.',
    ratingCriteria: 'DC 7913. 10-100% based on medication requirements and regulation of activities.',
  },
  {
    id: 'ao-002',
    name: 'Ischemic Heart Disease',
    category: 'cardiovascular',
    eligibleExposures: ['agent orange', 'herbicide agents'],
    eligibleLocations: ['vietnam', 'thailand'],
    description: 'Heart disease presumptively linked to Agent Orange exposure.',
    vaRegulationRef: '38 CFR § 3.309(e)',
    pactActCovered: false,
    effectiveDate: '2010-10-30',
    evidenceNeeded: 'Diagnosis of ischemic heart disease + herbicide exposure documentation.',
    ratingCriteria: 'DC 7005. 10-100% based on METs, ejection fraction, and symptom severity.',
  },
  {
    id: 'pfas-001',
    name: 'Kidney Cancer',
    category: 'cancer',
    eligibleExposures: ['pfas/afff', 'contaminated water'],
    description: 'Kidney cancer linked to PFAS (forever chemicals) exposure at military installations.',
    vaRegulationRef: '38 CFR § 3.320 (proposed)',
    pactActCovered: true,
    effectiveDate: '2024-01-01',
    evidenceNeeded: 'Diagnosis + proof of service at installation with known PFAS contamination.',
  },
  {
    id: 'pfas-002',
    name: 'Testicular Cancer',
    category: 'cancer',
    eligibleExposures: ['pfas/afff', 'contaminated water'],
    description: 'Testicular cancer associated with PFAS exposure from firefighting foam (AFFF) at military bases.',
    vaRegulationRef: '38 CFR § 3.320 (proposed)',
    pactActCovered: true,
    effectiveDate: '2024-01-01',
    evidenceNeeded: 'Diagnosis + documentation of service at PFAS-contaminated installation.',
  },
];

const DEFAULT_RATING_CRITERIA: RatingCriteria[] = [
  {
    id: 'rc-tinnitus',
    conditionName: 'Tinnitus',
    diagnosticCode: '6260',
    schedule: [
      { percent: 10, criteria: 'Recurrent tinnitus (maximum schedular rating)' },
    ],
    lastUpdated: '2024-01-01',
    cfrReference: '38 CFR § 4.87',
  },
  {
    id: 'rc-ptsd',
    conditionName: 'PTSD / Mental Health',
    diagnosticCode: '9411',
    schedule: [
      { percent: 0, criteria: 'Diagnosed but symptoms not severe enough to interfere with occupational/social functioning' },
      { percent: 10, criteria: 'Occupational and social impairment due to mild or transient symptoms which decrease work efficiency only during periods of significant stress' },
      { percent: 30, criteria: 'Occasional decrease in work efficiency with intermittent periods of inability to perform tasks due to symptoms' },
      { percent: 50, criteria: 'Reduced reliability and productivity due to symptoms such as panic attacks weekly, difficulty understanding complex commands, impaired judgment' },
      { percent: 70, criteria: 'Deficiencies in most areas (work, school, family, judgment, thinking, mood). Suicidal ideation, obsessional rituals, near-continuous panic' },
      { percent: 100, criteria: 'Total occupational and social impairment. Gross impairment in thought processes, persistent danger of hurting self or others, inability to perform ADLs' },
    ],
    lastUpdated: '2024-01-01',
    cfrReference: '38 CFR § 4.130',
  },
  {
    id: 'rc-back',
    conditionName: 'Lumbar Spine / Lower Back',
    diagnosticCode: '5237',
    schedule: [
      { percent: 10, criteria: 'Forward flexion greater than 60° but not greater than 85°; OR combined ROM greater than 120° but not greater than 235°; OR muscle spasm/guarding not resulting in abnormal gait' },
      { percent: 20, criteria: 'Forward flexion greater than 30° but not greater than 60°; OR combined ROM not greater than 120°; OR muscle spasm/guarding severe enough for abnormal gait or spinal contour' },
      { percent: 40, criteria: 'Forward flexion 30° or less; OR favorable ankylosis of the entire thoracolumbar spine' },
      { percent: 50, criteria: 'Unfavorable ankylosis of the entire thoracolumbar spine' },
      { percent: 100, criteria: 'Unfavorable ankylosis of the entire spine' },
    ],
    lastUpdated: '2024-01-01',
    cfrReference: '38 CFR § 4.71a',
  },
  {
    id: 'rc-knee',
    conditionName: 'Knee Limitation of Flexion',
    diagnosticCode: '5260',
    schedule: [
      { percent: 0, criteria: 'Flexion limited to 60°' },
      { percent: 10, criteria: 'Flexion limited to 45°' },
      { percent: 20, criteria: 'Flexion limited to 30°' },
      { percent: 30, criteria: 'Flexion limited to 15°' },
    ],
    lastUpdated: '2024-01-01',
    cfrReference: '38 CFR § 4.71a',
  },
  {
    id: 'rc-gerd',
    conditionName: 'GERD / Hiatal Hernia',
    diagnosticCode: '7346',
    schedule: [
      { percent: 10, criteria: 'Two or more symptoms of less severity (pyrosis, regurgitation, substernal/arm/shoulder pain)' },
      { percent: 30, criteria: 'Persistently recurrent epigastric distress with dysphagia, pyrosis, and regurgitation with substernal pain; productive of considerable health impairment' },
      { percent: 60, criteria: 'Symptoms of pain, vomiting, material weight loss and hematemesis/melena with moderate anemia; OR other symptom combinations productive of severe health impairment' },
    ],
    lastUpdated: '2024-01-01',
    cfrReference: '38 CFR § 4.114',
  },
];

export const vaContentService = new VAContentService();
