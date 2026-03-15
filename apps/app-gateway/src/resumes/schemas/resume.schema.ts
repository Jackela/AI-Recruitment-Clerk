import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type ResumeDocument = HydratedDocument<Resume>;

@Schema({ timestamps: true, collection: 'resumes' })
export class Resume {
  @Prop({ type: String, required: false })
  candidateId?: string;

  @Prop({ type: String, required: false, index: true })
  candidateEmail?: string;

  @Prop({ type: String, required: false })
  candidatePhone?: string;

  @Prop({ type: String, required: false })
  candidateName?: string;

  @Prop({
    type: {
      filePath: { type: String, required: true },
      fileSize: { type: Number, required: true },
      mimeType: { type: String, required: true },
      checksum: { type: String, required: true },
      originalName: { type: String, required: false },
    },
    required: true,
  })
  fileMetadata!: {
    filePath: string;
    fileSize: number;
    mimeType: string;
    checksum: string;
    originalName?: string;
  };

  @Prop({
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'deleted'],
    default: 'pending',
  })
  status = 'pending';

  @Prop({ type: Object, required: false })
  parsedData?: Record<string, unknown>;

  @Prop({ type: String, required: false })
  errorMessage?: string;

  @Prop({ type: Date, required: false })
  parsedAt?: Date;

  @Prop({ type: Date, required: false })
  deletedAt?: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date = new Date();

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date = new Date();
}

export const ResumeSchema = SchemaFactory.createForClass(Resume);

// Create indexes for common queries
ResumeSchema.index({ candidateId: 1, createdAt: -1 });
ResumeSchema.index({ candidateEmail: 1 });
ResumeSchema.index({ 'fileMetadata.checksum': 1 });
ResumeSchema.index({ status: 1, createdAt: -1 });
