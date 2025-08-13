import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GuestController } from './controllers/guest.controller';
import { GuestResumeController } from './controllers/guest-resume.controller';
import { GuestUsageService } from './services/guest-usage.service';
import { GuestGuard } from './guards/guest.guard';
import { GuestUsage, GuestUsageSchema } from './schemas/guest-usage.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GuestUsage.name, schema: GuestUsageSchema }
    ])
  ],
  controllers: [GuestController, GuestResumeController],
  providers: [
    GuestUsageService,
    GuestGuard
  ],
  exports: [
    GuestUsageService,
    GuestGuard
  ]
})
export class GuestModule {}