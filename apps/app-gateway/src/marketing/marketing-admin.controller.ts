import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import type { FeedbackCodeService } from './feedback-code.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface BatchPaymentDto {
  codes: string[];
  action: 'approve' | 'reject';
  reason?: string;
}

interface PaymentExportDto {
  startDate?: string;
  endDate?: string;
  status?: 'pending' | 'paid' | 'rejected';
}

/**
 * Exposes endpoints for marketing admin.
 */
@Controller('admin/marketing')
@UseGuards(JwtAuthGuard) // 确保只有管理员可以访问
export class MarketingAdminController {
  private readonly logger = new Logger(MarketingAdminController.name);

  /**
   * Initializes a new instance of the Marketing Admin Controller.
   * @param feedbackCodeService - The feedback code service.
   */
  constructor(private readonly feedbackCodeService: FeedbackCodeService) {}

  /**
   * Retrieves dashboard stats.
   * @returns The result of the operation.
   */
  @Get('dashboard')
  async getDashboardStats() {
    try {
      const stats = await this.feedbackCodeService.getMarketingStats();

      // 计算额外的管理员统计信息
      const dashboardData = {
        overview: {
          totalCodes: stats.totalCodes,
          usedCodes: stats.usedCodes,
          pendingPayments: stats.pendingPayments,
          totalPaid: stats.totalPaid,
          averageQualityScore: Number(stats.averageQualityScore.toFixed(2)),
        },
        conversion: {
          usageRate:
            stats.totalCodes > 0
              ? Number(((stats.usedCodes / stats.totalCodes) * 100).toFixed(1))
              : 0,
          qualityRate:
            stats.usedCodes > 0
              ? Number(
                  ((stats.pendingPayments / stats.usedCodes) * 100).toFixed(1),
                )
              : 0,
        },
        financial: {
          pendingAmount: stats.pendingPayments * 3,
          averageReward: 3.0,
          costPerUser:
            stats.usedCodes > 0
              ? Number((stats.totalPaid / stats.usedCodes).toFixed(2))
              : 0,
        },
        lastUpdated: new Date().toISOString(),
      };

      return dashboardData;
    } catch (error) {
      this.logger.error('获取管理员Dashboard数据失败', error);
      throw error;
    }
  }

