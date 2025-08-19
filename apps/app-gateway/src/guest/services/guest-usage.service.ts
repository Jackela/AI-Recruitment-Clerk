import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { GuestUsage, GuestUsageDocument } from '../schemas/guest-usage.schema';
import { GuestUsageEntity } from '../entities/guest-usage.entity';
import { GuestUsageResponseDto, GuestStatusDto } from '../dto/guest.dto';

@Injectable()
export class GuestUsageService {
  private readonly logger = new Logger(GuestUsageService.name);
  private readonly MAX_FREE_USAGE = 5;

  constructor(
    @InjectModel(GuestUsage.name) 
    private guestUsageModel: Model<GuestUsageDocument>
  ) {}

  /**
   * Check if a guest can use the service and increment usage count
   */
  async canUse(deviceId: string): Promise<boolean> {
    try {
      // Find or create guest usage record
      let guestUsage = await this.guestUsageModel.findOne({ deviceId });

      if (!guestUsage) {
        // First time user - create new record
        guestUsage = await this.guestUsageModel.create({
          deviceId,
          usageCount: 1,
          lastUsed: new Date(),
        });
        
        this.logger.log(`New guest user created: ${this.maskDeviceId(deviceId)}`);
        return true;
      }

      const entity = GuestUsageEntity.fromDocument(guestUsage);

      // Check if user can use the service
      if (!entity.canUseService()) {
        this.logger.debug(`Guest usage limit reached for device: ${this.maskDeviceId(deviceId)}`);
        return false;
      }

      // Handle redeemed feedback code - reset usage count
      if (entity.feedbackCodeStatus === 'redeemed') {
        await this.guestUsageModel.updateOne(
          { deviceId },
          {
            $set: {
              usageCount: 1,
              feedbackCode: null,
              feedbackCodeStatus: null,
              lastUsed: new Date(),
            }
          }
        );
        
        this.logger.log(`Guest usage reset after feedback redemption: ${this.maskDeviceId(deviceId)}`);
        return true;
      }

      // Increment usage count
      await this.guestUsageModel.updateOne(
        { deviceId },
        {
          $inc: { usageCount: 1 },
          $set: { lastUsed: new Date() }
        }
      );

      this.logger.debug(`Guest usage incremented for device: ${this.maskDeviceId(deviceId)}`);
      return true;

    } catch (error) {
      this.logger.error(`Error checking guest usage for device ${this.maskDeviceId(deviceId)}:`, error);
      throw error;
    }
  }

  /**
   * Generate a feedback code for a guest user
   */
  async generateFeedbackCode(deviceId: string): Promise<string> {
    try {
      const guestUsage = await this.guestUsageModel.findOne({ deviceId });

      if (!guestUsage) {
        throw new BadRequestException('Guest usage record not found');
      }

      // Check if user has reached the limit
      if (guestUsage.usageCount < this.MAX_FREE_USAGE) {
        throw new BadRequestException('Feedback code not needed - usage limit not reached');
      }

      // Check if feedback code already generated and not redeemed
      if (guestUsage.feedbackCode && guestUsage.feedbackCodeStatus === 'generated') {
        this.logger.debug(`Returning existing feedback code for device: ${this.maskDeviceId(deviceId)}`);
        return guestUsage.feedbackCode;
      }

      // Generate new feedback code
      const feedbackCode = `fb-${uuidv4()}`;

      await this.guestUsageModel.updateOne(
        { deviceId },
        {
          $set: {
            feedbackCode,
            feedbackCodeStatus: 'generated',
            updatedAt: new Date(),
          }
        }
      );

      this.logger.log(`Feedback code generated for device: ${this.maskDeviceId(deviceId)}`);
      return feedbackCode;

    } catch (error) {
      this.logger.error(`Error generating feedback code for device ${this.maskDeviceId(deviceId)}:`, error);
      throw error;
    }
  }

