import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReportDocument = Report & Document;

@Schema()
export class ScoreBreakdown {
  @Prop({ required: true, min: 0, max: 100 })
  skillsMatch: number;

  @Prop({ required: true, min: 0, max: 100 })
  experienceMatch: number;

  @Prop({ required: true, min: 0, max: 100 })
  educationMatch: number;

  @Prop({ required: true, min: 0, max: 100 })
  overallFit: number;
}

@Schema()
export class MatchingSkill {
  @Prop({ required: true })
  skill: string;

  @Prop({ required: true, min: 0, max: 100 })
  matchScore: number;

  @Prop({ type: String, enum: ['exact', 'partial', 'related', 'missing'], default: 'missing' })
  matchType: string;

  @Prop()
  explanation: string;
}

@Schema()
export class ReportRecommendation {
  @Prop({ type: String, enum: ['hire', 'consider', 'interview', 'reject'], required: true })
  decision: string;

  @Prop({ required: true })
  reasoning: string;

  @Prop({ type: [String], default: [] })
  strengths: string[];

  @Prop({ type: [String], default: [] })
  concerns: string[];

  @Prop({ type: [String], default: [] })
  suggestions: string[];
}

@Schema({ 
  timestamps: true,
  collection: 'reports'
})
export class Report {
  @Prop({ required: true })
  jobId: string;

  @Prop({ required: true })
  resumeId: string;

  @Prop({ type: ScoreBreakdown, required: true })
  scoreBreakdown: ScoreBreakdown;

  @Prop({ type: [MatchingSkill], default: [] })
  skillsAnalysis: MatchingSkill[];

  @Prop({ type: ReportRecommendation, required: true })
  recommendation: ReportRecommendation;

  @Prop({ required: true })
  summary: string;

  @Prop({ type: Number, min: 0, max: 1, default: 0 })
  analysisConfidence: number;

  @Prop({ type: Number, min: 0, default: 0 })
  processingTimeMs: number;

  @Prop({ type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' })
  status: string;

  @Prop()
  errorMessage: string;

  // Metadata for tracking and auditing
  @Prop({ required: true })
  generatedBy: string; // Service identifier

  @Prop({ required: true })
  llmModel: string;

  @Prop({ type: Date, default: Date.now })
  generatedAt: Date;

  @Prop()
  requestedBy: string; // User ID if applicable

  // GridFS URL for detailed report document if generated
  @Prop()
  detailedReportUrl: string;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

// Create indexes for better query performance
ReportSchema.index({ jobId: 1, resumeId: 1 }, { unique: true });
ReportSchema.index({ jobId: 1 });
ReportSchema.index({ resumeId: 1 });
ReportSchema.index({ status: 1 });
ReportSchema.index({ generatedAt: -1 });
ReportSchema.index({ 'recommendation.decision': 1 });
ReportSchema.index({ 'scoreBreakdown.overallFit': -1 });