import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Document } from 'mongoose';

export type GuestUsageDocument = HydratedDocument<GuestUsage>;

/**
 * Represents the guest usage.
 */
@Schema({
  timestamps: true,
  collection: 'guest_usages',
})
export class GuestUsage extends Document {
  @Prop({ required: true, unique: true })
  public deviceId!: string;

  @Prop({ required: true, default: 0, min: 0 })
  public usageCount!: number;

  @Prop({ required: false, default: null })
  public feedbackCode?: string;

  @Prop({
    required: false,
    enum: ['generated', 'redeemed'],
    default: null,
  })
  public feedbackCodeStatus?: 'generated' | 'redeemed';

  @Prop({ required: true, default: Date.now })
  public lastUsed!: Date;

  @Prop({ required: true, default: Date.now })
  public createdAt!: Date;

  @Prop({ required: true, default: Date.now })
  public updatedAt!: Date;
}

export const GuestUsageSchema = SchemaFactory.createForClass(GuestUsage);

// Add indexes for optimization (deviceId already has unique index from @Prop)
GuestUsageSchema.index({ feedbackCode: 1 });

// Add TTL index to automatically cleanup old records (30 days)
GuestUsageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);
