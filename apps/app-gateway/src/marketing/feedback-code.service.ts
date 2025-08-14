import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FeedbackCodeDto, CreateFeedbackCodeDto, MarkFeedbackCodeUsedDto, MarketingStatsDto } from '@app/shared-dtos';

export interface FeedbackCodeDocument {
  _id?: string;
  code: string;
  generatedAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  alipayAccount?: string;
  questionnaireData?: any;
  paymentStatus: 'pending' | 'paid' | 'rejected';
  qualityScore?: number;
  paymentAmount?: number;
  createdBy?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

@Injectable()
export class FeedbackCodeService {
  private readonly logger = new Logger(FeedbackCodeService.name);

  constructor(
    @InjectModel('FeedbackCode') 
    private readonly feedbackCodeModel: Model<FeedbackCodeDocument>
  ) {}

  async recordFeedbackCode(createDto: CreateFeedbackCodeDto, metadata?: any): Promise<FeedbackCodeDto> {
    try {
      // 检查反馈码是否已存在
      const existing = await this.feedbackCodeModel.findOne({ code: createDto.code });
      if (existing) {
        this.logger.warn(`反馈码已存在: ${createDto.code}`);
        return this.toDto(existing);
      }

      const feedbackCode = new this.feedbackCodeModel({
        code: createDto.code,
        generatedAt: new Date(),
        isUsed: false,
        paymentStatus: 'pending',
        paymentAmount: 3.00,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        sessionId: metadata?.sessionId
      });

      const saved = await feedbackCode.save();
      this.logger.log(`反馈码已记录: ${createDto.code}`);
      
      return this.toDto(saved);
    } catch (error) {
      this.logger.error(`记录反馈码失败: ${createDto.code}`, error);
      throw error;
    }
  }

  async validateFeedbackCode(code: string): Promise<boolean> {
    try {
      const record = await this.feedbackCodeModel.findOne({ code });
      const isValid = !!record && !record.isUsed;
      
      this.logger.log(`反馈码验证: ${code} - ${isValid ? '有效' : '无效'}`);
      return isValid;
    } catch (error) {
      this.logger.error(`验证反馈码失败: ${code}`, error);
      return false;
    }
  }

  /**
   * 获取反馈码详细信息（包括是否已核销）
   */
  async getFeedbackCodeDetails(code: string): Promise<{
    valid: boolean;
    isUsed: boolean;
    usedAt?: Date;
    paymentStatus?: string;
    qualityScore?: number;
  }> {
    try {
      const record = await this.feedbackCodeModel.findOne({ code });
      
      if (!record) {
        return {
          valid: false,
          isUsed: false
        };
      }
      
      return {
        valid: true,
        isUsed: record.isUsed || false,
        usedAt: record.usedAt,
        paymentStatus: record.paymentStatus,
        qualityScore: record.qualityScore
      };
    } catch (error) {
      this.logger.error(`获取反馈码详情失败: ${code}`, error);
      return {
        valid: false,
        isUsed: false
      };
    }
  }

  async markAsUsed(markUsedDto: MarkFeedbackCodeUsedDto): Promise<FeedbackCodeDto> {
    try {
      const { code, alipayAccount, questionnaireData } = markUsedDto;
      
      // 计算反馈质量评分
      const qualityScore = this.assessFeedbackQuality(questionnaireData);
      
      const updated = await this.feedbackCodeModel.findOneAndUpdate(
        { code, isUsed: false },
        {
          isUsed: true,
          usedAt: new Date(),
          alipayAccount,
          questionnaireData,
          qualityScore,
          paymentStatus: qualityScore >= 3 ? 'pending' : 'rejected'
        },
        { new: true }
      );

      if (!updated) {
        throw new Error(`反馈码无效或已使用: ${code}`);
      }

      this.logger.log(`反馈码已标记为使用: ${code}, 质量评分: ${qualityScore}`);
      return this.toDto(updated);
    } catch (error) {
      this.logger.error(`标记反馈码使用失败: ${markUsedDto.code}`, error);
      throw error;
    }
  }

  async getPendingPayments(): Promise<FeedbackCodeDto[]> {
    try {
      const pendingCodes = await this.feedbackCodeModel
        .find({ 
          isUsed: true, 
          paymentStatus: 'pending',
          qualityScore: { $gte: 3 }
        })
        .sort({ usedAt: -1 })
        .lean();

      return pendingCodes.map(code => this.toDto(code));
    } catch (error) {
      this.logger.error('获取待支付列表失败', error);
      throw error;
    }
  }

  async updatePaymentStatus(code: string, status: 'paid' | 'rejected', reason?: string): Promise<FeedbackCodeDto> {
    try {
      const updated = await this.feedbackCodeModel.findOneAndUpdate(
        { code },
        { 
          paymentStatus: status,
          paymentProcessedAt: new Date(),
          paymentNote: reason
        },
        { new: true }
      );

      if (!updated) {
        throw new Error(`反馈码不存在: ${code}`);
      }

      this.logger.log(`支付状态已更新: ${code} -> ${status}`);
      return this.toDto(updated);
    } catch (error) {
      this.logger.error(`更新支付状态失败: ${code}`, error);
      throw error;
    }
  }