  /**
   * Retrieves pending payments.
   * @param page - The page.
   * @param limit - The limit.
   * @param sortBy - The sort by.
   * @param sortOrder - The sort order.
   * @returns The result of the operation.
   */
  @Get('pending-payments')
  async getPendingPayments(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('sortBy') sortBy = 'usedAt',
    @Query('sortOrder') sortOrder = 'desc',
  ) {
    try {
      const pendingPayments =
        await this.feedbackCodeService.getPendingPayments();

      // 简单的分页和排序
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // 排序
      const sorted = pendingPayments.sort((a, b) => {
        const aValue = a[sortBy as keyof typeof a];
        const bValue = b[sortBy as keyof typeof b];

        if (sortOrder === 'desc') {
          return aValue > bValue ? -1 : 1;
        } else {
          return aValue < bValue ? -1 : 1;
        }
      });

      const paginatedData = sorted.slice(skip, skip + limitNum);

      return {
        data: paginatedData,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: pendingPayments.length,
          totalPages: Math.ceil(pendingPayments.length / limitNum),
        },
      };
    } catch (error) {
      this.logger.error('获取待支付列表失败', error);
      throw error;
    }
  }

  /**
   * Performs the process batch payment operation.
   * @param batchDto - The batch dto.
   * @returns The result of the operation.
   */
  @Post('batch-payment')
  @HttpCode(HttpStatus.OK)
  async processBatchPayment(@Body() batchDto: BatchPaymentDto) {
    try {
      if (!batchDto.codes || batchDto.codes.length === 0) {
        throw new BadRequestException('反馈码列表不能为空');
      }

      if (!['approve', 'reject'].includes(batchDto.action)) {
        throw new BadRequestException('操作类型无效');
      }

      const status = batchDto.action === 'approve' ? 'paid' : 'rejected';
      const modifiedCount =
        await this.feedbackCodeService.batchUpdatePaymentStatus(
          batchDto.codes,
          status,
          batchDto.reason,
        );

      this.logger.log(
        `批量处理支付: ${batchDto.action}, 影响条数: ${modifiedCount}`,
      );

      return {
        success: true,
        processedCount: modifiedCount,
        action: batchDto.action,
        codes: batchDto.codes,
      };
    } catch (error) {
      this.logger.error('批量处理支付失败', error);
      throw error;
    }
  }

  /**
   * Performs the process single payment operation.
   * @param code - The code.
   * @param action - The action.
   * @param reason - The reason.
   * @returns The result of the operation.
   */
  @Post('payment/:code/:action')
  @HttpCode(HttpStatus.OK)
  async processSinglePayment(
    @Param('code') code: string,
    @Param('action') action: string,
    @Body('reason') reason?: string,
  ) {
    try {
      if (!['approve', 'reject'].includes(action)) {
        throw new BadRequestException('操作类型无效');
      }

      const status = action === 'approve' ? 'paid' : 'rejected';
      const result = await this.feedbackCodeService.updatePaymentStatus(
        code,
        status,
        reason,
      );

      this.logger.log(`单个处理支付: ${code} -> ${action}`);

      return {
        success: true,
        data: result,
        action: action,
      };
    } catch (error) {
      this.logger.error(`处理单个支付失败: ${code}`, error);
      throw error;
    }
  }

  /**
   * Performs the export payment data operation.
   * @param exportDto - The export dto.
   * @returns The result of the operation.
   */
  @Get('export/payments')
  async exportPaymentData(@Query() exportDto: PaymentExportDto) {
    try {
      // 这里可以根据条件导出支付数据
      // 实际实现中可能需要生成Excel文件
      const stats = await this.feedbackCodeService.getMarketingStats();

      const exportData = {
        exportTime: new Date().toISOString(),
        criteria: exportDto,
        summary: {
          totalRecords: stats.usedCodes,
          pendingAmount: stats.pendingPayments * 3,
          paidAmount: stats.totalPaid,
        },
        downloadUrl: `/api/admin/marketing/download/payments-${Date.now()}.xlsx`,
      };

      this.logger.log('生成支付数据导出');

      return exportData;
    } catch (error) {
      this.logger.error('导出支付数据失败', error);
      throw error;
    }
  }

  /**
   * Retrieves analytics trends.
   * @param days - The days.
   * @returns The result of the operation.
   */
  @Get('analytics/trends')
  async getAnalyticsTrends(@Query('days') days = '30') {
    try {
      const daysNum = parseInt(days);

      // 模拟趋势数据（实际实现中需要从数据库聚合）
      const trendsData = {
        period: `${daysNum}天`,
        dailyStats: [], // 每日统计数据
        qualityDistribution: {
          score1: 5,
          score2: 8,
          score3: 15,
          score4: 25,
          score5: 47,
        },
        paymentFlow: {
          pending: 12,
          approved: 85,
          rejected: 3,
        },
        userBehavior: {
          averageCompletionTime: '8分钟',
          dropoffRate: '15%',
          satisfactionScore: 4.2,
        },
      };

      return trendsData;
    } catch (error) {
      this.logger.error('获取分析趋势失败', error);
      throw error;
    }
  }

  /**
   * Performs the perform maintenance operation.
   * @param days - The days.
   * @returns The result of the operation.
   */
  @Post('maintenance/cleanup')
  @HttpCode(HttpStatus.OK)
  async performMaintenance(@Body('days') days = 30) {
    try {
      const deletedCount =
        await this.feedbackCodeService.cleanupExpiredCodes(days);

      this.logger.log(`维护清理完成，删除 ${deletedCount} 条过期记录`);

      return {
        success: true,
        deletedCount: deletedCount,
        cleanupDate: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('维护清理失败', error);
      throw error;
    }
  }

  /**
   * Retrieves audit logs.
   * @param page - The page.
   * @param limit - The limit.
   * @returns The result of the operation.
   */
  @Get('audit/logs')
  async getAuditLogs(
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    const pageNum = page || '1';
    const limitNum = limit || '50';
    try {
      // 模拟审计日志数据（实际实现中需要专门的审计日志系统）
      const auditLogs = [
        {
          id: '1',
          action: 'PAYMENT_APPROVED',
          feedbackCode: 'FB123456',
          userId: 'admin',
          timestamp: new Date().toISOString(),
          details: { amount: 3, reason: '高质量反馈' },
        },
        // 更多日志...
      ];

      return {
        data: auditLogs,
        pagination: {
          page: parseInt(pageNum),
          limit: parseInt(limitNum),
          total: auditLogs.length,
        },
      };
    } catch (error) {
      this.logger.error('获取审计日志失败', error);
      throw error;
    }
  }
}
