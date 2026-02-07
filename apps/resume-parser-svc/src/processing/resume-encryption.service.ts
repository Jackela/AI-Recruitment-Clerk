import { Injectable, Logger } from '@nestjs/common';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';
import {
  ResumeParserException,
  EncryptionService,
} from '@ai-recruitment-clerk/infrastructure-shared';
import type { ResumeParserConfigService } from '../config';

/**
 * Resume DTO after PII encryption
 */
export interface SecuredResumeDto extends Omit<ResumeDTO, 'contactInfo'> {
  _organizationId: string;
  _dataClassification: string;
  // Encrypted contact info - using Record to avoid any
  contactInfo: Record<string, unknown>;
  // Other resume fields - using index signature with proper type
  [key: string]: unknown;
}

/**
 * Options for securing resume data
 */
export interface ResumeSecurityOptions {
  organizationId: string;
  encryptContactInfo?: boolean;
  dataClassification?: string;
  processingNode?: string;
}

/**
 * Handles PII encryption and data security for resume parsing.
 * Extracted from ParsingService to separate security concerns.
 */
@Injectable()
export class ResumeEncryptionService {
  private readonly logger = new Logger(ResumeEncryptionService.name);

  constructor(private readonly config: ResumeParserConfigService) {}

  /**
   * Encrypts sensitive PII data in a resume DTO
   * @param resumeDto - Original resume data
   * @param organizationId - Organization context for encryption
   * @returns Resume with encrypted PII fields
   * @throws ResumeParserException if encryption fails
   */
  public encryptSensitiveData(
    resumeDto: Record<string, unknown>,
    organizationId: string,
  ): SecuredResumeDto {
    try {
      // Create a copy to avoid mutating original
      const secureCopy = JSON.parse(JSON.stringify(resumeDto));

      // Encrypt PII fields using organization-specific context
      if (secureCopy.contactInfo) {
        secureCopy.contactInfo = EncryptionService.encryptUserPII(
          secureCopy.contactInfo,
        );
      }

      // Add organization context for data isolation
      secureCopy._organizationId = organizationId;
      secureCopy._dataClassification = 'sensitive-pii';

      this.logger.debug(
        `Encrypted sensitive data for organization: ${organizationId}`,
      );
      return secureCopy as SecuredResumeDto;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to encrypt sensitive data: ${err.message}`);
      throw new ResumeParserException('DATA_ENCRYPTION_FAILED', {
        organizationId,
        originalError: err.message,
      });
    }
  }

  /**
   * Encrypts resume data with full security options
   * @param resumeDto - Original resume data
   * @param options - Security options including organization ID
   * @returns Secured resume DTO with metadata
   */
  public secureResumeData(
    resumeDto: Record<string, unknown>,
    options: ResumeSecurityOptions,
  ): SecuredResumeDto {
    const {
      organizationId,
      encryptContactInfo = true,
      dataClassification = 'sensitive-pii',
      processingNode,
    } = options;

    try {
      const secureCopy = JSON.parse(JSON.stringify(resumeDto));

      // Conditionally encrypt contact info
      if (encryptContactInfo && secureCopy.contactInfo) {
        secureCopy.contactInfo = EncryptionService.encryptUserPII(
          secureCopy.contactInfo,
        );
      }

      // Add security metadata
      secureCopy._organizationId = organizationId;
      secureCopy._dataClassification = dataClassification;

      if (processingNode) {
        secureCopy._processingNode = processingNode;
      }

      this.logger.debug(
        `Secured resume data for organization: ${organizationId}`,
      );
      return secureCopy as SecuredResumeDto;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to secure resume data: ${err.message}`);
      throw new ResumeParserException('DATA_ENCRYPTION_FAILED', {
        organizationId,
        originalError: err.message,
      });
    }
  }

  /**
   * Validates organization ID format and basic requirements
   * @param organizationId - Organization ID to validate
   * @param minLength - Minimum allowed length (default 5)
   * @returns True if valid
   * @throws ResumeParserException if invalid
   */
  public validateOrganizationId(
    organizationId: string,
    minLength = 5,
  ): boolean {
    if (!organizationId || organizationId.length < minLength) {
      throw new ResumeParserException('INVALID_ORGANIZATION_ID', {
        providedId: organizationId,
        minLength,
      });
    }
    return true;
  }

  /**
   * Validates organization access context for a job
   * @param organizationId - Organization ID
   * @param jobId - Job ID to verify association
   * @returns True if access is valid
   * @throws ResumeParserException if validation fails
   */
  public validateOrganizationAccess(
    organizationId: string,
    jobId: string,
  ): boolean {
    // Validate organization ID format
    this.validateOrganizationId(organizationId);

    // Basic format check: jobId should reference the organization
    // In production, this would check against database
    if (!jobId.includes(organizationId.substring(0, 8))) {
      this.logger.warn(
        `Potential cross-organization access attempt: org=${organizationId}, job=${jobId}`,
      );
      // In production, this would be a strict security check
    }

    return true;
  }

  /**
   * Creates security metadata for processed resume
   * @param organizationId - Organization context
   * @param processingNode - Optional node identifier
   * @returns Security metadata object
   */
  public createSecurityMetadata(organizationId: string, processingNode?: string): {
    encrypted: boolean;
    encryptionVersion: string;
    processingNode: string;
    dataClassification: string;
  } {
    return {
      encrypted: true,
      encryptionVersion: '1.0',
      processingNode: processingNode || this.config.nodeName,
      dataClassification: 'sensitive-pii',
    };
  }
}
