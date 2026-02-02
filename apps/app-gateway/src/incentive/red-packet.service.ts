import { Injectable, Logger } from '@nestjs/common';

interface RedPacketConfig {
  baseAmount: 5; // 基础问卷红包5元
  qualityBonus: 3; // 高质量反馈奖励3元
  referralReward: 2; // 推荐奖励2元
  dailyBudget: 200; // 每日预算上限200元
  maxPerUser: 1; // 每用户每日最多1次
}

interface RedPacketRecord {
  id: string;
  userId?: string;
  ip: string;
  type: 'questionnaire' | 'quality_bonus' | 'referral';
  amount: number;
  status: 'pending' | 'sent' | 'failed';
  paymentMethod: 'wechat' | 'alipay';
  contactInfo: string; // 微信号或支付宝账号
  questionnaireId?: string;
  createdAt: Date;
  sentAt?: Date;
  failureReason?: string;
}

/**
 * Provides red packet functionality.
 */
@Injectable()
export class RedPacketService {
  private readonly logger = new Logger(RedPacketService.name);
  private readonly config: RedPacketConfig = {
    baseAmount: 5,
    qualityBonus: 3,
    referralReward: 2,
    dailyBudget: 200,
    maxPerUser: 1,
  };

  // 问卷完成红包发放
  /**
   * Performs the process questionnaire reward operation.
   * @param data - The data.
   * @returns The Promise<{ success: boolean; amount: number; message: string; redPacketId?: string; error?: string; }>.
   */
  public async processQuestionnaireReward(data: {
    ip: string;
    questionnaireId: string;
    userContact: {
      type: 'wechat' | 'alipay';
      account: string;
    };
    feedbackQuality?: 'basic' | 'detailed'; // 根据反馈长度判定
  }): Promise<{
    success: boolean;
    amount: number;
    message: string;
    redPacketId?: string;
    error?: string;
  }> {
    try {
      // 检查用户今日是否已获得红包
      const todayReceived = await this.checkDailyLimit(data.ip);
      if (todayReceived >= this.config.maxPerUser) {
        return {
          success: false,
          amount: 0,
          message: '您今天已经获得过问卷红包了',
          error: 'DAILY_LIMIT_EXCEEDED',
        };
      }

      // 检查今日预算
      const todaySpent = await this.getTodaySpending();
      let rewardAmount = this.config.baseAmount;

      // 高质量反馈额外奖励
      if (data.feedbackQuality === 'detailed') {
        rewardAmount += this.config.qualityBonus;
      }

      if (todaySpent + rewardAmount > this.config.dailyBudget) {
        return {
          success: false,
          amount: 0,
          message: '今日红包预算已用完，明天再来试试吧',
          error: 'DAILY_BUDGET_EXCEEDED',
        };
      }

      // 创建红包记录
      const redPacket: RedPacketRecord = {
        id: this.generateRedPacketId(),
        ip: data.ip,
        type: 'questionnaire',
        amount: rewardAmount,
        status: 'pending',
        paymentMethod: data.userContact.type,
        contactInfo: data.userContact.account,
        questionnaireId: data.questionnaireId,
        createdAt: new Date(),
      };

      // 保存红包记录
      await this.saveRedPacketRecord(redPacket);

      // 发送红包
      const sendResult = await this.sendRedPacket(redPacket);

      if (sendResult.success) {
        await this.updateRedPacketStatus(redPacket.id, 'sent', new Date());

        return {
          success: true,
          amount: rewardAmount,
          message: `感谢您的反馈！${rewardAmount}元红包已发送到您的${data.userContact.type === 'wechat' ? '微信' : '支付宝'}`,
          redPacketId: redPacket.id,
        };
      } else {
        await this.updateRedPacketStatus(
          redPacket.id,
          'failed',
          undefined,
          sendResult.error,
        );

        return {
          success: false,
          amount: 0,
          message: '红包发送失败，请联系客服处理',
          error: 'SEND_FAILED',
        };
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        'Red packet processing error',
        err.stack ?? err.message,
      );
      return {
        success: false,
        amount: 0,
        message: '系统错误，请稍后重试',
        error: 'SYSTEM_ERROR',
      };
    }
  }

