// ============================================================================
// EVENTUALLY.VET - Seed Data Service
// Populates the app with realistic demo data on first launch so the
// prototype can be tested immediately without manual data entry.
// Call seedDemoData() once during app initialization if no profile exists.
// ============================================================================

import { database } from './database';
import { generateId } from '../utils/uuid';
import { getNowISO } from '../utils/dates';
import {
  UserProfile,
  MedicalAppointment,
  Deployment,
  DutyStation,
  ServiceCondition,
  Note,
} from '../models/types';

/**
 * Check if seed data should be loaded (first launch only)
 */
export async function shouldSeedData(): Promise<boolean> {
  const profile = await database.getUserProfile();
  return !profile;
}

/**
 * Load demo data into the database for prototype testing
 */
export async function seedDemoData(): Promise<void> {
  const userId = generateId();
  const now = getNowISO();

  // ==========================================================================
  // PROFILE
  // ==========================================================================
  const profile: UserProfile = {
    id: userId,
    firstName: 'Alex',
    lastName: 'Rodriguez',
    branch: 'marines',
    rank: 'SGT',
    serviceStatus: 'active_duty',
    serviceStartDate: '2020-03-15',
    mос: '0311 - Rifleman',
    createdAt: now,
    updatedAt: now,
  };
  await database.saveUserProfile(profile);

  // ==========================================================================
  // DUTY STATIONS
  // ==========================================================================
  const stations: DutyStation[] = [
    {
      id: generateId(),
      userId,
      name: 'MCRD San Diego',
      location: 'San Diego, CA',
      unit: 'Recruit Training Battalion',
      startDate: '2020-03-15',
      endDate: '2020-08-20',
      isCurrent: false,
      jobTitle: 'Recruit',
      notes: 'Boot camp and MCT',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      userId,
      name: 'MCB Hawaii (K-Bay)',
      location: 'Kaneohe Bay, HI',
      unit: '3rd Marines, 1/3',
      startDate: '2020-08-25',
      endDate: '2021-01-10',
      isCurrent: false,
      jobTitle: 'Rifleman',
      supervisorName: 'SSgt Johnson',
      supervisorContact: 'johnson.m@usmc.mil',
      notes: 'First fleet assignment. Unit workups for deployment.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      userId,
      name: 'Camp Lejeune',
      location: 'Jacksonville, NC',
      unit: '2nd MarDiv, 2/8',
      startDate: '2021-01-15',
      endDate: '2023-06-01',
      isCurrent: false,
      jobTitle: 'Team Leader',
      supervisorName: 'SSgt Williams',
      supervisorContact: 'williams.r@usmc.mil',
      notes: 'Promoted to Corporal then Sergeant here. Two deployments from this station.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      userId,
      name: 'Camp Pendleton',
      location: 'Oceanside, CA',
      unit: '1st Marine Division, 1/5',
      startDate: '2023-06-10',
      isCurrent: true,
      jobTitle: 'Squad Leader',
      supervisorName: 'SSgt Martinez',
      supervisorContact: 'martinez.j@usmc.mil',
      notes: 'Current assignment. Leading a rifle squad.',
      createdAt: now,
      updatedAt: now,
    },
  ];
  for (const s of stations) await database.saveDutyStation(s);

  // ==========================================================================
  // DEPLOYMENTS
  // ==========================================================================
  const deployments: Deployment[] = [
    {
      id: generateId(),
      userId,
      name: 'UDP — Unit Deployment Program',
      location: 'Okinawa, Japan',
      specificLocation: 'Camp Hansen',
      startDate: '2021-09-01',
      endDate: '2021-12-05',
      status: 'completed',
      hazards: ['PFAS/AFFF', 'Noise Exposure'],
      combatZone: false,
      immediateDangerPay: false,
      hostileFirePay: false,
      notes: 'Routine UDP rotation. Trained at multiple ranges with high noise exposure. Base later confirmed PFAS contamination in water supply.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      userId,
      name: 'OFS — Operation Freedom\'s Sentinel',
      location: 'Afghanistan',
      specificLocation: 'Camp Leatherneck',
      startDate: '2022-03-10',
      endDate: '2022-10-15',
      status: 'completed',
      hazards: ['Burn Pits', 'Extreme Heat', 'Noise Exposure', 'Chemical Agents'],
      combatZone: true,
      immediateDangerPay: true,
      hostileFirePay: true,
      notes: 'Combat deployment. Daily burn pit exposure within 500m of living quarters. Multiple IED events. Constant noise from generators and weapons.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      userId,
      name: 'OIR — Operation Inherent Resolve',
      location: 'Iraq',
      specificLocation: 'Al Asad Air Base',
      startDate: '2024-01-08',
      endDate: '2024-08-20',
      status: 'completed',
      hazards: ['Burn Pits', 'Noise Exposure', 'Sand/Dust'],
      combatZone: true,
      immediateDangerPay: true,
      hostileFirePay: true,
      notes: 'Advisory mission. Significant burn pit exposure. Rocket attacks on base multiple times. Constant sand/dust inhalation.',
      createdAt: now,
      updatedAt: now,
    },
  ];
  for (const d of deployments) await database.saveDeployment(d);

  // ==========================================================================
  // SERVICE CONDITIONS
  // ==========================================================================
  const conditions: ServiceCondition[] = [
    {
      id: generateId(),
      userId,
      name: 'Tinnitus',
      description: 'Constant ringing in both ears. Began during deployment in Afghanistan after multiple IED blasts. Worsened over time. Difficulty sleeping and concentrating.',
      onsetDate: '2022-05-15',
      diagnosisDate: '2022-09-01',
      currentStatus: 'chronic',
      serviceConnected: true,
      relatedDeploymentIds: [deployments[1].id, deployments[2].id],
      relatedDutyStationIds: [],
      relatedAppointmentIds: [],
      vaClaimed: false,
      notes: 'Consistent with noise exposure MOS (0311) and combat deployments.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      userId,
      name: 'PTSD',
      description: 'Nightmares, hypervigilance, avoidance of crowds, difficulty with anger. Related to combat experiences in Afghanistan.',
      onsetDate: '2022-08-01',
      diagnosisDate: '2023-02-15',
      currentStatus: 'active',
      serviceConnected: true,
      relatedDeploymentIds: [deployments[1].id],
      relatedDutyStationIds: [],
      relatedAppointmentIds: [],
      vaClaimed: false,
      notes: 'Diagnosed by military behavioral health. Currently in treatment.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      userId,
      name: 'Left Knee Patellofemoral Syndrome',
      description: 'Chronic left knee pain with grinding sensation. Pain with running, stairs, and squatting. Started during infantry training.',
      onsetDate: '2020-10-01',
      diagnosisDate: '2021-03-15',
      currentStatus: 'worsening',
      serviceConnected: true,
      relatedDeploymentIds: [],
      relatedDutyStationIds: [stations[1].id, stations[2].id],
      relatedAppointmentIds: [],
      vaClaimed: false,
      notes: 'Multiple sick call visits. MRI shows cartilage degradation. PT ordered.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      userId,
      name: 'Lumbar Strain / Lower Back Pain',
      description: 'Chronic lower back pain aggravated by rucking and heavy lifting. Radiates to left leg occasionally. Limited flexion.',
      onsetDate: '2021-06-01',
      diagnosisDate: '2022-01-10',
      currentStatus: 'chronic',
      serviceConnected: true,
      relatedDeploymentIds: [deployments[1].id],
      relatedDutyStationIds: [stations[2].id],
      relatedAppointmentIds: [],
      vaClaimed: false,
      notes: 'Started carrying heavy loads in infantry. Worsened during deployment.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      userId,
      name: 'Chronic Sinusitis',
      description: 'Persistent nasal congestion, facial pressure, and post-nasal drip. Began after burn pit exposure in Afghanistan.',
      onsetDate: '2022-06-01',
      diagnosisDate: '2023-04-20',
      currentStatus: 'chronic',
      serviceConnected: true,
      relatedDeploymentIds: [deployments[1].id, deployments[2].id],
      relatedDutyStationIds: [],
      relatedAppointmentIds: [],
      vaClaimed: false,
      notes: 'PACT Act presumptive condition. Linked to burn pit exposure.',
      createdAt: now,
      updatedAt: now,
    },
  ];
  for (const c of conditions) await database.saveCondition(c);

  // ==========================================================================
  // MEDICAL APPOINTMENTS (sample — recent and upcoming)
  // ==========================================================================
  const appointments: MedicalAppointment[] = [
    {
      id: generateId(), userId, title: 'Knee Follow-Up', appointmentType: 'orthopedic',
      provider: 'Dr. Martinez', facility: 'Naval Hospital Camp Pendleton',
      date: '2026-08-28T09:30:00.000Z', chiefComplaint: 'Ongoing left knee pain. Grinding worse after PT.',
      diagnosis: 'Patellofemoral syndrome, worsening', treatmentPlan: 'Continue PT, consider surgery referral',
      followUpRequired: true, followUpDate: '2026-10-15',
      relatedToService: true, relatedCondition: 'Left Knee Patellofemoral Syndrome',
      source: 'manual', notes: 'Dr recommended MRI follow-up', createdAt: now, updatedAt: now,
    },
    {
      id: generateId(), userId, title: 'Mental Health - PTSD', appointmentType: 'mental_health',
      provider: 'Dr. Chen', facility: 'Behavioral Health Clinic, Camp Pendleton',
      date: '2026-08-22T14:00:00.000Z', chiefComplaint: 'Bi-weekly PTSD counseling session.',
      diagnosis: 'PTSD, combat-related', treatmentPlan: 'CPT therapy ongoing. Prazosin for nightmares.',
      medications: 'Prazosin 2mg QHS, Sertraline 100mg daily',
      followUpRequired: true, followUpDate: '2026-09-05',
      relatedToService: true, relatedCondition: 'PTSD',
      source: 'manual', notes: 'Good progress per provider. Nightmares reduced.', createdAt: now, updatedAt: now,
    },
    {
      id: generateId(), userId, title: 'Audiology - Tinnitus Eval', appointmentType: 'audiology',
      provider: 'Dr. Patel', facility: 'Audiology Clinic, Naval Hospital',
      date: '2026-07-22T10:00:00.000Z', chiefComplaint: 'Annual hearing check. Tinnitus evaluation.',
      diagnosis: 'Bilateral high-frequency hearing loss. Chronic tinnitus.',
      relatedToService: true, relatedCondition: 'Tinnitus',
      followUpRequired: false, source: 'manual',
      notes: 'Audiogram shows noise-induced pattern consistent with weapons exposure.', createdAt: now, updatedAt: now,
    },
    {
      id: generateId(), userId, title: 'Annual Physical', appointmentType: 'primary_care',
      provider: 'Dr. Williams', facility: 'Branch Medical Clinic, Camp Pendleton',
      date: '2026-07-10T08:00:00.000Z', chiefComplaint: 'Annual PHA (Periodic Health Assessment)',
      diagnosis: 'Generally healthy. Noted chronic conditions in record.',
      followUpRequired: false, relatedToService: false,
      source: 'manual', notes: 'Updated immunizations. Discussed deployment health screening.', createdAt: now, updatedAt: now,
    },
    {
      id: generateId(), userId, title: 'Lower Back MRI', appointmentType: 'radiology',
      provider: 'Dr. Kim', facility: 'Radiology Dept, Naval Hospital',
      date: '2026-06-28T11:30:00.000Z', chiefComplaint: 'MRI lumbar spine ordered by orthopedics.',
      diagnosis: 'L4-L5 disc bulge, mild facet arthropathy',
      relatedToService: true, relatedCondition: 'Lumbar Strain / Lower Back Pain',
      followUpRequired: true, followUpDate: '2026-07-15',
      source: 'manual', notes: 'Results show early degenerative changes at L4-L5.', createdAt: now, updatedAt: now,
    },
    {
      id: generateId(), userId, title: 'Physical Therapy - Shoulder', appointmentType: 'physical_therapy',
      provider: 'LT Torres', facility: 'PT Clinic, Camp Pendleton',
      date: '2026-06-15T13:00:00.000Z', chiefComplaint: 'Right shoulder impingement from overhead presses.',
      treatmentPlan: 'Rotator cuff strengthening program. 8 sessions.',
      relatedToService: true, followUpRequired: true,
      source: 'manual', notes: 'Session 4 of 8. Range of motion improving.', createdAt: now, updatedAt: now,
    },
    {
      id: generateId(), userId, title: 'ENT - Sinusitis', appointmentType: 'specialist',
      provider: 'Dr. Howard', facility: 'ENT Clinic, Naval Hospital',
      date: '2026-05-20T09:00:00.000Z', chiefComplaint: 'Persistent nasal congestion and facial pressure.',
      diagnosis: 'Chronic rhinosinusitis', treatmentPlan: 'Nasal corticosteroid spray. Saline rinses.',
      medications: 'Fluticasone nasal spray 2 sprays BID',
      relatedToService: true, relatedCondition: 'Chronic Sinusitis',
      followUpRequired: true, followUpDate: '2026-08-20',
      source: 'manual', notes: 'Provider noted burn pit exposure history. Recommended documenting for VA.', createdAt: now, updatedAt: now,
    },
  ];
  for (const a of appointments) await database.saveAppointment(a);

  // ==========================================================================
  // SAMPLE NOTES
  // ==========================================================================
  const notes: Note[] = [
    {
      id: generateId(),
      parentId: conditions[1].id, // PTSD
      parentType: 'condition',
      title: 'Incident report — IED event',
      content: 'On approximately 15 Jun 2022, our patrol was hit by an IED on Route Tampa. Vehicle was disabled. No KIA but 2 WIA in my team. I was evaluated at the BAS for concussion symptoms. This is the event that triggered my PTSD symptoms.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      parentId: deployments[1].id, // Afghanistan
      parentType: 'deployment',
      title: 'Burn pit proximity',
      content: 'The burn pit at Camp Leatherneck was approximately 400 meters from our berthing area. It operated 24/7. We could see smoke and smell burning from inside our racks. No respiratory protection was ever issued.',
      createdAt: now,
      updatedAt: now,
    },
  ];
  for (const n of notes) await database.saveNote(n);

  // ==========================================================================
  // SETTINGS
  // ==========================================================================
  await database.setSetting('onboardingComplete', 'true');
  await database.setSetting('calendarSyncEnabled', 'false');

  console.log('✅ Demo data seeded successfully');
}
