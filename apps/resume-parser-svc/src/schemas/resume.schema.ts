import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ResumeDocument = Resume & Document;

@Schema()
export class ContactInfo {
  @Prop({ type: String, default: null })
  name: string | null;

  @Prop({ type: String, default: null, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })
  email: string | null;

  @Prop({ type: String, default: null })
  phone: string | null;
}

@Schema()
export class WorkExperience {
  @Prop({ required: true })
  company: string;

  @Prop({ required: true })
  position: string;

  @Prop({ required: true })
  startDate: string;

  @Prop({ required: true })
  endDate: string;

  @Prop({ required: true })
  summary: string;
}

@Schema()
export class Education {
  @Prop({ required: true })
  school: string;

  @Prop({ required: true })
  degree: string;

  @Prop({ type: String, default: null })
  major: string | null;
}

@Schema({ 
  timestamps: true,
  collection: 'resumes'
})
export class Resume {
  @Prop({ type: ContactInfo, required: true })
  contactInfo: ContactInfo;

  @Prop({ type: [String], default: [] })
  skills: string[];

  @Prop({ type: [WorkExperience], default: [] })
  workExperience: WorkExperience[];

  @Prop({ type: [Education], default: [] })
  education: Education[];

  // Additional metadata fields for tracking
  @Prop({ required: true })
  originalFilename: string;

  @Prop({ required: true })
  gridFsUrl: string;

  @Prop({ type: Number, min: 0, max: 1, default: 0 })
  processingConfidence: number;

  @Prop({ type: [String], default: [] })
  validationErrors: string[];

  @Prop({ type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' })
  status: string;

  @Prop({ type: Date, default: Date.now })
  processedAt: Date;
}

export const ResumeSchema = SchemaFactory.createForClass(Resume);

// Create indexes for better query performance
ResumeSchema.index({ 'contactInfo.email': 1 });
ResumeSchema.index({ 'contactInfo.name': 1 });
ResumeSchema.index({ status: 1 });
ResumeSchema.index({ processedAt: -1 });
ResumeSchema.index({ originalFilename: 1 });