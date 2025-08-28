import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedbackCodeController } from './feedback-code.controller';
import { FeedbackCodeService } from './feedback-code.service';
import { FeedbackCodeSchema } from './schemas/feedback-code.schema';
import { MarketingAdminController } from './marketing-admin.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'FeedbackCode', schema: FeedbackCodeSchema }
    ])
  ],
  controllers: [
    FeedbackCodeController,
    MarketingAdminController
  ],
  providers: [
    FeedbackCodeService
  ],
  exports: [
    FeedbackCodeService
  ]
})
export class MarketingModule {}