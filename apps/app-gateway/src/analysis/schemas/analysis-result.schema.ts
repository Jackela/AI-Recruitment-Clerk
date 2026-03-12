import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Document, Types } from 'mongoose';

export type AnalysisResultDocument = AnalysisResult & Document;

/**
 * Represents the skill analysis.
 */
@Schema()
export class SkillAnalysis {
  @Prop({ type: String, required: true })
  public skill = '';

  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  public matchScore = 0;

  @Prop({
    type: String,
    enum: ['strong', 'partial', 'weak', 'missing'],
    default: 'missing',
  })
  public matchLevel = 'missing';

  @Prop({ type: String })
  public evidence = '';
}

export const SkillAnalysisSchema = SchemaFactory.createForClass(SkillAnalysis);

/**
 * Represents the analysis result.
 */
@Schema({
  timestamps: true,
  collection: 'analysis_results',
})
export class AnalysisResult {
  @Prop({ type: String, required: true, index: true })
  public analysisId = '';

  @Prop({ type: String, required: true, index: true })
  public jobId = '';

  @Prop({ type: String, required: true, index: true })
  public resumeId = '';

  @Prop({ type: String })
  public candidateName = '';

  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  public overallScore = 0;

  @Prop({ type: [SkillAnalysisSchema], default: [] })
  public skillAnalysis: SkillAnalysis[] = [];

  @Prop({ type: Object })
  public experienceAnalysis: Record<string, unknown> = {};

  @Prop({ type: Object })
  public educationAnalysis: Record<string, unknown> = {};

  @Prop({ type: String })
  public recommendation: 'strong_hire' | 'hire' | 'maybe' | 'reject' | string =
    'maybe';

  @Prop({ type: String })
  public summary = '';

  @Prop({ type: Number, default: 1 })
  public version = 1;

  @Prop({ type: Boolean, default: false })
  public isLatestVersion = true;

  @Prop({ type: String })
  public previousVersionId: string | undefined;

  @Prop({
    type: String,
    enum: ['completed', 'processing', 'failed'],
    default: 'processing',
  })
  public status = 'processing';

  @Prop({ type: Date })
  public completedAt: Date | undefined;

  @Prop({ type: Date, default: Date.now })
  public createdAt: Date = new Date();

  @Prop({ type: Date, default: Date.now })
  public updatedAt: Date = new Date();

  @Prop({ type: String })
  public createdBy = '';
}

export const AnalysisResultSchema =
  SchemaFactory.createForClass(AnalysisResult);

// Create indexes for better query performance
AnalysisResultSchema.index({ analysisId: 1 });
AnalysisResultSchema.index({ jobId: 1, resumeId: 1 });
AnalysisResultSchema.index({ jobId: 1, overallScore: -1 });
AnalysisResultSchema.index({ resumeId: 1 });
AnalysisResultSchema.index({ status: 1 });
AnalysisResultSchema.index({ createdAt: -1 });
AnalysisResultSchema.index({ overallScore: -1 });
AnalysisResultSchema.index({ recommendation: 1 });
AnalysisResultSchema.index({ isLatestVersion: 1, analysisId: 1 });
AnalysisResultSchema.index({ jobId: 1, isLatestVersion: 1, overallScore: -1 });
