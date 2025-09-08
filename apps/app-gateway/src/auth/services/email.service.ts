import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter!: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpConfig = {
      host: this.configService.get<string>('SMTP_HOST'),
      port: parseInt(this.configService.get<string>('SMTP_PORT') || '587'),
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    };

    if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
      this.logger.warn(
        'SMTP configuration incomplete. Email MFA will not work properly.',
      );
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      return;
    }

    this.transporter = nodemailer.createTransport(smtpConfig);

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('SMTP connection failed:', error);
      } else {
        this.logger.log('SMTP connection established successfully');
      }
    });
  }

  async sendMfaToken(
    email: string,
    token: string,
    issuer: string,
  ): Promise<void> {
    const fromEmail =
      this.configService.get<string>('SMTP_FROM') ||
      'noreply@ai-recruitment-clerk.com';

    const mailOptions = {
      from: `${issuer} Security <${fromEmail}>`,
      to: email,
      subject: `${issuer} - Verification Code`,
      html: this.generateMfaEmailTemplate(token, issuer),
      text: `Your ${issuer} verification code is: ${token}. This code expires in 5 minutes. If you did not request this code, please ignore this email.`,
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`MFA email sent successfully to ${email}`);

      // Log JSON result if using test transporter
      if (this.configService.get<string>('NODE_ENV') !== 'production') {
        this.logger.debug(
          'Email preview:',
          nodemailer.getTestMessageUrl(result),
        );
      }
    } catch (error) {
      this.logger.error(`Failed to send MFA email to ${email}:`, error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendAccountSecurityAlert(
    email: string,
    event: string,
    details: any,
  ): Promise<void> {
    const fromEmail =
      this.configService.get<string>('SMTP_FROM') ||
      'noreply@ai-recruitment-clerk.com';
    const issuer =
      this.configService.get<string>('MFA_ISSUER_NAME') ||
      'AI-Recruitment-Clerk';

    const mailOptions = {
      from: `${issuer} Security <${fromEmail}>`,
      to: email,
      subject: `${issuer} - Security Alert: ${event}`,
      html: this.generateSecurityAlertTemplate(event, details, issuer),
      text: `Security Alert: ${event}\n\nTime: ${details.timestamp}\nIP Address: ${details.ipAddress}\nUser Agent: ${details.userAgent}\n\nIf this was not you, please contact support immediately.`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Security alert sent to ${email} for event: ${event}`);
    } catch (error) {
      this.logger.error(`Failed to send security alert to ${email}:`, error);
    }
  }

  private generateMfaEmailTemplate(token: string, issuer: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${issuer} - Verification Code</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; }
        .token { font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 4px; margin: 20px 0; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { font-size: 12px; color: #666; text-align: center; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${issuer}</h1>
          <h2>Verification Code</h2>
        </div>
        
        <p>Hello,</p>
        
        <p>You have requested a verification code for ${issuer}. Please use the following code to complete your authentication:</p>
        
        <div class="token">${token}</div>
        
        <div class="warning">
          <strong>Important:</strong>
          <ul>
            <li>This code expires in 5 minutes</li>
            <li>Do not share this code with anyone</li>
            <li>If you did not request this code, please ignore this email</li>
          </ul>
        </div>
        
        <p>If you need assistance, please contact our support team.</p>
        
        <div class="footer">
          <p>This is an automated message from ${issuer} Security System.</p>
          <p>Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private generateSecurityAlertTemplate(
    event: string,
    details: any,
    issuer: string,
  ): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${issuer} - Security Alert</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc3545; color: white; padding: 20px; border-radius: 5px; text-align: center; }
        .alert { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { font-size: 12px; color: #666; text-align: center; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 Security Alert</h1>
          <h2>${issuer}</h2>
        </div>
        
        <div class="alert">
          <h3>${event}</h3>
          <p>We detected activity on your account that may require your attention.</p>
        </div>
        
        <div class="details">
          <h4>Event Details:</h4>
          <ul>
            <li><strong>Time:</strong> ${details.timestamp}</li>
            <li><strong>IP Address:</strong> ${details.ipAddress}</li>
            <li><strong>User Agent:</strong> ${details.userAgent}</li>
            <li><strong>Location:</strong> ${details.location || 'Unknown'}</li>
          </ul>
        </div>
        
        <p><strong>If this was you:</strong> No action is required.</p>
        <p><strong>If this was not you:</strong> Please contact our security team immediately and consider changing your password.</p>
        
        <div class="footer">
          <p>This is an automated security alert from ${issuer}.</p>
          <p>Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }
}