  /**
   * Redeem a feedback code to reset usage limit
   */
  async redeemFeedbackCode(feedbackCode: string): Promise<boolean> {
    try {
      const guestUsage = await this.guestUsageModel.findOne({ 
        feedbackCode,
        feedbackCodeStatus: 'generated' 
      });

      if (!guestUsage) {
        throw new BadRequestException('Invalid or already redeemed feedback code');
      }

      // Mark feedback code as redeemed
      await this.guestUsageModel.updateOne(
        { feedbackCode },
        {
          $set: {
            feedbackCodeStatus: 'redeemed',
            updatedAt: new Date(),
          }
        }
      );

      this.logger.log(`Feedback code redeemed for device: ${this.maskDeviceId(guestUsage.deviceId)}`);
      return true;

    } catch (error) {
      this.logger.error(`Error redeeming feedback code ${feedbackCode}:`, error);
      throw error;
    }
  }

  /**
   * Get usage status for a guest user
   */
  async getUsageStatus(deviceId: string): Promise<GuestUsageResponseDto> {
    try {
      const guestUsage = await this.guestUsageModel.findOne({ deviceId });

      if (!guestUsage) {
        // New user
        return {
          canUse: true,
          remainingCount: this.MAX_FREE_USAGE,
          needsFeedbackCode: false,
        };
      }

      const entity = GuestUsageEntity.fromDocument(guestUsage);

      return {
        canUse: entity.canUseService(),
        remainingCount: entity.getRemainingCount(),
        needsFeedbackCode: entity.needsFeedbackCode(),
        feedbackCode: entity.feedbackCodeStatus === 'generated' ? guestUsage.feedbackCode : undefined,
      };

    } catch (error) {
      this.logger.error(`Error getting usage status for device ${this.maskDeviceId(deviceId)}:`, error);
      throw error;
    }
  }

  /**
   * Get detailed guest status including usage history
   */
  async getGuestStatus(deviceId: string): Promise<GuestStatusDto> {
    try {
      const guestUsage = await this.guestUsageModel.findOne({ deviceId });

      if (!guestUsage) {
        throw new BadRequestException('Guest record not found');
      }

      const entity = GuestUsageEntity.fromDocument(guestUsage);

      return {
        deviceId: guestUsage.deviceId,
        usageCount: guestUsage.usageCount,
        maxUsage: this.MAX_FREE_USAGE,
        isLimited: !entity.canUseService(),
        feedbackCodeStatus: guestUsage.feedbackCodeStatus,
        lastUsed: guestUsage.lastUsed,
      };

    } catch (error) {
      this.logger.error(`Error getting guest status for device ${this.maskDeviceId(deviceId)}:`, error);
      throw error;
    }
  }

  /**
   * Clean up old guest records (called by cron job)
   */
  async cleanupOldRecords(daysOld = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.guestUsageModel.deleteMany({
        createdAt: { $lt: cutoffDate },
        feedbackCodeStatus: { $ne: 'generated' } // Keep records with pending feedback codes
      });

      this.logger.log(`Cleaned up ${result.deletedCount} old guest records older than ${daysOld} days`);
      return result.deletedCount;

    } catch (error) {
      this.logger.error('Error cleaning up old guest records:', error);
      throw error;
    }
  }

  /**
   * Get service statistics for monitoring
   */
  async getServiceStats(): Promise<{
    totalGuests: number;
    activeGuests: number;
    pendingFeedbackCodes: number;
    redeemedFeedbackCodes: number;
  }> {
    try {
      const [
        totalGuests,
        activeGuests,
        pendingFeedbackCodes,
        redeemedFeedbackCodes
      ] = await Promise.all([
        this.guestUsageModel.countDocuments(),
        this.guestUsageModel.countDocuments({
          lastUsed: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        }),
        this.guestUsageModel.countDocuments({
          feedbackCodeStatus: 'generated'
        }),
        this.guestUsageModel.countDocuments({
          feedbackCodeStatus: 'redeemed'
        })
      ]);

      return {
        totalGuests,
        activeGuests,
        pendingFeedbackCodes,
        redeemedFeedbackCodes,
      };

    } catch (error) {
      this.logger.error('Error getting service stats:', error);
      throw error;
    }
  }

  private maskDeviceId(deviceId: string): string {
    if (deviceId.length <= 8) return '***';
    return deviceId.substring(0, 4) + '***' + deviceId.substring(deviceId.length - 4);
  }
}