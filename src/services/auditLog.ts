// ============================================================================
// EVENTUALLY.VET - Audit Logging Service
// HIPAA-aligned: Tracks all access to PHI, exports, modifications, and
// authentication events. Stored locally — the audit log itself is sensitive.
//
// Supports:
// - Authentication events (success, failure, lock/unlock)
// - Data access (view appointment, view condition, etc.)
// - Data modification (create, update, delete)
// - Data export (claim summary, PDF generation, sharing)
// - Security setting changes
// - Cloud sync events
// - Buddy letter actions
// ============================================================================

import { database } from './database';
import { generateId } from '../utils/uuid';
import { getNowISO, formatDateTime } from '../utils/dates';

// ============================================================================
// TYPES
// ============================================================================

export type AuditAction =
  // Authentication
  | 'auth_success'
  | 'auth_failed'
  | 'auth_biometric_failed'
  | 'app_locked'
  | 'app_unlocked'
  // Data Access
  | 'data_viewed'
  | 'data_searched'
  // Data Modification
  | 'data_created'
  | 'data_updated'
  | 'data_deleted'
  // Export & Sharing
  | 'data_exported'
  | 'data_shared'
  | 'pdf_generated'
  | 'email_sent'
  // Cloud
  | 'cloud_backup_started'
  | 'cloud_backup_completed'
  | 'cloud_restore_started'
  | 'cloud_restore_completed'
  | 'cloud_backup_failed'
  // Buddy Letters
  | 'buddy_letter_created'
  | 'buddy_letter_sent'
  | 'buddy_letter_received'
  | 'buddy_letter_attached'
  // Security
  | 'security_setting_changed'
  | 'account_created'
  | 'account_signed_in'
  | 'account_signed_out'
  // Calendar
  | 'calendar_imported'
  // Attachments
  | 'attachment_added'
  | 'attachment_deleted'
  | 'attachment_viewed';

export type AuditCategory =
  | 'authentication'
  | 'data_access'
  | 'data_modification'
  | 'export'
  | 'cloud'
  | 'buddy_letter'
  | 'settings'
  | 'calendar'
  | 'attachment';

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  category: AuditCategory;
  entityType?: string;       // 'appointment', 'deployment', 'condition', etc.
  entityId?: string;         // ID of the affected record
  details?: Record<string, string>; // Additional context
  ipAddress?: string;        // Not tracked (privacy) — placeholder for future
  deviceInfo?: string;       // Device model for multi-device tracking
}

export interface AuditLogFilter {
  category?: AuditCategory;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
  entityType?: string;
  limit?: number;
}

export interface AuditStats {
  totalEntries: number;
  last24Hours: number;
  last7Days: number;
  authFailures24h: number;
  exportsLast30Days: number;
  categories: Record<AuditCategory, number>;
}

// ============================================================================
// SERVICE
// ============================================================================

class AuditLogService {
  private maxEntries: number = 10000; // Keep last 10k entries
  private entries: AuditEntry[] = [];
  private loaded: boolean = false;

  // =========================================================================
  // LOGGING
  // =========================================================================

  /**
   * Log an audit event
   * This is the primary method — call it for every trackable action
   */
  async log(
    action: AuditAction,
    category: AuditCategory,
    entityType?: string,
    details?: Record<string, string>,
    entityId?: string
  ): Promise<void> {
    const entry: AuditEntry = {
      id: generateId(),
      timestamp: getNowISO(),
      action,
      category,
      entityType,
      entityId,
      details,
    };

    await this.ensureLoaded();
    this.entries.unshift(entry); // Most recent first

    // Trim if over max
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }

