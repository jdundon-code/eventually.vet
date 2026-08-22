// ============================================================================
// EVENTUALLY.VET - Cloud Sync Service
// Handles encrypted backup/restore of all user data to Supabase
// Local-first: app works offline, syncs when connected
// ============================================================================

import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';
import { encryption } from './encryption';
import { database } from './database';
import { getNowISO } from '../utils/dates';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: string | null;
  lastBackupAt: string | null;
  storageUsedBytes: number;
  attachmentCount: number;
  error: string | null;
}

export interface CloudUser {
  id: string;
  email: string;
  createdAt: string;
}

class CloudSyncService {
  private syncState: SyncState = {
    status: 'idle',
    lastSyncAt: null,
    lastBackupAt: null,
    storageUsedBytes: 0,
    attachmentCount: 0,
    error: null,
  };

  private listeners: ((state: SyncState) => void)[] = [];

  // =========================================================================
  // AUTH
  // =========================================================================

  /**
   * Sign up a new user with email + password
   * Password is also used to derive the encryption key
   */
  async signUp(email: string, password: string): Promise<{ user: CloudUser | null; error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        // Derive encryption key from password + user ID as salt
        await encryption.deriveKey(password, data.user.id);

        // Store key derivation info locally (NOT the key itself)
        await database.setSetting('cloud_user_id', data.user.id);
        await database.setSetting('cloud_email', email);
        await database.setSetting('cloud_enabled', 'true');

        return {
          user: {
            id: data.user.id,
            email: email,
            createdAt: data.user.created_at || getNowISO(),
          },
          error: null,
        };
      }

