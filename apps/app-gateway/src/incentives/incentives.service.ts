import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { CreateQuestionnaireIncentiveDto } from './dto/create-questionnaire-incentive.dto';
import type { ApproveIncentiveDto } from './dto/approve-incentive.dto';

type IncentiveStatus = 'pending' | 'approved';

interface IncentiveRecord {
  id: string;
  amount: number;
  status: IncentiveStatus;
  questionnaireId?: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

interface IncentiveSummary {
  incentiveId: string;
  rewardAmount: number;
  status: IncentiveStatus;
  createdAt: string;
  updatedAt?: string;
}

interface IncentiveApprovalResult {
  approvalStatus: IncentiveStatus;
  approvedAt: string;
}

interface IncentiveStatsOverview {
  totalRewards: number;
  totalIncentives: number;
  approved: number;
  pending: number;
}

function generateIncentiveId(): string {
  return `inc-${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

@Injectable()
export class IncentivesService {
  private readonly logger = new Logger(IncentivesService.name);
  private readonly incentives = new Map<string, IncentiveRecord>();

  createQuestionnaireIncentive(
    dto: CreateQuestionnaireIncentiveDto,
  ): IncentiveSummary {
    const incentiveId = generateIncentiveId();
    const amount = Math.max(1, Math.round((dto.qualityScore ?? 80) / 10));
    const now = new Date().toISOString();

    this.incentives.set(incentiveId, {
      id: incentiveId,
      amount,
      status: 'pending',
      questionnaireId: dto.questionnaireId,
      createdAt: now,
      metadata: dto.metadata,
    });

    this.logger.debug(`Created incentive ${incentiveId}`, {
      questionnaireId: dto.questionnaireId,
      amount,
    });

    return {
      incentiveId,
      rewardAmount: amount,
      status: 'pending',
      createdAt: now,
    };
  }

  validateIncentive(incentiveId: string): boolean {
    return this.incentives.has(incentiveId);
  }

  approveIncentive(
    incentiveId: string,
    _dto: ApproveIncentiveDto,
  ): IncentiveApprovalResult {
    const record =
      this.incentives.get(incentiveId) ??
      this.createPlaceholderIncentive(incentiveId);

    record.status = 'approved';
    record.updatedAt = new Date().toISOString();
    this.incentives.set(incentiveId, record);

    this.logger.debug(`Approved incentive ${incentiveId}`, {
      status: record.status,
    });

    return {
      approvalStatus: record.status,
      approvedAt: record.updatedAt,
    };
  }

  getOverviewStats(): IncentiveStatsOverview {
    let totalRewards = 0;
    let approved = 0;
    let pending = 0;

    for (const incentive of this.incentives.values()) {
      totalRewards += incentive.amount;
      if (incentive.status === 'approved') {
        approved += 1;
      } else {
        pending += 1;
      }
    }

    return {
      totalRewards,
      totalIncentives: this.incentives.size,
      approved,
      pending,
    };
  }

  private createPlaceholderIncentive(id: string): IncentiveRecord {
    const now = new Date().toISOString();
    const placeholder: IncentiveRecord = {
      id,
      amount: 1,
      status: 'pending',
      createdAt: now,
    };
    this.incentives.set(id, placeholder);
    return placeholder;
  }
}