    // Persist
    await this.save();
  }

  // =========================================================================
  // CONVENIENCE METHODS
  // =========================================================================

  /**
   * Log a data view event
   */
  async logView(entityType: string, entityId: string, entityName?: string): Promise<void> {
    await this.log('data_viewed', 'data_access', entityType, 
      entityName ? { name: entityName } : undefined, entityId);
  }

  /**
   * Log a data creation event
   */
  async logCreate(entityType: string, entityId: string, entityName?: string): Promise<void> {
    await this.log('data_created', 'data_modification', entityType,
      entityName ? { name: entityName } : undefined, entityId);
  }

  /**
   * Log a data update event
   */
  async logUpdate(entityType: string, entityId: string, fields?: string[]): Promise<void> {
    await this.log('data_updated', 'data_modification', entityType,
      fields ? { fields: fields.join(', ') } : undefined, entityId);
  }

  /**
   * Log a data deletion event
   */
  async logDelete(entityType: string, entityId: string, entityName?: string): Promise<void> {
    await this.log('data_deleted', 'data_modification', entityType,
      entityName ? { name: entityName } : undefined, entityId);
  }

  /**
   * Log an export event
   */
  async logExport(exportType: string, details?: Record<string, string>): Promise<void> {
    await this.log('data_exported', 'export', exportType, details);
  }

  /**
   * Log a share event
   */
  async logShare(shareType: string, recipient?: string): Promise<void> {
    await this.log('data_shared', 'export', shareType,
      recipient ? { recipient } : undefined);
  }

  // =========================================================================
  // QUERYING
  // =========================================================================

  /**
   * Get audit entries with optional filtering
   */
  async getEntries(filter?: AuditLogFilter): Promise<AuditEntry[]> {
    await this.ensureLoaded();
    let results = [...this.entries];

    if (filter) {
      if (filter.category) {
        results = results.filter((e) => e.category === filter.category);
      }
      if (filter.action) {
        results = results.filter((e) => e.action === filter.action);
      }
      if (filter.entityType) {
        results = results.filter((e) => e.entityType === filter.entityType);
      }
      if (filter.startDate) {
        results = results.filter((e) => e.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        results = results.filter((e) => e.timestamp <= filter.endDate!);
      }
      if (filter.limit) {
        results = results.slice(0, filter.limit);
      }
    }

    return results;
  }

  /**
   * Get recent entries (last N)
   */
  async getRecent(count: number = 50): Promise<AuditEntry[]> {
    await this.ensureLoaded();
    return this.entries.slice(0, count);
  }

  /**
   * Get entries for a specific entity
   */
  async getEntityHistory(entityType: string, entityId: string): Promise<AuditEntry[]> {
    await this.ensureLoaded();
    return this.entries.filter(
      (e) => e.entityType === entityType && e.entityId === entityId
    );
  }

  /**
   * Get authentication events (for security review)
   */
  async getAuthEvents(limit: number = 100): Promise<AuditEntry[]> {
    return this.getEntries({ category: 'authentication', limit });
  }

  /**
   * Get export events (for compliance review)
   */
  async getExportEvents(limit: number = 100): Promise<AuditEntry[]> {
    return this.getEntries({ category: 'export', limit });
  }

  // =========================================================================
  // STATISTICS
  // =========================================================================

  /**
   * Get audit log statistics
   */
  async getStats(): Promise<AuditStats> {
    await this.ensureLoaded();

    const now = Date.now();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    const categories: Record<AuditCategory, number> = {
      authentication: 0,
      data_access: 0,
      data_modification: 0,
      export: 0,
      cloud: 0,
      buddy_letter: 0,
      settings: 0,
      calendar: 0,
      attachment: 0,
    };

    let last24Hours = 0;
    let last7Days = 0;
    let authFailures24h = 0;
    let exportsLast30Days = 0;

    for (const entry of this.entries) {
      categories[entry.category]++;

      if (entry.timestamp >= oneDayAgo) {
        last24Hours++;
        if (entry.action === 'auth_failed' || entry.action === 'auth_biometric_failed') {
          authFailures24h++;
        }
      }
      if (entry.timestamp >= sevenDaysAgo) {
        last7Days++;
      }
      if (entry.timestamp >= thirtyDaysAgo && entry.category === 'export') {
        exportsLast30Days++;
      }
    }

    return {
      totalEntries: this.entries.length,
      last24Hours,
      last7Days,
      authFailures24h,
      exportsLast30Days,
      categories,
    };
  }

  // =========================================================================
  // EXPORT (for legal/compliance)
  // =========================================================================

  /**
   * Export full audit log as formatted text
   * Useful for legal proceedings or compliance audits
   */
  async exportAsText(): Promise<string> {
    await this.ensureLoaded();

    const lines: string[] = [];
    lines.push('═══════════════════════════════════════════════════════');
    lines.push('EVENTUALLY.VET — AUDIT LOG EXPORT');
    lines.push('═══════════════════════════════════════════════════════');
    lines.push(`Export Date: ${formatDateTime(getNowISO())}`);
    lines.push(`Total Entries: ${this.entries.length}`);
    lines.push('');
    lines.push('─── ENTRIES ───');
    lines.push('');

    for (const entry of this.entries) {
      lines.push(`[${formatDateTime(entry.timestamp)}] ${entry.action}`);
      lines.push(`  Category: ${entry.category}`);
      if (entry.entityType) lines.push(`  Entity: ${entry.entityType}${entry.entityId ? ` (${entry.entityId.slice(0, 8)}...)` : ''}`);
      if (entry.details) {
        Object.entries(entry.details).forEach(([key, value]) => {
          lines.push(`  ${key}: ${value}`);
        });
      }
      lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════════');
    lines.push('END OF AUDIT LOG');
    return lines.join('\n');
  }

  // =========================================================================
  // MANAGEMENT
  // =========================================================================

  /**
   * Clear all audit entries (requires authentication)
   * Logs the clear action itself before clearing
   */
  async clearLog(): Promise<void> {
    // Log the clear action before clearing
    const clearEntry: AuditEntry = {
      id: generateId(),
      timestamp: getNowISO(),
      action: 'security_setting_changed',
      category: 'settings',
      details: { action: 'audit_log_cleared', previousEntryCount: String(this.entries.length) },
    };

    this.entries = [clearEntry];
    await this.save();
  }

  /**
   * Get total entry count
   */
  async getCount(): Promise<number> {
    await this.ensureLoaded();
    return this.entries.length;
  }

  // =========================================================================
  // PERSISTENCE
  // =========================================================================

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const data = await database.getSetting('audit_log');
      if (data) {
        this.entries = JSON.parse(data);
      }
    } catch (e) {
      this.entries = [];
    }
    this.loaded = true;
  }

  private async save(): Promise<void> {
    await database.setSetting('audit_log', JSON.stringify(this.entries));
  }
}

export const auditLog = new AuditLogService();
