import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Param, 
  Req, 
  HttpCode, 
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Logger 
} from '@nestjs/common';
import { Request } from 'express';
import { FeedbackCodeService } from './feedback-code.service';
import { CreateFeedbackCodeDto, MarkFeedbackCodeUsedDto } from '@app/shared-dtos';

@Controller('api/marketing/feedback-codes')
export class FeedbackCodeController {
  private readonly logger = new Logger(FeedbackCodeController.name);

  constructor(private readonly feedbackCodeService: FeedbackCodeService) {}

  @Post('record')
  @HttpCode(HttpStatus.CREATED)
  async recordFeedbackCode(
    @Body() createDto: CreateFeedbackCodeDto,
    @Req() request: Request
  ) {
    try {
      if (!createDto.code || createDto.code.length < 5) {
        throw new BadRequestException('反馈码格式无效');
      }

      // 提取请求元数据
      const metadata = {
        ipAddress: this.getClientIp(request),
        userAgent: request.get('User-Agent'),
        sessionId: this.extractSessionId(createDto.code)
      };

      const result = await this.feedbackCodeService.recordFeedbackCode(createDto, metadata);
      
      this.logger.log(`反馈码记录成功: ${createDto.code}`);
      
      return {
        success: true,
        data: {
          id: result.id,
          code: result.code,
          generatedAt: result.generatedAt
        }
      };
    } catch (error) {
      this.logger.error(`记录反馈码失败: ${createDto.code}`, error);
      throw error;
    }
  }

  @Get('validate/:code')
  async validateFeedbackCode(@Param('code') code: string) {
    try {
      if (!code || code.length < 5) {
        throw new BadRequestException('反馈码格式无效');
      }

      const result = await this.feedbackCodeService.getFeedbackCodeDetails(code);
      
      return {
        success: true,
        data: {
          valid: result.valid,
          isRedeemed: result.isUsed || false,
          code: code,
          redeemedAt: result.usedAt,
          status: result.isUsed ? 'redeemed' : (result.valid ? 'active' : 'invalid')
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`验证反馈码失败: ${code}`, error);
      return {
        success: false,
        data: {
          valid: false,
          isRedeemed: false,
          code: code,
          status: 'invalid'
        },
        error: error.message
      };
    }
  }

  @Post('mark-used')
  @HttpCode(HttpStatus.OK)
  async markFeedbackCodeAsUsed(@Body() markUsedDto: MarkFeedbackCodeUsedDto) {
    try {
      // 验证输入数据
      if (!markUsedDto.code || !markUsedDto.alipayAccount) {
        throw new BadRequestException('反馈码和支付宝账号不能为空');
      }

      // 验证支付宝账号格式（简单验证）
      if (!this.isValidAlipayAccount(markUsedDto.alipayAccount)) {
        throw new BadRequestException('支付宝账号格式不正确');
      }

      const result = await this.feedbackCodeService.markFeedbackCodeAsUsed(markUsedDto);
      
      this.logger.log(`反馈码使用标记成功: ${markUsedDto.code}`);
      
      return {
        success: true,
        data: {
          code: result.code,
          qualityScore: result.qualityScore,
          paymentStatus: result.paymentStatus,
          eligible: result.qualityScore >= 3
        }
      };
    } catch (error) {
      this.logger.error(`标记反馈码使用失败: ${markUsedDto.code}`, error);
      
      if (error.message.includes('无效或已使用')) {
        throw new NotFoundException('反馈码无效或已使用');
      }
      
      throw error;
    }
  }

  @Get('stats')
  async getPublicStats() {
    try {
      const stats = await this.feedbackCodeService.getMarketingStats();
      
      // 只返回公开的统计信息
      return {
        totalParticipants: stats.usedCodes,
        totalRewards: Math.floor(stats.totalPaid), // 隐藏具体金额
        averageRating: Number(stats.averageQualityScore.toFixed(1)),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('获取公开统计失败', error);
      throw error;
    }
  }

  @Post('webhook/questionnaire')
  @HttpCode(HttpStatus.OK)
  async handleQuestionnaireWebhook(@Body() webhookData: any) {
    try {
      // 处理腾讯问卷的webhook数据
      this.logger.log('收到问卷webhook数据', webhookData);
      
      // 提取反馈码和问卷数据
      const feedbackCode = webhookData.answers?.feedback_code || webhookData.code;
      const alipayAccount = webhookData.answers?.alipay_account;
      
      if (feedbackCode && alipayAccount) {
        const markUsedDto: MarkFeedbackCodeUsedDto = {
          code: feedbackCode,
          alipayAccount: alipayAccount,
          questionnaireData: webhookData.answers
        };
        
        await this.feedbackCodeService.markFeedbackCodeAsUsed(markUsedDto);
        this.logger.log(`Webhook处理成功: ${feedbackCode}`);
      }
      
      return { success: true };
    } catch (error) {
      this.logger.error('处理问卷webhook失败', error);
      return { success: false, error: error.message };
    }
  }

  // 辅助方法
  private getClientIp(request: Request): string {
    return (
      request.get('X-Forwarded-For') ||
      request.get('X-Real-IP') ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  private extractSessionId(code: string): string {
    // 从反馈码中提取会话ID（最后4位）
    return code.length >= 4 ? code.slice(-4) : 'unknown';
  }

  private isValidAlipayAccount(account: string): boolean {
    // 简单的支付宝账号验证：邮箱或手机号
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^1[3-9]\d{9}$/;
    
    return emailRegex.test(account) || phoneRegex.test(account);
  }
}