  // 推荐奖励红包
  /**
   * Performs the process referral reward operation.
   * @param data - The data.
   * @returns The Promise<{ success: boolean; rewards: { referrer: { amount: number; sent: boolean }; referee: { amount: number; sent: boolean }; }; message: string; }>.
   */
  public async processReferralReward(data: {
    referrerIP: string;
    refereeIP: string;
    refereeQuestionnaireId: string;
    contacts: {
      referrer: { type: 'wechat' | 'alipay'; account: string };
      referee: { type: 'wechat' | 'alipay'; account: string };
    };
  }): Promise<{
    success: boolean;
    rewards: {
      referrer: { amount: number; sent: boolean };
      referee: { amount: number; sent: boolean };
    };
    message: string;
  }> {
    try {
      const rewardAmount = this.config.referralReward;
      const totalAmount = rewardAmount * 2;

      // 检查预算
      const todaySpent = await this.getTodaySpending();
      if (todaySpent + totalAmount > this.config.dailyBudget) {
        return {
          success: false,
          rewards: {
            referrer: { amount: 0, sent: false },
            referee: { amount: 0, sent: false },
          },
          message: '今日红包预算已用完',
        };
      }

      // 为推荐人和被推荐人各发红包
      const referrerPacket = await this.createAndSendRedPacket({
        ip: data.referrerIP,
        type: 'referral',
        amount: rewardAmount,
        paymentMethod: data.contacts.referrer.type,
        contactInfo: data.contacts.referrer.account,
      });

      const refereePacket = await this.createAndSendRedPacket({
        ip: data.refereeIP,
        type: 'referral',
        amount: rewardAmount,
        paymentMethod: data.contacts.referee.type,
        contactInfo: data.contacts.referee.account,
      });

      return {
        success: referrerPacket.success && refereePacket.success,
        rewards: {
          referrer: { amount: rewardAmount, sent: referrerPacket.success },
          referee: { amount: rewardAmount, sent: refereePacket.success },
        },
        message:
          referrerPacket.success && refereePacket.success
            ? `推荐成功！双方各获得${rewardAmount}元奖励`
            : '推荐奖励发送部分失败，请联系客服',
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error('Referral reward error', err.stack ?? err.message);
      return {
        success: false,
        rewards: {
          referrer: { amount: 0, sent: false },
          referee: { amount: 0, sent: false },
        },
        message: '推荐奖励发送失败',
      };
    }
  }

  // 获取红包统计数据
  /**
   * Retrieves red packet stats.
   * @param date - The date.
   * @returns The Promise<{ date: string; totalSent: number; totalAmount: number; successRate: number; breakdown: { questionnaire: { count: number; amount: number }; qualityBonus: { count: number; amount: number }; referral: { count: number; amount: number }; }; budgetUsage: { used: number; remaining: number; percentage: number; }; }>.
   */
  public async getRedPacketStats(date?: string): Promise<{
    date: string;
    totalSent: number;
    totalAmount: number;
    successRate: number;
    breakdown: {
      questionnaire: { count: number; amount: number };
      qualityBonus: { count: number; amount: number };
      referral: { count: number; amount: number };
    };
    budgetUsage: {
      used: number;
      remaining: number;
      percentage: number;
    };
  }> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      // 从数据库获取统计数据
      const records = await this.getRedPacketRecordsByDate(targetDate);

      const totalSent = records.filter((r) => r.status === 'sent').length;
      const totalAmount = records
        .filter((r) => r.status === 'sent')
        .reduce((sum, r) => sum + r.amount, 0);

      const successRate =
        records.length > 0 ? (totalSent / records.length) * 100 : 0;

      const breakdown = {
        questionnaire: {
          count: records.filter(
            (r) => r.type === 'questionnaire' && r.status === 'sent',
          ).length,
          amount: records
            .filter((r) => r.type === 'questionnaire' && r.status === 'sent')
            .reduce((sum, r) => sum + r.amount, 0),
        },
        qualityBonus: {
          count: records.filter(
            (r) => r.amount > this.config.baseAmount && r.status === 'sent',
          ).length,
          amount: records
            .filter(
              (r) => r.amount > this.config.baseAmount && r.status === 'sent',
            )
            .reduce((sum, r) => sum + (r.amount - this.config.baseAmount), 0),
        },
        referral: {
          count: records.filter(
            (r) => r.type === 'referral' && r.status === 'sent',
          ).length,
          amount: records
            .filter((r) => r.type === 'referral' && r.status === 'sent')
            .reduce((sum, r) => sum + r.amount, 0),
        },
      };

      const budgetUsage = {
        used: totalAmount,
        remaining: this.config.dailyBudget - totalAmount,
        percentage: (totalAmount / this.config.dailyBudget) * 100,
      };

      return {
        date: targetDate,
        totalSent,
        totalAmount,
        successRate: Math.round(successRate),
        breakdown,
        budgetUsage,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        'Get red packet stats error',
        err.stack ?? err.message,
      );
      return {
        date: targetDate,
        totalSent: 0,
        totalAmount: 0,
        successRate: 0,
        breakdown: {
          questionnaire: { count: 0, amount: 0 },
          qualityBonus: { count: 0, amount: 0 },
          referral: { count: 0, amount: 0 },
        },
        budgetUsage: {
          used: 0,
          remaining: this.config.dailyBudget,
          percentage: 0,
        },
      };
    }
  }

  // 模拟红包发送（实际需要接入微信/支付宝API）
  private async sendRedPacket(redPacket: RedPacketRecord): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
  }> {
    // 这里应该接入真实的红包API
    // 目前返回模拟结果

    try {
      if (redPacket.paymentMethod === 'wechat') {
        // 模拟微信红包发送
        return await this.sendWeChatRedPacket(redPacket);
      } else {
        // 模拟支付宝红包发送
        return await this.sendAlipayRedPacket(redPacket);
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message || 'SEND_FAILED',
      };
    }
  }

  private async sendWeChatRedPacket(_redPacket: RedPacketRecord): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
  }> {
    // TODO: 接入微信红包API
    // 这里是模拟实现
    return new Promise((resolve) => {
      setTimeout(() => {
        // 90%成功率的模拟
        const success = Math.random() > 0.1;
        resolve({
          success,
          transactionId: success
            ? `wx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            : undefined,
          error: success ? undefined : 'WECHAT_API_ERROR',
        });
      }, 1000);
    });
  }

  private async sendAlipayRedPacket(_redPacket: RedPacketRecord): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
  }> {
    // TODO: 接入支付宝红包API
    // 这里是模拟实现
    return new Promise((resolve) => {
      setTimeout(() => {
        // 90%成功率的模拟
        const success = Math.random() > 0.1;
        resolve({
          success,
          transactionId: success
            ? `alipay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            : undefined,
          error: success ? undefined : 'ALIPAY_API_ERROR',
        });
      }, 1000);
    });
  }

  // 辅助方法
  private generateRedPacketId(): string {
    return `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async checkDailyLimit(_ip: string): Promise<number> {
    // TODO: 从数据库查询今日该IP已获得的红包数量
    return 0;
  }

  private async getTodaySpending(): Promise<number> {
    // TODO: 从数据库查询今日已发放红包总金额
    return 0;
  }

  private async saveRedPacketRecord(redPacket: RedPacketRecord): Promise<void> {
    // TODO: 保存到数据库
    this.logger.log('Saving red packet record', { redPacket });
  }

  private async updateRedPacketStatus(
    id: string,
    status: 'sent' | 'failed',
    sentAt?: Date,
    failureReason?: string,
  ): Promise<void> {
    // TODO: 更新数据库记录状态
    this.logger.log('Updating red packet status', {
      id,
      status,
      sentAt,
      failureReason,
    });
  }

  private async createAndSendRedPacket(data: {
    ip: string;
    type: 'referral';
    amount: number;
    paymentMethod: 'wechat' | 'alipay';
    contactInfo: string;
  }): Promise<{ success: boolean }> {
    const redPacket: RedPacketRecord = {
      id: this.generateRedPacketId(),
      ip: data.ip,
      type: data.type,
      amount: data.amount,
      status: 'pending',
      paymentMethod: data.paymentMethod,
      contactInfo: data.contactInfo,
      createdAt: new Date(),
    };

    await this.saveRedPacketRecord(redPacket);
    const sendResult = await this.sendRedPacket(redPacket);

    if (sendResult.success) {
      await this.updateRedPacketStatus(redPacket.id, 'sent', new Date());
    } else {
      await this.updateRedPacketStatus(
        redPacket.id,
        'failed',
        undefined,
        sendResult.error,
      );
    }

    return { success: sendResult.success };
  }

  private async getRedPacketRecordsByDate(
    _date: string,
  ): Promise<RedPacketRecord[]> {
    // TODO: 从数据库获取指定日期的红包记录
    return [];
  }
}
