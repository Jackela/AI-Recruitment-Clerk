import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type JobDocument = Job & Document;

/**
 * Represents the job requirement.
 */
@Schema()
export class JobRequirement {
  @Prop({ type: String, required: true, default: '' })
  skill!: string;

  @Prop({
    type: String,
    enum: ['required', 'preferred', 'nice-to-have'],
    default: 'required',
  })
  level = 'required';

  @Prop({ type: Number, min: 1, max: 10, default: 5 })
  importance = 5;
}

// Explicitly create schema for nested subdocument to avoid runtime reflection issues
export const JobRequirementSchema =
  SchemaFactory.createForClass(JobRequirement);

/**
 * Represents the job.
 */
@Schema({
  timestamps: true,
  collection: 'jobs',
})
export class Job {
  @Prop({ type: String, required: true, trim: true })
  title = '';

  @Prop({ type: String, required: true })
  description = '';

  @Prop({ type: [JobRequirementSchema], default: [] })
  requirements: JobRequirement[] = [];

  @Prop({ type: [String], default: [] })
  skills: string[] = [];

  @Prop({ type: String, required: true, trim: true })
  company = '';

  @Prop({ type: String, trim: true })
  location = '';

  @Prop({
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'temporary', 'internship'],
    default: 'full-time',
  })
  employmentType = 'full-time';

  @Prop({ type: Number, min: 0 })
  salaryMin = 0;

  @Prop({ type: Number, min: 0 })
  salaryMax = 0;

  @Prop({ type: String })
  salaryCurrency = 'USD';

  @Prop({
    type: String,
    enum: ['active', 'paused', 'closed', 'draft'],
    default: 'active',
  })
  status = 'active';

  // Analysis metadata
  @Prop({ type: Number, min: 0, max: 1, default: 0 })
  jdExtractionConfidence = 0;

  @Prop({ type: [String], default: [] })
  extractedKeywords: string[] = [];

  @Prop({ type: Date, default: Date.now })
  jdProcessedAt!: Date;

  @Prop({ type: String })
  createdBy = ''; // User ID reference

  @Prop({ type: String, index: true })
  organizationId = ''; // Organization ID for multi-tenant access control

  @Prop({ type: Date, default: Date.now })
  createdAt!: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt!: Date;
}

export const JobSchema = SchemaFactory.createForClass(Job);

// Create indexes for better query performance
JobSchema.index({ title: 'text', description: 'text', company: 'text' });
JobSchema.index({ company: 1 });
JobSchema.index({ status: 1 });
JobSchema.index({ employmentType: 1 });
JobSchema.index({ createdAt: -1 });
JobSchema.index({ createdBy: 1 });
JobSchema.index({ organizationId: 1 });
JobSchema.index({ organizationId: 1, status: 1 }); // Compound index for multi-tenant queries
