// ============================================================================
// EVENTUALLY.VET - Database Service
// SQLite-based persistent storage for all app data
// Data persists forever - critical for VA claim filing years later
// ============================================================================

import * as SQLite from 'expo-sqlite';
import {
  UserProfile,
  MedicalAppointment,
  Deployment,
  DutyStation,
  ServiceCondition,
  Attachment,
  Note,
  VAClaim,
  AppSettings,
} from '../models/types';

const DB_NAME = 'eventually_vet.db';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync(DB_NAME);
    await this.createTables();
  }

  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      await this.initialize();
    }
    return this.db!;
  }

  private async createTables(): Promise<void> {
    const db = await this.getDb();

    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS user_profile (
        id TEXT PRIMARY KEY,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        branch TEXT NOT NULL,
        rank TEXT,
        serviceStatus TEXT NOT NULL,
        dodId TEXT,
        serviceStartDate TEXT NOT NULL,
        serviceEndDate TEXT,
        mos TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS medical_appointments (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        title TEXT NOT NULL,
        appointmentType TEXT NOT NULL,
        provider TEXT NOT NULL,
        facility TEXT NOT NULL,
        facilityAddress TEXT,
        date TEXT NOT NULL,
        endDate TEXT,
        chiefComplaint TEXT NOT NULL,
        diagnosis TEXT,
        treatmentPlan TEXT,
        medications TEXT,
        followUpRequired INTEGER NOT NULL DEFAULT 0,
        followUpDate TEXT,
        relatedToService INTEGER NOT NULL DEFAULT 0,
        relatedCondition TEXT,
        source TEXT NOT NULL DEFAULT 'manual',
        calendarEventId TEXT,
        dutyStationId TEXT,
        deploymentId TEXT,
        notes TEXT DEFAULT '',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES user_profile(id)
      );

      CREATE TABLE IF NOT EXISTS deployments (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        specificLocation TEXT,
        startDate TEXT NOT NULL,
        endDate TEXT,
        status TEXT NOT NULL DEFAULT 'completed',
        hazards TEXT DEFAULT '[]',
        combatZone INTEGER NOT NULL DEFAULT 0,
        immediateDangerPay INTEGER NOT NULL DEFAULT 0,
        hostileFirePay INTEGER NOT NULL DEFAULT 0,
        notes TEXT DEFAULT '',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES user_profile(id)
      );

      CREATE TABLE IF NOT EXISTS duty_stations (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        unit TEXT NOT NULL,
        startDate TEXT NOT NULL,
        endDate TEXT,
        isCurrent INTEGER NOT NULL DEFAULT 0,
        jobTitle TEXT,
        supervisorName TEXT,
        supervisorContact TEXT,
        notes TEXT DEFAULT '',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES user_profile(id)
      );

      CREATE TABLE IF NOT EXISTS service_conditions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        icdCode TEXT,
        onsetDate TEXT,
        diagnosisDate TEXT,
        description TEXT NOT NULL,
        currentStatus TEXT NOT NULL DEFAULT 'active',
        serviceConnected INTEGER NOT NULL DEFAULT 1,
        relatedDeploymentIds TEXT DEFAULT '[]',
        relatedDutyStationIds TEXT DEFAULT '[]',
        relatedAppointmentIds TEXT DEFAULT '[]',
        vaClaimed INTEGER NOT NULL DEFAULT 0,
        vaRatingPercent INTEGER,
        notes TEXT DEFAULT '',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES user_profile(id)
      );

      CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        parentId TEXT NOT NULL,
        parentType TEXT NOT NULL,
        fileName TEXT NOT NULL,
        fileUri TEXT NOT NULL,
        fileType TEXT NOT NULL,
        fileSize INTEGER NOT NULL,
        description TEXT,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        parentId TEXT NOT NULL,
        parentType TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS va_claims (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        claimNumber TEXT,
        filingDate TEXT,
        status TEXT NOT NULL DEFAULT 'preparing',
        conditions TEXT DEFAULT '[]',
        decisionDate TEXT,
        ratingPercent INTEGER,
        notes TEXT DEFAULT '',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES user_profile(id)
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_appointments_date ON medical_appointments(date);
      CREATE INDEX IF NOT EXISTS idx_appointments_user ON medical_appointments(userId);
      CREATE INDEX IF NOT EXISTS idx_deployments_user ON deployments(userId);
      CREATE INDEX IF NOT EXISTS idx_duty_stations_user ON duty_stations(userId);
      CREATE INDEX IF NOT EXISTS idx_conditions_user ON service_conditions(userId);
      CREATE INDEX IF NOT EXISTS idx_attachments_parent ON attachments(parentId, parentType);
      CREATE INDEX IF NOT EXISTS idx_notes_parent ON notes(parentId, parentType);
    `);
  }

  // =========================================================================
  // USER PROFILE
  // =========================================================================

  async saveUserProfile(profile: UserProfile): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO user_profile 
       (id, firstName, lastName, branch, rank, serviceStatus, dodId, serviceStartDate, serviceEndDate, mos, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profile.id,
        profile.firstName,
        profile.lastName,
        profile.branch,
        profile.rank || null,
        profile.serviceStatus,
        profile.dodId || null,
        profile.serviceStartDate,
        profile.serviceEndDate || null,
        profile.mос || null,
        profile.createdAt,
        profile.updatedAt,
      ]
    );
  }

  async getUserProfile(): Promise<UserProfile | null> {
    const db = await this.getDb();
    const result = await db.getFirstAsync<any>('SELECT * FROM user_profile LIMIT 1');
    if (!result) return null;
    return {
      ...result,
      serviceEndDate: result.serviceEndDate || undefined,
      rank: result.rank || undefined,
      dodId: result.dodId || undefined,
      mос: result.mos || undefined,
    } as UserProfile;
  }

  // =========================================================================
  // MEDICAL APPOINTMENTS
  // =========================================================================

  async saveAppointment(appointment: MedicalAppointment): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO medical_appointments
       (id, userId, title, appointmentType, provider, facility, facilityAddress, date, endDate,
        chiefComplaint, diagnosis, treatmentPlan, medications, followUpRequired, followUpDate,
        relatedToService, relatedCondition, source, calendarEventId, dutyStationId, deploymentId, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        appointment.id,
        appointment.userId,
        appointment.title,
        appointment.appointmentType,
        appointment.provider,
        appointment.facility,
        appointment.facilityAddress || null,
        appointment.date,
        appointment.endDate || null,
        appointment.chiefComplaint,
        appointment.diagnosis || null,
        appointment.treatmentPlan || null,
        appointment.medications || null,
        appointment.followUpRequired ? 1 : 0,
        appointment.followUpDate || null,
        appointment.relatedToService ? 1 : 0,
        appointment.relatedCondition || null,
        appointment.source,
        appointment.calendarEventId || null,
        appointment.dutyStationId || null,
        appointment.deploymentId || null,
        appointment.notes,
        appointment.createdAt,
        appointment.updatedAt,
      ]
    );
  }

  async getAppointments(userId: string): Promise<MedicalAppointment[]> {
    const db = await this.getDb();
    const results = await db.getAllAsync<any>(
      'SELECT * FROM medical_appointments WHERE userId = ? ORDER BY date DESC',
      [userId]
    );
    return results.map((r) => ({
      ...r,
      followUpRequired: !!r.followUpRequired,
      relatedToService: !!r.relatedToService,
      hazards: r.hazards ? JSON.parse(r.hazards) : [],
    })) as MedicalAppointment[];
  }

  async getAppointmentById(id: string): Promise<MedicalAppointment | null> {
    const db = await this.getDb();
    const result = await db.getFirstAsync<any>(
      'SELECT * FROM medical_appointments WHERE id = ?',
      [id]
    );
    if (!result) return null;
    return {
      ...result,
      followUpRequired: !!result.followUpRequired,
      relatedToService: !!result.relatedToService,
    } as MedicalAppointment;
  }

  async deleteAppointment(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM medical_appointments WHERE id = ?', [id]);
    await db.runAsync('DELETE FROM notes WHERE parentId = ? AND parentType = ?', [id, 'appointment']);
    await db.runAsync('DELETE FROM attachments WHERE parentId = ? AND parentType = ?', [id, 'appointment']);
  }

  // =========================================================================
  // DEPLOYMENTS
  // =========================================================================

  async saveDeployment(deployment: Deployment): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO deployments
       (id, userId, name, location, specificLocation, startDate, endDate, status,
        hazards, combatZone, immediateDangerPay, hostileFirePay, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        deployment.id,
        deployment.userId,
        deployment.name,
        deployment.location,
        deployment.specificLocation || null,
        deployment.startDate,
        deployment.endDate || null,
        deployment.status,
        JSON.stringify(deployment.hazards),
        deployment.combatZone ? 1 : 0,
        deployment.immediateDangerPay ? 1 : 0,
        deployment.hostileFirePay ? 1 : 0,
        deployment.notes,
        deployment.createdAt,
        deployment.updatedAt,
      ]
    );
  }

  async getDeployments(userId: string): Promise<Deployment[]> {
    const db = await this.getDb();
    const results = await db.getAllAsync<any>(
      'SELECT * FROM deployments WHERE userId = ? ORDER BY startDate DESC',
      [userId]
    );
    return results.map((r) => ({
      ...r,
      hazards: r.hazards ? JSON.parse(r.hazards) : [],
      combatZone: !!r.combatZone,
      immediateDangerPay: !!r.immediateDangerPay,
      hostileFirePay: !!r.hostileFirePay,
    })) as Deployment[];
  }

  async deleteDeployment(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM deployments WHERE id = ?', [id]);
    await db.runAsync('DELETE FROM notes WHERE parentId = ? AND parentType = ?', [id, 'deployment']);
    await db.runAsync('DELETE FROM attachments WHERE parentId = ? AND parentType = ?', [id, 'deployment']);
  }

  // =========================================================================
  // DUTY STATIONS
  // =========================================================================

  async saveDutyStation(station: DutyStation): Promise<void> {
    const db = await this.getDb();
    // If marking as current, unmark all others
    if (station.isCurrent) {
      await db.runAsync(
        'UPDATE duty_stations SET isCurrent = 0 WHERE userId = ? AND id != ?',
        [station.userId, station.id]
      );
    }
    await db.runAsync(
      `INSERT OR REPLACE INTO duty_stations
       (id, userId, name, location, unit, startDate, endDate, isCurrent,
        jobTitle, supervisorName, supervisorContact, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        station.id,
        station.userId,
        station.name,
        station.location,
        station.unit,
        station.startDate,
        station.endDate || null,
        station.isCurrent ? 1 : 0,
        station.jobTitle || null,
        station.supervisorName || null,
        station.supervisorContact || null,
        station.notes,
        station.createdAt,
        station.updatedAt,
      ]
    );
  }

  async getDutyStations(userId: string): Promise<DutyStation[]> {
    const db = await this.getDb();
    const results = await db.getAllAsync<any>(
      'SELECT * FROM duty_stations WHERE userId = ? ORDER BY startDate DESC',
      [userId]
    );
    return results.map((r) => ({
      ...r,
      isCurrent: !!r.isCurrent,
    })) as DutyStation[];
  }

  async deleteDutyStation(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM duty_stations WHERE id = ?', [id]);
    await db.runAsync('DELETE FROM notes WHERE parentId = ? AND parentType = ?', [id, 'duty_station']);
    await db.runAsync('DELETE FROM attachments WHERE parentId = ? AND parentType = ?', [id, 'duty_station']);
  }

  // =========================================================================
  // SERVICE CONDITIONS
  // =========================================================================

  async saveCondition(condition: ServiceCondition): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO service_conditions
       (id, userId, name, icdCode, onsetDate, diagnosisDate, description, currentStatus,
        serviceConnected, relatedDeploymentIds, relatedDutyStationIds, relatedAppointmentIds,
        vaClaimed, vaRatingPercent, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        condition.id,
        condition.userId,
        condition.name,
        condition.icdCode || null,
        condition.onsetDate || null,
        condition.diagnosisDate || null,
        condition.description,
        condition.currentStatus,
        condition.serviceConnected ? 1 : 0,
        JSON.stringify(condition.relatedDeploymentIds),
        JSON.stringify(condition.relatedDutyStationIds),
        JSON.stringify(condition.relatedAppointmentIds),
        condition.vaClaimed ? 1 : 0,
        condition.vaRatingPercent || null,
        condition.notes,
        condition.createdAt,
        condition.updatedAt,
      ]
    );
  }

  async getConditions(userId: string): Promise<ServiceCondition[]> {
    const db = await this.getDb();
    const results = await db.getAllAsync<any>(
      'SELECT * FROM service_conditions WHERE userId = ? ORDER BY onsetDate DESC',
      [userId]
    );
    return results.map((r) => ({
      ...r,
      serviceConnected: !!r.serviceConnected,
      vaClaimed: !!r.vaClaimed,
      relatedDeploymentIds: r.relatedDeploymentIds ? JSON.parse(r.relatedDeploymentIds) : [],
      relatedDutyStationIds: r.relatedDutyStationIds ? JSON.parse(r.relatedDutyStationIds) : [],
      relatedAppointmentIds: r.relatedAppointmentIds ? JSON.parse(r.relatedAppointmentIds) : [],
    })) as ServiceCondition[];
  }

  async deleteCondition(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM service_conditions WHERE id = ?', [id]);
    await db.runAsync('DELETE FROM notes WHERE parentId = ? AND parentType = ?', [id, 'condition']);
    await db.runAsync('DELETE FROM attachments WHERE parentId = ? AND parentType = ?', [id, 'condition']);
  }

  // =========================================================================
  // NOTES
  // =========================================================================

  async saveNote(note: Note): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO notes
       (id, parentId, parentType, title, content, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [note.id, note.parentId, note.parentType, note.title, note.content, note.createdAt, note.updatedAt]
    );
  }

  async getNotes(parentId: string, parentType: string): Promise<Note[]> {
    const db = await this.getDb();
    return await db.getAllAsync<Note>(
      'SELECT * FROM notes WHERE parentId = ? AND parentType = ? ORDER BY createdAt DESC',
      [parentId, parentType]
    );
  }

  async getAllNotes(userId: string): Promise<Note[]> {
    const db = await this.getDb();
    return await db.getAllAsync<Note>(
      'SELECT * FROM notes ORDER BY createdAt DESC'
    );
  }

  async deleteNote(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
  }

  // =========================================================================
  // ATTACHMENTS
  // =========================================================================

  async saveAttachment(attachment: Attachment): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO attachments
       (id, parentId, parentType, fileName, fileUri, fileType, fileSize, description, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        attachment.id,
        attachment.parentId,
        attachment.parentType,
        attachment.fileName,
        attachment.fileUri,
        attachment.fileType,
        attachment.fileSize,
        attachment.description || null,
        attachment.createdAt,
      ]
    );
  }

  async getAttachments(parentId: string, parentType: string): Promise<Attachment[]> {
    const db = await this.getDb();
    return await db.getAllAsync<Attachment>(
      'SELECT * FROM attachments WHERE parentId = ? AND parentType = ? ORDER BY createdAt DESC',
      [parentId, parentType]
    );
  }

  async deleteAttachment(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM attachments WHERE id = ?', [id]);
  }

  // =========================================================================
  // VA CLAIMS
  // =========================================================================

  async saveClaim(claim: VAClaim): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO va_claims
       (id, userId, claimNumber, filingDate, status, conditions, decisionDate, ratingPercent, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        claim.id,
        claim.userId,
        claim.claimNumber || null,
        claim.filingDate || null,
        claim.status,
        JSON.stringify(claim.conditions),
        claim.decisionDate || null,
        claim.ratingPercent || null,
        claim.notes,
        claim.createdAt,
        claim.updatedAt,
      ]
    );
  }

  async getClaims(userId: string): Promise<VAClaim[]> {
    const db = await this.getDb();
    const results = await db.getAllAsync<any>(
      'SELECT * FROM va_claims WHERE userId = ? ORDER BY createdAt DESC',
      [userId]
    );
    return results.map((r) => ({
      ...r,
      conditions: r.conditions ? JSON.parse(r.conditions) : [],
    })) as VAClaim[];
  }

  async deleteClaim(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM va_claims WHERE id = ?', [id]);
  }

  // =========================================================================
  // APP SETTINGS
  // =========================================================================

  async getSetting(key: string): Promise<string | null> {
    const db = await this.getDb();
    const result = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?',
      [key]
    );
    return result?.value || null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }

  async getSettings(): Promise<AppSettings> {
    const onboarding = await this.getSetting('onboardingComplete');
    const calSync = await this.getSetting('calendarSyncEnabled');
    const lastSync = await this.getSetting('lastCalendarSync');
    const notifications = await this.getSetting('notificationsEnabled');
    const biometric = await this.getSetting('biometricLockEnabled');

    return {
      onboardingComplete: onboarding === 'true',
      calendarSyncEnabled: calSync === 'true',
      lastCalendarSync: lastSync || undefined,
      notificationsEnabled: notifications === 'true',
      biometricLockEnabled: biometric === 'true',
    };
  }

  // =========================================================================
  // STATISTICS (for dashboard)
  // =========================================================================

  async getStats(userId: string): Promise<{
    totalAppointments: number;
    totalDeployments: number;
    totalDutyStations: number;
    totalConditions: number;
    serviceConnectedConditions: number;
    claimedConditions: number;
  }> {
    const db = await this.getDb();

    const appointments = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM medical_appointments WHERE userId = ?',
      [userId]
    );
    const deployments = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM deployments WHERE userId = ?',
      [userId]
    );
    const stations = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM duty_stations WHERE userId = ?',
      [userId]
    );
    const conditions = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM service_conditions WHERE userId = ?',
      [userId]
    );
    const scConditions = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM service_conditions WHERE userId = ? AND serviceConnected = 1',
      [userId]
    );
    const claimed = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM service_conditions WHERE userId = ? AND vaClaimed = 1',
      [userId]
    );

    return {
      totalAppointments: appointments?.count || 0,
      totalDeployments: deployments?.count || 0,
      totalDutyStations: stations?.count || 0,
      totalConditions: conditions?.count || 0,
      serviceConnectedConditions: scConditions?.count || 0,
      claimedConditions: claimed?.count || 0,
    };
  }
}

// Singleton instance
export const database = new DatabaseService();