      return { user: null, error: 'Unknown error during sign up' };
    } catch (e: any) {
      return { user: null, error: e.message || 'Sign up failed' };
    }
  }

  /**
   * Sign in existing user
   */
  async signIn(email: string, password: string): Promise<{ user: CloudUser | null; error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        await encryption.deriveKey(password, data.user.id);
        await database.setSetting('cloud_user_id', data.user.id);
        await database.setSetting('cloud_email', email);
        await database.setSetting('cloud_enabled', 'true');

        return {
          user: {
            id: data.user.id,
            email: email,
            createdAt: data.user.created_at || getNowISO(),
          },
          error: null,
        };
      }

      return { user: null, error: 'Unknown error during sign in' };
    } catch (e: any) {
      return { user: null, error: e.message || 'Sign in failed' };
    }
  }

  /**
   * Sign out and clear cloud state
   */
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
    encryption.setKey('');
    await database.setSetting('cloud_enabled', 'false');
    this.updateState({ status: 'idle', lastSyncAt: null });
  }

  /**
   * Get current auth session
   */
  async getSession(): Promise<CloudUser | null> {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      return {
        id: data.session.user.id,
        email: data.session.user.email || '',
        createdAt: data.session.user.created_at || '',
      };
    }
    return null;
  }

  // =========================================================================
  // FULL DATA BACKUP
  // =========================================================================

  /**
   * Backup all local data to cloud (encrypted)
   * This creates a complete snapshot of the user's data
   */
  async backupAll(): Promise<{ success: boolean; error: string | null }> {
    try {
      this.updateState({ status: 'syncing', error: null });

      const session = await this.getSession();
      if (!session) {
        this.updateState({ status: 'error', error: 'Not signed in' });
        return { success: false, error: 'Not signed in' };
      }

      const profile = await database.getUserProfile();
      if (!profile) {
        this.updateState({ status: 'error', error: 'No profile found' });
        return { success: false, error: 'No profile found' };
      }

      // Gather all data
      const appointments = await database.getAppointments(profile.id);
      const deployments = await database.getDeployments(profile.id);
      const dutyStations = await database.getDutyStations(profile.id);
      const conditions = await database.getConditions(profile.id);
      const claims = await database.getClaims(profile.id);

      // Gather all notes and attachments
      const allNotes: any[] = [];
      const allAttachments: any[] = [];

      for (const apt of appointments) {
        const notes = await database.getNotes(apt.id, 'appointment');
        const attachments = await database.getAttachments(apt.id, 'appointment');
        allNotes.push(...notes);
        allAttachments.push(...attachments);
      }
      for (const dep of deployments) {
        const notes = await database.getNotes(dep.id, 'deployment');
        const attachments = await database.getAttachments(dep.id, 'deployment');
        allNotes.push(...notes);
        allAttachments.push(...attachments);
      }
      for (const station of dutyStations) {
        const notes = await database.getNotes(station.id, 'duty_station');
        const attachments = await database.getAttachments(station.id, 'duty_station');
        allNotes.push(...notes);
        allAttachments.push(...attachments);
      }
      for (const condition of conditions) {
        const notes = await database.getNotes(condition.id, 'condition');
        const attachments = await database.getAttachments(condition.id, 'condition');
        allNotes.push(...notes);
        allAttachments.push(...attachments);
      }

      // Create backup payload
      const backupPayload = {
        version: 2,
        timestamp: getNowISO(),
        profile,
        appointments,
        deployments,
        dutyStations,
        conditions,
        claims,
        notes: allNotes,
        attachments: allAttachments,
      };

      // Encrypt the entire payload
      const encryptedData = await encryption.encryptObject(backupPayload);
      const dataHash = await encryption.hash(JSON.stringify(backupPayload));

      // Upload encrypted backup to Supabase
      const { error: uploadError } = await supabase
        .from('backups')
        .upsert({
          user_id: session.id,
          encrypted_data: encryptedData,
          data_hash: dataHash,
          record_count: appointments.length + deployments.length + dutyStations.length + conditions.length,
          attachment_count: allAttachments.length,
          backup_version: 2,
          created_at: getNowISO(),
        }, {
          onConflict: 'user_id',
        });

      if (uploadError) {
        this.updateState({ status: 'error', error: uploadError.message });
        return { success: false, error: uploadError.message };
      }

      // Upload attachment files to cloud storage
      await this.syncAttachments(session.id, allAttachments);

      const now = getNowISO();
      await database.setSetting('lastBackupAt', now);
      this.updateState({
        status: 'success',
        lastBackupAt: now,
        lastSyncAt: now,
        attachmentCount: allAttachments.length,
        error: null,
      });

      return { success: true, error: null };
    } catch (e: any) {
      this.updateState({ status: 'error', error: e.message });
      return { success: false, error: e.message || 'Backup failed' };
    }
  }

  // =========================================================================
  // RESTORE FROM CLOUD
  // =========================================================================

  /**
   * Restore all data from cloud backup to local device
   * Used when setting up a new device or after data loss
   */
  async restoreFromCloud(): Promise<{ success: boolean; error: string | null; recordCount: number }> {
    try {
      this.updateState({ status: 'syncing', error: null });

      const session = await this.getSession();
      if (!session) {
        return { success: false, error: 'Not signed in', recordCount: 0 };
      }

      // Fetch encrypted backup
      const { data, error } = await supabase
        .from('backups')
        .select('*')
        .eq('user_id', session.id)
        .single();

      if (error || !data) {
        this.updateState({ status: 'error', error: 'No backup found' });
        return { success: false, error: 'No backup found in cloud', recordCount: 0 };
      }

      // Decrypt the backup
      const backup = await encryption.decryptObject<any>(data.encrypted_data);

      if (!backup || !backup.profile) {
        this.updateState({ status: 'error', error: 'Failed to decrypt backup' });
        return { success: false, error: 'Failed to decrypt. Wrong password?', recordCount: 0 };
      }

      // Restore profile
      await database.saveUserProfile(backup.profile);

      // Restore appointments
      let recordCount = 0;
      for (const apt of backup.appointments || []) {
        await database.saveAppointment(apt);
        recordCount++;
      }

      // Restore deployments
      for (const dep of backup.deployments || []) {
        await database.saveDeployment(dep);
        recordCount++;
      }

      // Restore duty stations
      for (const station of backup.dutyStations || []) {
        await database.saveDutyStation(station);
        recordCount++;
      }

      // Restore conditions
      for (const condition of backup.conditions || []) {
        await database.saveCondition(condition);
        recordCount++;
      }

      // Restore claims
      for (const claim of backup.claims || []) {
        await database.saveClaim(claim);
        recordCount++;
      }

      // Restore notes
      for (const note of backup.notes || []) {
        await database.saveNote(note);
      }

      // Restore attachment records (files downloaded on demand)
      for (const attachment of backup.attachments || []) {
        await database.saveAttachment(attachment);
      }

      // Download attachment files from cloud
      await this.downloadAttachments(session.id, backup.attachments || []);

      await database.setSetting('onboardingComplete', 'true');
      this.updateState({ status: 'success', error: null });

      return { success: true, error: null, recordCount };
    } catch (e: any) {
      this.updateState({ status: 'error', error: e.message });
      return { success: false, error: e.message || 'Restore failed', recordCount: 0 };
    }
  }

  // =========================================================================
  // ATTACHMENT CLOUD STORAGE
  // =========================================================================

  /**
   * Upload attachment files to Supabase Storage
   * Files are stored encrypted in a user-specific bucket path
   */
  private async syncAttachments(userId: string, attachments: any[]): Promise<void> {
    for (const attachment of attachments) {
      try {
        // Check if file exists locally
        const fileInfo = await FileSystem.getInfoAsync(attachment.fileUri);
        if (!fileInfo.exists) continue;

        // Read file as base64
        const fileContent = await FileSystem.readAsStringAsync(attachment.fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Encrypt the file content
        const encryptedContent = await encryption.encrypt(fileContent);

        // Upload to Supabase Storage
        const storagePath = `${userId}/${attachment.id}`;
        const { error } = await supabase.storage
          .from('attachments')
          .upload(storagePath, encryptedContent, {
            contentType: 'application/octet-stream',
            upsert: true,
          });

        if (error) {
          console.warn(`Failed to upload attachment ${attachment.id}:`, error.message);
        }
      } catch (e) {
        console.warn(`Error syncing attachment ${attachment.id}:`, e);
      }
    }
  }

  /**
   * Download attachment files from cloud to local storage
   */
  private async downloadAttachments(userId: string, attachments: any[]): Promise<void> {
    for (const attachment of attachments) {
      try {
        const storagePath = `${userId}/${attachment.id}`;
        const { data, error } = await supabase.storage
          .from('attachments')
          .download(storagePath);

        if (error || !data) continue;

        // Read the encrypted content
        const encryptedContent = await data.text();

        // Decrypt
        const decryptedBase64 = await encryption.decrypt(encryptedContent);

        // Write to local file system
        const localDir = `${FileSystem.documentDirectory}attachments/`;
        await FileSystem.makeDirectoryAsync(localDir, { intermediates: true });
        const localPath = `${localDir}${attachment.id}_${attachment.fileName}`;

        await FileSystem.writeAsStringAsync(localPath, decryptedBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Update the attachment record with new local path
        attachment.fileUri = localPath;
        await database.saveAttachment(attachment);
      } catch (e) {
        console.warn(`Error downloading attachment ${attachment.id}:`, e);
      }
    }
  }

  // =========================================================================
  // STORAGE METRICS
  // =========================================================================

  /**
   * Get cloud storage usage for the current user
   */
  async getStorageUsage(): Promise<{ totalBytes: number; attachmentCount: number; lastBackup: string | null }> {
    try {
      const session = await this.getSession();
      if (!session) return { totalBytes: 0, attachmentCount: 0, lastBackup: null };

      const { data } = await supabase
        .from('backups')
        .select('encrypted_data, attachment_count, created_at')
        .eq('user_id', session.id)
        .single();

      if (!data) return { totalBytes: 0, attachmentCount: 0, lastBackup: null };

      // Estimate storage: backup data + attachments
      const backupSize = new Blob([data.encrypted_data || '']).size;

      // Get attachment storage size
      const { data: files } = await supabase.storage
        .from('attachments')
        .list(session.id);

      let attachmentSize = 0;
      if (files) {
        attachmentSize = files.reduce((sum, f) => sum + (f.metadata?.size || 0), 0);
      }

      return {
        totalBytes: backupSize + attachmentSize,
        attachmentCount: data.attachment_count || 0,
        lastBackup: data.created_at,
      };
    } catch (e) {
      return { totalBytes: 0, attachmentCount: 0, lastBackup: null };
    }
  }

  /**
   * Get local storage usage
   */
  async getLocalStorageUsage(): Promise<{ totalBytes: number; attachmentBytes: number; databaseBytes: number }> {
    try {
      let attachmentBytes = 0;
      const attachDir = `${FileSystem.documentDirectory}attachments/`;
      const dirInfo = await FileSystem.getInfoAsync(attachDir);

      if (dirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(attachDir);
        for (const file of files) {
          const fileInfo = await FileSystem.getInfoAsync(`${attachDir}${file}`);
          if (fileInfo.exists && 'size' in fileInfo) {
            attachmentBytes += fileInfo.size || 0;
          }
        }
      }

      // Estimate database size (SQLite file)
      const dbPath = `${FileSystem.documentDirectory}SQLite/eventually_vet.db`;
      const dbInfo = await FileSystem.getInfoAsync(dbPath);
      const databaseBytes = dbInfo.exists && 'size' in dbInfo ? dbInfo.size || 0 : 0;

      return {
        totalBytes: attachmentBytes + databaseBytes,
        attachmentBytes,
        databaseBytes,
      };
    } catch (e) {
      return { totalBytes: 0, attachmentBytes: 0, databaseBytes: 0 };
    }
  }

  // =========================================================================
  // AUTO-SYNC
  // =========================================================================

  /**
   * Schedule periodic background sync
   * Called when app comes to foreground or after significant changes
   */
  async autoSync(): Promise<void> {
    const cloudEnabled = await database.getSetting('cloud_enabled');
    if (cloudEnabled !== 'true') return;

    const session = await this.getSession();
    if (!session) return;

    // Only sync if key is available
    if (!encryption.getKey()) return;

    // Check if enough time has passed since last sync (15 min minimum)
    const lastSync = await database.getSetting('lastBackupAt');
    if (lastSync) {
      const elapsed = Date.now() - new Date(lastSync).getTime();
      const fifteenMinutes = 15 * 60 * 1000;
      if (elapsed < fifteenMinutes) return;
    }

    // Run backup in background
    await this.backupAll();
  }

  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================

  subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getState(): SyncState {
    return { ...this.syncState };
  }

  private updateState(partial: Partial<SyncState>): void {
    this.syncState = { ...this.syncState, ...partial };
    this.listeners.forEach((l) => l(this.syncState));
  }
}

export const cloudSync = new CloudSyncService();
