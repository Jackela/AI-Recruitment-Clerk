import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DataSubjectRightsService } from './data-subject-rights.service';
import {
  DataSubjectRightType,
  RequestStatus,
  IdentityVerificationStatus,
} from '@ai-recruitment-clerk/shared-dtos';
import type { CreateRightsRequestDto } from '@ai-recruitment-clerk/shared-dtos';

describe('DataSubjectRightsService', () => {
  let service: DataSubjectRightsService;
  let natsClientMock: { publish: jest.Mock };

  beforeEach(async () => {
    natsClientMock = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DataSubjectRightsService],
    }).compile();

    service = module.get<DataSubjectRightsService>(DataSubjectRightsService);
  });

  describe('Service Creation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createRightsRequest', () => {
    const mockCreateRequestDto: CreateRightsRequestDto = {
      userId: 'user-123',
      requestType: DataSubjectRightType.ACCESS,
      description: 'I want to access my personal data',
    };

    it('should create rights request successfully', async () => {
      const result = await service.createRightsRequest(
        mockCreateRequestDto,
        natsClientMock as any,
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockCreateRequestDto.userId);
      expect(result.requestType).toBe(mockCreateRequestDto.requestType);
      expect(result.type).toBe(mockCreateRequestDto.requestType);
    });

    it('should generate unique request ID', async () => {
      const result1 = await service.createRightsRequest(
        mockCreateRequestDto,
        natsClientMock as any,
      );

      const result2 = await service.createRightsRequest(
        mockCreateRequestDto,
        natsClientMock as any,
      );

      expect(result1.id).toBeDefined();
      expect(result2.id).toBeDefined();
      expect(result1.id).not.toBe(result2.id);
      expect(result1.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should set initial status to PENDING', async () => {
      const result = await service.createRightsRequest(
        mockCreateRequestDto,
        natsClientMock as any,
      );

      expect(result.status).toBe(RequestStatus.PENDING);
    });

    it('should set identity verification status to PENDING', async () => {
      const result = await service.createRightsRequest(
        mockCreateRequestDto,
        natsClientMock as any,
      );

      expect(result.identityVerificationStatus).toBe(
        IdentityVerificationStatus.PENDING,
      );
    });

    it('should set request date', async () => {
      const before = new Date();
      const result = await service.createRightsRequest(
        mockCreateRequestDto,
        natsClientMock as any,
      );
      const after = new Date();

      expect(result.requestDate.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(result.requestDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should publish rights request created event', async () => {
      await service.createRightsRequest(
        mockCreateRequestDto,
        natsClientMock as any,
      );

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'rights.request.created',
        expect.objectContaining({
          requestId: expect.any(String),
          userId: mockCreateRequestDto.userId,
          requestType: mockCreateRequestDto.requestType,
          timestamp: expect.any(String),
        }),
      );
    });

    it('should trigger automated processing', async () => {
      const startAutomatedSpy = jest.spyOn(
        service,
        'startAutomatedRightsProcessing',
      );

      await service.createRightsRequest(
        mockCreateRequestDto,
        natsClientMock as any,
      );

      expect(startAutomatedSpy).toHaveBeenCalled();
    });

    it('should throw error when publishing fails', async () => {
      natsClientMock.publish.mockRejectedValue(new Error('NATS error'));

      await expect(
        service.createRightsRequest(
          mockCreateRequestDto,
          natsClientMock as any,
        ),
      ).rejects.toThrow('NATS error');
    });

    it('should handle different request types', async () => {
      const requestTypes = Object.values(DataSubjectRightType);

      for (const requestType of requestTypes) {
        jest.clearAllMocks();

        const dto: CreateRightsRequestDto = {
          ...mockCreateRequestDto,
          requestType,
        };

        const result = await service.createRightsRequest(
          dto,
          natsClientMock as any,
        );
        expect(result.requestType).toBe(requestType);
      }
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const result = await service.createRightsRequest(
        mockCreateRequestDto,
        natsClientMock as any,
      );

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('startAutomatedRightsProcessing', () => {
    const mockRequest = {
      id: 'request-123',
      userId: 'user-123',
      requestType: DataSubjectRightType.ACCESS,
      status: RequestStatus.PENDING,
    } as any;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should process ACCESS request automatically', async () => {
      await service.startAutomatedRightsProcessing(
        mockRequest,
        natsClientMock as any,
      );

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'rights.request.process',
        expect.objectContaining({
          requestId: mockRequest.id,
          userId: mockRequest.userId,
          action: 'generate_export',
        }),
      );
    });

    it('should process PORTABILITY request automatically', async () => {
      const portabilityRequest = {
        ...mockRequest,
        requestType: DataSubjectRightType.PORTABILITY,
      };

      await service.startAutomatedRightsProcessing(
        portabilityRequest,
        natsClientMock as any,
      );

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'rights.request.process',
        expect.objectContaining({
          action: 'generate_portable_export',
        }),
      );
    });

    it('should process ERASURE request automatically', async () => {
      const erasureRequest = {
        ...mockRequest,
        requestType: DataSubjectRightType.ERASURE,
      };

      await service.startAutomatedRightsProcessing(
        erasureRequest,
        natsClientMock as any,
      );

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'rights.request.process',
        expect.objectContaining({
          action: 'check_erasure_eligibility',
        }),
      );
    });

    it('should queue RECTIFICATION for manual review', async () => {
      const rectificationRequest = {
        ...mockRequest,
        requestType: DataSubjectRightType.RECTIFICATION,
      };

      await service.startAutomatedRightsProcessing(
        rectificationRequest,
        natsClientMock as any,
      );

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'rights.request.manual_review',
        expect.objectContaining({
          requestId: mockRequest.id,
          userId: mockRequest.userId,
          reason: 'Rectification requires manual review',
        }),
      );
    });

    it('should queue OBJECTION for manual review', async () => {
      const objectionRequest = {
        ...mockRequest,
        requestType: DataSubjectRightType.OBJECTION,
      };

      await service.startAutomatedRightsProcessing(
        objectionRequest,
        natsClientMock as any,
      );

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'rights.request.manual_review',
        expect.objectContaining({
          reason: 'Objection requires manual review',
        }),
      );
    });

    it('should queue RESTRICT_PROCESSING for manual review', async () => {
      const restrictionRequest = {
        ...mockRequest,
        requestType: DataSubjectRightType.RESTRICT_PROCESSING,
      };

      await service.startAutomatedRightsProcessing(
        restrictionRequest,
        natsClientMock as any,
      );

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'rights.request.manual_review',
        expect.objectContaining({
          reason: 'Restriction request requires manual review',
        }),
      );
    });

    it('should handle unknown request types', async () => {
      const unknownRequest = {
        ...mockRequest,
        requestType: 'unknown_type',
      };

      await service.startAutomatedRightsProcessing(
        unknownRequest as any,
        natsClientMock as any,
      );

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'rights.request.manual_review',
        expect.objectContaining({
          reason: 'Unknown request type',
        }),
      );
    });

    it('should throw error when publish fails', async () => {
      natsClientMock.publish.mockRejectedValue(new Error('Publish error'));

      await expect(
        service.startAutomatedRightsProcessing(
          mockRequest,
          natsClientMock as any,
        ),
      ).rejects.toThrow('Publish error');
    });

    it('should handle all DataSubjectRightType values', async () => {
      const requestTypes = Object.values(DataSubjectRightType);

      for (const requestType of requestTypes) {
        jest.clearAllMocks();

        const request = {
          ...mockRequest,
          requestType,
        };

        await service.startAutomatedRightsProcessing(
          request,
          natsClientMock as any,
        );
        expect(natsClientMock.publish).toHaveBeenCalled();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle errors during createRightsRequest', async () => {
      const dto: CreateRightsRequestDto = {
        userId: 'user-123',
        requestType: DataSubjectRightType.ACCESS,
      };

      natsClientMock.publish.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        service.createRightsRequest(dto, natsClientMock as any),
      ).rejects.toThrow('Network error');
    });

    it('should handle non-Error exceptions', async () => {
      const dto: CreateRightsRequestDto = {
        userId: 'user-123',
        requestType: DataSubjectRightType.ACCESS,
      };

      natsClientMock.publish.mockRejectedValueOnce('String error');

      await expect(
        service.createRightsRequest(dto, natsClientMock as any),
      ).rejects.toThrow();
    });
  });

  describe('Request Data Validation', () => {
    it('should handle request with minimal data', async () => {
      const minimalDto: CreateRightsRequestDto = {
        userId: 'user-123',
        requestType: DataSubjectRightType.ACCESS,
      };

      const result = await service.createRightsRequest(
        minimalDto,
        natsClientMock as any,
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe(minimalDto.userId);
    });

    it('should handle request with full data', async () => {
      const fullDto: CreateRightsRequestDto = {
        userId: 'user-123',
        requestType: DataSubjectRightType.ACCESS,
        description: 'Full description',
        identityVerificationData: {
          documentType: 'passport',
          documentNumber: '123456',
        },
      };

      const result = await service.createRightsRequest(
        fullDto,
        natsClientMock as any,
      );

      expect(result).toBeDefined();
    });
  });

  describe('Timestamp Handling', () => {
    it('should include ISO timestamp in event', async () => {
      const dto: CreateRightsRequestDto = {
        userId: 'user-123',
        requestType: DataSubjectRightType.ACCESS,
      };

      await service.createRightsRequest(dto, natsClientMock as any);

      const eventData = natsClientMock.publish.mock.calls[0][1];
      expect(eventData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
