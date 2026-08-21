// ============================================================================
// EVENTUALLY.VET - Branch of Service Information
// Names, mottos, icons, and metadata for each branch
// ============================================================================

import { BranchOfService } from '../models/types';

export interface BranchInfo {
  id: BranchOfService;
  name: string;
  shortName: string;
  motto: string;
  mottoTranslation?: string;
  icon: string; // Ionicons name
  established: string;
  ranks: string[]; // Common enlisted + officer ranks
}

export const branchData: Record<BranchOfService, BranchInfo> = {
  army: {
    id: 'army',
    name: 'United States Army',
    shortName: 'Army',
    motto: 'This We\'ll Defend',
    icon: 'shield-checkmark',
    established: '1775',
    ranks: [
      'PVT', 'PV2', 'PFC', 'SPC', 'CPL',
      'SGT', 'SSG', 'SFC', 'MSG', '1SG', 'SGM', 'CSM',
      '2LT', '1LT', 'CPT', 'MAJ', 'LTC', 'COL',
      'BG', 'MG', 'LTG', 'GEN',
    ],
  },
  navy: {
    id: 'navy',
    name: 'United States Navy',
    shortName: 'Navy',
    motto: 'Non Sibi Sed Patriae',
    mottoTranslation: 'Not Self, But Country',
    icon: 'boat',
    established: '1775',
    ranks: [
      'SR', 'SA', 'SN', 'PO3', 'PO2', 'PO1',
      'CPO', 'SCPO', 'MCPO',
      'ENS', 'LTJG', 'LT', 'LCDR', 'CDR', 'CAPT',
      'RDML', 'RADM', 'VADM', 'ADM',
    ],
  },
  air_force: {
    id: 'air_force',
    name: 'United States Air Force',
    shortName: 'Air Force',
    motto: 'Aim High...Fly-Fight-Win',
    icon: 'airplane',
    established: '1947',
    ranks: [
      'AB', 'Amn', 'A1C', 'SrA',
      'SSgt', 'TSgt', 'MSgt', 'SMSgt', 'CMSgt',
      '2d Lt', '1st Lt', 'Capt', 'Maj', 'Lt Col', 'Col',
      'Brig Gen', 'Maj Gen', 'Lt Gen', 'Gen',
    ],
  },
  marines: {
    id: 'marines',
    name: 'United States Marine Corps',
    shortName: 'Marines',
    motto: 'Semper Fidelis',
    mottoTranslation: 'Always Faithful',
    icon: 'globe',
    established: '1775',
    ranks: [
      'Pvt', 'PFC', 'LCpl', 'Cpl', 'Sgt',
      'SSgt', 'GySgt', 'MSgt', '1stSgt', 'MGySgt', 'SgtMaj',
      '2ndLt', '1stLt', 'Capt', 'Maj', 'LtCol', 'Col',
      'BGen', 'MajGen', 'LtGen', 'Gen',
    ],
  },
  coast_guard: {
    id: 'coast_guard',
    name: 'United States Coast Guard',
    shortName: 'Coast Guard',
    motto: 'Semper Paratus',
    mottoTranslation: 'Always Ready',
    icon: 'water',
    established: '1790',
    ranks: [
      'SR', 'SA', 'SN', 'PO3', 'PO2', 'PO1',
      'CPO', 'SCPO', 'MCPO',
      'ENS', 'LTJG', 'LT', 'LCDR', 'CDR', 'CAPT',
      'RDML', 'RADM', 'VADM', 'ADM',
    ],
  },
  space_force: {
    id: 'space_force',
    name: 'United States Space Force',
    shortName: 'Space Force',
    motto: 'Semper Supra',
    mottoTranslation: 'Always Above',
    icon: 'planet',
    established: '2019',
    ranks: [
      'Spc 1', 'Spc 2', 'Spc 3', 'Spc 4',
      'Sgt', 'TSgt', 'MSgt', 'SMSgt', 'CMSgt',
      '2d Lt', '1st Lt', 'Capt', 'Maj', 'Lt Col', 'Col',
      'Brig Gen', 'Maj Gen', 'Lt Gen', 'Gen',
    ],
  },
};

export const allBranches: BranchOfService[] = [
  'army',
  'navy',
  'air_force',
  'marines',
  'coast_guard',
  'space_force',
];
