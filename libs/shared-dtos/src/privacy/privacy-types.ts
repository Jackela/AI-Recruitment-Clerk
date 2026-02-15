/**
 * Privacy Service Type Definitions
 *
 * This file contains type definitions for privacy-related services
 * to replace 'any' types and ensure type safety.
 */

/**
 * NATS client interface for privacy service
 */
export interface NatsClient {
  publish(subject: string, data: unknown): Promise<void>;
  request(subject: string, data: unknown, timeout: number): Promise<unknown>;
}

/**
 * Mongoose model fallback interface
 */
export interface MongoModel<T = unknown> {
  find(filter: Record<string, unknown>): {
    lean: () => Promise<T[]>;
  };
  deleteOne?(filter: Record<string, unknown>): Promise<{
    acknowledged: boolean;
    deletedCount: number;
  }>;
}

/**
 * Collected user data item from services
 */
export interface UserDataCollectionItem {
  service: string;
  dataType: string;
  data: unknown;
  collectedAt: string;
}

/**
 * Data summary for export packages
 */
export interface DataSummary {
  totalRecords: number;
  dataByService: Record<string, number>;
  dataByType: Record<string, number>;
  recordTypes: string[];
}

/**
 * Export package data structure
 */
export interface ExportData {
  metadata: {
    exportedAt: string;
    dataSubject: string;
    totalRecords: number;
    exportFormat: string;
    gdprCompliant: boolean;
    packageId: string;
  };
  data: UserDataCollectionItem[];
  summary: DataSummary;
}

/**
 * Secure file storage result
 */
export interface SecureFileInfo {
  fileId: string;
  storagePath: string;
}

/**
 * Erasure eligibility check result
 */
export interface ErasureEligibilityResult {
  eligible: boolean;
  reason?: string;
}

/**
 * Consent cascade notification
 */
export interface ConsentCascadeNotification {
  userId: string;
  purpose: string;
  action: string;
  timestamp: string;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  userId: string;
  purpose: string;
  action: string;
  timestamp: string;
  details: string;
}
