import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient: Twilio | null = null;
  private fromPhone!: string;

  constructor(private configService: ConfigService) {
    this.initializeTwilio();
  }

  private initializeTwilio() {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromPhone = this.configService.get<string>('TWILIO_FROM_PHONE') || '';

    if (!accountSid || !authToken || !this.fromPhone) {
      this.logger.warn(
        'Twilio configuration incomplete. SMS MFA will not work properly. SMS will be logged instead.',
      );
      return;
    }

    try {
      this.twilioClient = new Twilio(accountSid, authToken);
      this.logger.log('Twilio SMS client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Twilio client:', error);
    }
  }

  async sendSms(phoneNumber: string, message: string): Promise<void> {
    // Validate phone number format
    if (!this.isValidPhoneNumber(phoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    if (!this.twilioClient) {
      // In development or when Twilio is not configured, log the SMS instead
      this.logger.warn(`SMS would be sent to ${phoneNumber}: ${message}`);

      // For development, you could also use a test service or webhook
      if (this.configService.get<string>('NODE_ENV') === 'development') {
        await this.simulateSmsDelivery(phoneNumber, message);
      }
      return;
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.fromPhone,
        to: phoneNumber,
      });

      this.logger.log(
        `SMS sent successfully to ${phoneNumber}, SID: ${result.sid}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phoneNumber}:`, error);

      // Check for specific Twilio errors
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 21211) {
          throw new Error('Invalid phone number');
        } else if (error.code === 21608) {
          throw new Error('Phone number is not verified for trial account');
        } else if (error.code === 20003) {
          throw new Error('Authentication failed - check Twilio credentials');
        }
      }

      throw new Error('Failed to send SMS verification code');
    }
  }

  async sendSecurityAlert(
    phoneNumber: string,
    event: string,
    details: any,
  ): Promise<void> {
    const issuer =
      this.configService.get<string>('MFA_ISSUER_NAME') ||
      'AI-Recruitment-Clerk';
    const message = `${issuer} Security Alert: ${event}. Time: ${details.timestamp}. If this was not you, contact support immediately.`;

    try {
      await this.sendSms(phoneNumber, message);
      this.logger.log(
        `Security alert SMS sent to ${phoneNumber} for event: ${event}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send security alert SMS to ${phoneNumber}:`,
        error,
      );
    }
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic phone number validation (E.164 format)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  private async simulateSmsDelivery(
    phoneNumber: string,
    message: string,
  ): Promise<void> {
    // Simulate SMS delivery delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // SMS simulation for development mode
    this.logger.log('📱 SMS SIMULATION (Development Mode)');
    this.logger.log(`To: ${phoneNumber}`);
    this.logger.log(`Message: ${message}`);
    this.logger.log(`Timestamp: ${new Date().toISOString()}`);
  }

  async getDeliveryStatus(messageSid: string): Promise<any> {
    if (!this.twilioClient) {
      return { status: 'not_configured', message: 'Twilio not configured' };
    }

    try {
      const message = await this.twilioClient.messages(messageSid).fetch();
      return {
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get delivery status for ${messageSid}:`,
        error,
      );
      return {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  validatePhoneNumber(phoneNumber: string): {
    isValid: boolean;
    formatted?: string;
    error?: string;
  } {
    // Remove all non-digit characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');

    // Check if it starts with +
    if (!cleaned.startsWith('+')) {
      return {
        isValid: false,
        error: 'Phone number must start with country code (+)',
      };
    }

    // Check minimum and maximum length
    if (cleaned.length < 8 || cleaned.length > 16) {
      return { isValid: false, error: 'Invalid phone number length' };
    }

    // Check if it matches E.164 format
    if (!this.isValidPhoneNumber(cleaned)) {
      return { isValid: false, error: 'Invalid phone number format' };
    }

    return { isValid: true, formatted: cleaned };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.twilioClient) {
      return { success: false, message: 'Twilio client not initialized' };
    }

    try {
      // Fetch account info to test connection
      const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
      if (!accountSid) {
        return { success: false, message: 'TWILIO_ACCOUNT_SID not configured' };
      }
      const account = await this.twilioClient.api.accounts(accountSid).fetch();
      return {
        success: true,
        message: `Connected to Twilio account: ${account.friendlyName}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Twilio connection failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
