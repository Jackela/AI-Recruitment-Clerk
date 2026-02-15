import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type {
  NatsClient,
  DataSubjectRightsRequest,
  CreateRightsRequestDto,
} from '@ai-recruitment-clerk/shared-dtos';
import {
  DataSubjectRightType,
  RequestStatus,
  IdentityVerificationStatus,
} from '@ai-recruitment-clerk/shared-dtos';

/**
 * Data Subject Rights Service
 * Manages GDPR data subject rights requests (Articles 15-21)
 * Handles creation and automated processing of rights requests
 */
@Injectable()
export class DataSubjectRightsService {
  private readonly logger = new Logger(DataSubjectRightsService.name);

  constructor() {}

  /**
   * Create a new data subject rights request
   */
  public async createRightsRequest(
    createRequestDto: CreateRightsRequestDto,
    natsClient: NatsClient,
  ): Promise<DataSubjectRightsRequest> {
    this.logger.log(
      `Creating rights request for user: ${createRequestDto.userId}, type: ${createRequestDto.requestType}`,
    );

    try {
      const requestId = uuidv4();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // 30 days per GDPR

      const rightsRequest: DataSubjectRightsRequest = {
        id: requestId,
        userId: createRequestDto.userId,
        requestType: createRequestDto.requestType,
        type: createRequestDto.requestType,
        status: RequestStatus.PENDING,
        identityVerificationStatus: IdentityVerificationStatus.PENDING,
        requestDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as DataSubjectRightsRequest;

      // TODO: Store in database
      // await this.dataSubjectRightsModel.create(rightsRequest);

      // Publish rights request created event
      await natsClient.publish('rights.request.created', {
        requestId,
        userId: createRequestDto.userId,
        requestType: createRequestDto.requestType,
        timestamp: new Date().toISOString(),
      });

      // Start automated processing for certain request types
      await this.startAutomatedRightsProcessing(rightsRequest, natsClient);

      this.logger.log(`Rights request created: ${requestId}`);
      return rightsRequest;
    } catch (error) {
      this.logger.error(
        `Failed to create rights request for user ${createRequestDto.userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Start automated processing for rights requests
   * Certain request types can be processed automatically
   */
  public async startAutomatedRightsProcessing(
    request: DataSubjectRightsRequest,
    natsClient: NatsClient,
  ): Promise<void> {
    this.logger.log(
      `Starting automated rights processing for request: ${request.id}`,
    );

    try {
      switch (request.requestType) {
        case DataSubjectRightType.ACCESS:
          // Auto-generate data export
          await natsClient.publish('rights.request.process', {
            requestId: request.id,
            userId: request.userId,
            action: 'generate_export',
          });
          break;

        case DataSubjectRightType.PORTABILITY:
          // Auto-generate portable data export
          await natsClient.publish('rights.request.process', {
            requestId: request.id,
            userId: request.userId,
            action: 'generate_portable_export',
          });
          break;

        case DataSubjectRightType.ERASURE:
          // Check for deletion eligibility
          await natsClient.publish('rights.request.process', {
            requestId: request.id,
            userId: request.userId,
            action: 'check_erasure_eligibility',
          });
          break;

        case DataSubjectRightType.RECTIFICATION:
          // Manual processing required - notify admin
          await natsClient.publish('rights.request.manual_review', {
            requestId: request.id,
            userId: request.userId,
            reason: 'Rectification requires manual review',
          });
          break;

        case DataSubjectRightType.OBJECTION:
          // Manual processing required - notify admin
          await natsClient.publish('rights.request.manual_review', {
            requestId: request.id,
            userId: request.userId,
            reason: 'Objection requires manual review',
          });
          break;

        case DataSubjectRightType.RESTRICT_PROCESSING:
          // Manual processing required - notify admin
          await natsClient.publish('rights.request.manual_review', {
            requestId: request.id,
            userId: request.userId,
            reason: 'Restriction request requires manual review',
          });
          break;

        default:
          // Manual processing required
          await natsClient.publish('rights.request.manual_review', {
            requestId: request.id,
            userId: request.userId,
            reason: 'Unknown request type',
          });
          break;
      }

      this.logger.log(
        `Automated processing initiated for request: ${request.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to start automated rights processing for request ${request.id}:`,
        error,
      );
      throw error;
    }
  }
}
