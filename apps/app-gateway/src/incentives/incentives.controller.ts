import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { IncentivesService } from './incentives.service';
import type { CreateQuestionnaireIncentiveDto } from './dto/create-questionnaire-incentive.dto';
import type { ApproveIncentiveDto } from './dto/approve-incentive.dto';

/**
 * Exposes endpoints for incentives.
 */
@Controller('incentives')
export class IncentivesController {
  constructor(private readonly incentivesService: IncentivesService) {}

  /**
   * Creates a questionnaire incentive.
   * @param body - The request payload.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Post('questionnaire')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: CreateQuestionnaireIncentiveDto) {
    const result = this.incentivesService.createQuestionnaireIncentive(body);
    return {
      incentiveId: result.incentiveId,
      rewardAmount: result.rewardAmount,
      currency: 'USD',
      status: result.status,
      canBePaid: result.status === 'approved',
      createdAt: result.createdAt,
    };
  }

  /**
   * Validates the data.
   * @param id - The id.
  * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/validate')
  @HttpCode(HttpStatus.OK)
  validate(@Param('id') id: string) {
    return { isValid: this.incentivesService.validateIncentive(id) };
  }

  /**
   * Performs the approve operation.
   * @param id - The id.
   * @param body - The body.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Put(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(@Param('id') id: string, @Body() body: ApproveIncentiveDto) {
    return this.incentivesService.approveIncentive(id, body);
  }

  /**
   * Performs the stats operation.
   * @param _timeRange - The time range.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Get('stats/overview')
  @HttpCode(HttpStatus.OK)
  stats(@Query('timeRange') _timeRange?: string) {
    const overview = this.incentivesService.getOverviewStats();
    return { overview };
  }
}
