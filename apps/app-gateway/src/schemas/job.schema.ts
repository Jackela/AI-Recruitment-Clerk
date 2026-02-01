import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Document } from 'mongoose';

export type JobDocument = Job & Document;

/**
 * Represents the job requirement.
 */
@Schema()
export class JobRequirement {
  @Prop({ type: String, required: true })
  public skill = '';

  @Prop({
    type: String,
    enum: ['required', 'preferred', 'nice-to-have'],
    default: 'required',
  })
  public level = 'required';

  @Prop({ type: Number, min: 1, max: 10, default: 5 })
  public importance = 5;
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
  public title = '';

  @Prop({ type: String, required: true })
  public description = '';

  @Prop({ type: [JobRequirementSchema], default: [] })
  public requirements: JobRequirement[] = [];

  @Prop({ type: [String], default: [] })
  public skills: string[] = [];

  @Prop({ type: String, required: true, trim: true })
  public company = '';

  @Prop({ type: String, trim: true })
  public location = '';

  @Prop({
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'temporary', 'internship'],
    default: 'full-time',
  })
  public employmentType = 'full-time';

  @Prop({ type: Number, min: 0 })
  public salaryMin = 0;

  @Prop({ type: Number, min: 0 })
  public salaryMax = 0;

  @Prop({ type: String })
  public salaryCurrency = 'USD';

  @Prop({
    type: String,
    enum: ['active', 'paused', 'closed', 'draft'],
    default: 'active',
  })
  public status = 'active';

  // Analysis metadata
  @Prop({ type: Number, min: 0, max: 1, default: 0 })
  public jdExtractionConfidence = 0;

  @Prop({ type: [String], default: [] })
  public extractedKeywords: string[] = [];

  @Prop({ type: Date })
  public jdProcessedAt: Date = new Date();

  @Prop({ type: String })
  public createdBy = ''; // User ID reference

  @Prop({ type: String, index: true })
  public organizationId = ''; // Organization ID for multi-tenant access control

  @Prop({ type: Date, default: Date.now })
  public createdAt: Date = new Date();

  @Prop({ type: Date, default: Date.now })
  public updatedAt: Date = new Date();
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
