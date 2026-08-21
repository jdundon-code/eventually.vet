// ============================================================================
// EVENTUALLY.VET - Data Models
// All types for tracking military service, medical appointments, and VA claims
// ============================================================================

// === Enums & Constants ===

export type BranchOfService =
  | 'army'
  | 'navy'
  | 'air_force'
  | 'marines'
  | 'coast_guard'
  | 'space_force';

export type ServiceStatus =
  | 'active_duty'
  | 'reserve'
  | 'national_guard'
  | 'separated'
  | 'retired'
  | 'medically_retired';

export type AppointmentType =
  | 'primary_care'
  | 'mental_health'
  | 'orthopedic'
  | 'dental'
  | 'vision'
  | 'audiology'
  | 'physical_therapy'
  | 'occupational_therapy'
  | 'cardiology'
  | 'dermatology'
  | 'neurology'
  | 'radiology'
  | 'surgery'
  | 'emergency'
  | 'specialist'
  | 'va_exam'
  | 'other';

export type AppointmentSource =
  | 'manual'
  | 'calendar_import';

export type DeploymentStatus =
  | 'planned'
  | 'active'
  | 'completed';

// === Core Models ===

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  branch: BranchOfService;
  rank?: string;
  serviceStatus: ServiceStatus;
  dodId?: string; // Optional, for reference
  serviceStartDate: string; // ISO date
  serviceEndDate?: string; // ISO date, null if still serving
  mос?: string; // Military Occupational Specialty / AFSC / Rating
  createdAt: string;
  updatedAt: string;
}

export interface MedicalAppointment {
  id: string;
  userId: string;
  title: string;
  appointmentType: AppointmentType;
  provider: string; // Doctor/provider name
  facility: string; // Hospital/clinic name
  facilityAddress?: string;
  date: string; // ISO datetime
  endDate?: string; // ISO datetime
  chiefComplaint: string; // Reason for visit
  diagnosis?: string;
  treatmentPlan?: string;
  medications?: string;
  followUpRequired: boolean;
  followUpDate?: string;
  relatedToService: boolean; // Is this potentially service-connected?
  relatedCondition?: string; // What service-connected condition
  source: AppointmentSource;
  calendarEventId?: string; // If imported from device calendar
  dutyStationId?: string; // Which duty station were you at
  deploymentId?: string; // Were you deployed when this happened
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Deployment {
  id: string;
  userId: string;
  name: string; // Operation name (e.g., "OEF", "OIR")
  location: string; // Country/region
  specificLocation?: string; // Base/FOB name
  startDate: string; // ISO date
  endDate?: string; // ISO date
  status: DeploymentStatus;
  hazards: string[]; // burn pits, chemicals, radiation, etc.
  combatZone: boolean;
  immediateDangerPay: boolean;
  hostileFirePay: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DutyStation {
  id: string;
  userId: string;
  name: string; // Base/Post name
  location: string; // City, State or City, Country
  unit: string; // Unit assigned to
  startDate: string; // ISO date (PCS date)
  endDate?: string; // ISO date
  isCurrent: boolean;
  jobTitle?: string;
  supervisorName?: string;
  supervisorContact?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCondition {
  id: string;
  userId: string;
  name: string; // Condition name (e.g., "Tinnitus", "Lower back pain")
  icdCode?: string; // ICD-10 code if known
  onsetDate?: string; // When symptoms first appeared
  diagnosisDate?: string; // When officially diagnosed
  description: string;
  currentStatus: 'active' | 'resolved' | 'chronic' | 'worsening';
  serviceConnected: boolean; // Believed to be service-connected
  relatedDeploymentIds: string[];
  relatedDutyStationIds: string[];
  relatedAppointmentIds: string[];
  vaClaimed: boolean; // Has this been claimed with VA
  vaRatingPercent?: number; // If rated, what percent
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  parentId: string; // ID of the record this is attached to
  parentType: 'appointment' | 'deployment' | 'duty_station' | 'condition' | 'note';
  fileName: string;
  fileUri: string; // Local file path
  fileType: string; // MIME type
  fileSize: number; // bytes
  description?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  parentId: string;
  parentType: 'appointment' | 'deployment' | 'duty_station' | 'condition' | 'general';
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// === VA Claim Related ===

export interface VAClaim {
  id: string;
  userId: string;
  claimNumber?: string;
  filingDate?: string;
  status: 'preparing' | 'filed' | 'pending' | 'decided' | 'appealed';
  conditions: string[]; // ServiceCondition IDs
  decisionDate?: string;
  ratingPercent?: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// === App State ===

export interface AppSettings {
  onboardingComplete: boolean;
  calendarSyncEnabled: boolean;
  lastCalendarSync?: string;
  notificationsEnabled: boolean;
  biometricLockEnabled: boolean;
}

// === Timeline Entry (for unified view) ===

export interface TimelineEntry {
  id: string;
  type: 'appointment' | 'deployment_start' | 'deployment_end' | 'pcs' | 'condition_onset' | 'claim_filed';
  date: string;
  title: string;
  subtitle: string;
  relatedId: string;
}
