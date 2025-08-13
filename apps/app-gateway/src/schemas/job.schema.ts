import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type JobDocument = Job & Document;

@Schema()
export class JobRequirement {
  @Prop({ required: true })
  skill: string;

  @Prop({ type: String, enum: ['required', 'preferred', 'nice-to-have'], default: 'required' })
  level: string;

  @Prop({ type: Number, min: 1, max: 10, default: 5 })
  importance: number;
}

@Schema({ 
  timestamps: true,
  collection: 'jobs'
})
export class Job {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [JobRequirement], default: [] })
  requirements: JobRequirement[];

  @Prop({ type: [String], default: [] })
  skills: string[];

  @Prop({ required: true, trim: true })
  company: string;

  @Prop({ trim: true })
  location: string;

  @Prop({ type: String, enum: ['full-time', 'part-time', 'contract', 'temporary', 'internship'], default: 'full-time' })
  employmentType: string;

  @Prop({ type: Number, min: 0 })
  salaryMin: number;

  @Prop({ type: Number, min: 0 })
  salaryMax: number;

  @Prop({ type: String })
  salaryCurrency: string;

  @Prop({ type: String, enum: ['active', 'paused', 'closed', 'draft'], default: 'active' })
  status: string;

  // Analysis metadata
  @Prop({ type: Number, min: 0, max: 1, default: 0 })
  jdExtractionConfidence: number;

  @Prop({ type: [String], default: [] })
  extractedKeywords: string[];

  @Prop({ type: Date })
  jdProcessedAt: Date;

  @Prop({ type: String })
  createdBy: string; // User ID reference

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const JobSchema = SchemaFactory.createForClass(Job);

// Create indexes for better query performance
JobSchema.index({ title: 'text', description: 'text', company: 'text' });
JobSchema.index({ company: 1 });
JobSchema.index({ status: 1 });
JobSchema.index({ employmentType: 1 });
JobSchema.index({ createdAt: -1 });
JobSchema.index({ createdBy: 1 });