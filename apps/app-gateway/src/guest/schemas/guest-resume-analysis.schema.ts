import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type GuestResumeAnalysisDocument =
  HydratedDocument<GuestResumeAnalysis>;

export type GuestResumeAnalysisStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired';

@Schema({
  timestamps: true,
  collection: 'guest_resume_analyses',
})
export class GuestResumeAnalysis extends Document {
  @Prop({ required: true, unique: true, index: true })
  public analysisId!: string;

  @Prop({ required: true, index: true })
  public sessionId!: string;

  @Prop({ required: false, index: true })
  public deviceId?: string;

  @Prop({ required: false, index: true })
  public userId?: string;

  @Prop({
    required: true,
    enum: ['queued', 'processing', 'completed', 'failed', 'expired'],
    default: 'queued',
    index: true,
  })
  public status!: GuestResumeAnalysisStatus;

  @Prop({ required: true, default: 0, min: 0, max: 100 })
  public progress!: number;

  @Prop({ required: true })
  public filename!: string;

  @Prop({ required: true })
  public fileSize!: number;

  @Prop({ required: true })
  public mimeType!: string;

  @Prop({ required: false })
  public gridFsUrl?: string;

  @Prop({ required: false })
  public candidateName?: string;

  @Prop({ required: false })
  public candidateEmail?: string;

  @Prop({ required: false })
  public notes?: string;

  @Prop({ required: true, default: true })
  public isGuestMode!: boolean;

  @Prop({ required: true, default: Date.now })
  public uploadedAt!: Date;

  @Prop({ required: false })
  public completedAt?: Date;

  @Prop({ required: false })
  public failedAt?: Date;

  @Prop({ required: false })
  public errorMessage?: string;

  @Prop({ required: false, type: SchemaTypes.Mixed })
  public result?: unknown;
}

export const GuestResumeAnalysisSchema =
  SchemaFactory.createForClass(GuestResumeAnalysis);

GuestResumeAnalysisSchema.index({ deviceId: 1, uploadedAt: -1 });
GuestResumeAnalysisSchema.index({ userId: 1, uploadedAt: -1 });
GuestResumeAnalysisSchema.index(
  { uploadedAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 },
);