  async getMarketingStats(): Promise<MarketingStatsDto> {
    try {
      const [
        totalCodes,
        usedCodes, 
        pendingPayments,
        paidCodes,
        avgQualityResult
      ] = await Promise.all([
        this.feedbackCodeModel.countDocuments(),
        this.feedbackCodeModel.countDocuments({ isUsed: true }),
        this.feedbackCodeModel.countDocuments({ paymentStatus: 'pending' }),
        this.feedbackCodeModel.countDocuments({ paymentStatus: 'paid' }),
        this.feedbackCodeModel.aggregate([
          { $match: { qualityScore: { $exists: true } } },
          { $group: { _id: null, avgScore: { $avg: '$qualityScore' } } }
        ])
      ]);

      const totalPaid = await this.feedbackCodeModel.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$paymentAmount' } } }
      ]);

      return {
        totalCodes,
        usedCodes,
        pendingPayments,
        totalPaid: totalPaid[0]?.total || 0,
        averageQualityScore: avgQualityResult[0]?.avgScore || 0
      };
    } catch (error) {
      this.logger.error('获取营销统计失败', error);
      throw error;
    }
  }

  private assessFeedbackQuality(questionnaireData: any): number {
    if (!questionnaireData) return 0;
    
    let score = 1; // 基础分
    
    // 检查文本字段长度和质量
    const textFields = [
      questionnaireData.problems,
      questionnaireData.favorite_features,
      questionnaireData.improvements,
      questionnaireData.additional_features
    ].filter(field => field && typeof field === 'string');
    
    // 每个有效的文本字段加分
    textFields.forEach(text => {
      if (text.length > 10) {
        score += 1;
      }
    });
    
    // 检查建设性意见
    const fullText = textFields.join(' ').toLowerCase();
    const constructiveWords = ['建议', '希望', '应该', '可以', '改进', '优化', '增加', '需要'];
    if (constructiveWords.some(word => fullText.includes(word))) {
      score += 1;
    }
    
    // 评分范围限制在1-5
    return Math.min(Math.max(score, 1), 5);
  }

  private toDto(document: FeedbackCodeDocument): FeedbackCodeDto {
    return {
      id: document._id?.toString(),
      code: document.code,
      generatedAt: document.generatedAt,
      isUsed: document.isUsed,
      usedAt: document.usedAt,
      alipayAccount: document.alipayAccount,
      questionnaireData: document.questionnaireData,
      paymentStatus: document.paymentStatus,
      qualityScore: document.qualityScore,
      paymentAmount: document.paymentAmount,
      createdBy: document.createdBy
    };
  }

  // 管理员功能：批量处理支付
  async batchUpdatePaymentStatus(codes: string[], status: 'paid' | 'rejected', reason?: string): Promise<number> {
    try {
      const result = await this.feedbackCodeModel.updateMany(
        { code: { $in: codes } },
        { 
          paymentStatus: status,
          paymentProcessedAt: new Date(),
          paymentNote: reason
        }
      );

      this.logger.log(`批量更新支付状态: ${result.modifiedCount} 条记录`);
      return result.modifiedCount;
    } catch (error) {
      this.logger.error('批量更新支付状态失败', error);
      throw error;
    }
  }

  // 标记反馈码已使用
  async markFeedbackCodeAsUsed(markUsedDto: MarkFeedbackCodeUsedDto): Promise<FeedbackCodeDto> {
    try {
      const updated = await this.feedbackCodeModel.findOneAndUpdate(
        { code: markUsedDto.code, isUsed: false },
        { 
          isUsed: true,
          usedAt: new Date(),
          alipayAccount: markUsedDto.alipayAccount,
          questionnaireData: markUsedDto.questionnaireData,
          qualityScore: markUsedDto.questionnaireData ? this.assessFeedbackQuality(markUsedDto.questionnaireData) : undefined
        },
        { new: true }
      );

      if (!updated) {
        throw new Error(`反馈码不存在或已被使用: ${markUsedDto.code}`);
      }

      this.logger.log(`反馈码已标记使用: ${markUsedDto.code}`);
      return this.toDto(updated);
    } catch (error) {
      this.logger.error(`标记反馈码失败: ${markUsedDto.code}`, error);
      throw error;
    }
  }

  // 数据清理：删除过期的未使用反馈码
  async cleanupExpiredCodes(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.feedbackCodeModel.deleteMany({
        isUsed: false,
        generatedAt: { $lt: cutoffDate }
      });

      this.logger.log(`清理过期反馈码: ${result.deletedCount} 条记录`);
      return result.deletedCount;
    } catch (error) {
      this.logger.error('清理过期反馈码失败', error);
      throw error;
    }
  }
}