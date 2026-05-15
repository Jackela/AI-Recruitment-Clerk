import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Document } from 'mongoose';

export type ReportTemplateDocument = ReportTemplate & Document;
export type GeneratedReportDocument = GeneratedReport & Document;

/**
 * Represents a report template.
 */
@Schema({
  timestamps: true,
  collection: 'report_templates',
})
export class ReportTemplate {
  @Prop({ type: String, required: true, unique: true })
  public templateId = '';

  @Prop({ type: String, required: true })
  public name = '';

  @Prop({ type: String })
  public description = '';

  @Prop({
    type: String,
    enum: ['candidate', 'job', 'analytics', 'custom'],
    default: 'custom',
  })
  public type = 'custom';

  @Prop({ type: Object })
  public structure: Record<string, unknown> = {};

  @Prop({ type: [String], default: [] })
  public sections: string[] = [];

  @Prop({ type: Boolean, default: true })
  public isActive = true;

  @Prop({ type: String })
  public createdBy = '';

  @Prop({ type: Date, default: Date.now })
  public createdAt: Date = new Date();

  @Prop({ type: Date, default: Date.now })
  public updatedAt: Date = new Date();
}

export const ReportTemplateSchema =
  SchemaFactory.createForClass(ReportTemplate);

/**
 * Represents a report share.
 */
@Schema()
export class ReportShare {
  @Prop({ type: String, required: true })
  public shareId = '';

  @Prop({ type: String, required: true })
  public sharedBy = '';

  @Prop({ type: String, required: true })
  public sharedWith = '';

  @Prop({ type: String, enum: ['view', 'edit', 'admin'], default: 'view' })
  public permission = 'view';

  @Prop({ type: Date, required: true })
  public expiresAt: Date = new Date();

  @Prop({ type: Date, default: Date.now })
  public sharedAt: Date = new Date();
}

export const ReportShareSchema = SchemaFactory.createForClass(ReportShare);

/**
 * Represents report scheduling.
 */
@Schema()
export class ReportSchedule {
  @Prop({ type: String, required: true })
  public scheduleId = '';

  @Prop({
    type: String,
    enum: ['once', 'daily', 'weekly', 'monthly'],
    required: true,
  })
  public frequency: 'once' | 'daily' | 'weekly' | 'monthly' = 'once';

  @Prop({ type: Date })
  public nextRunAt: Date | undefined;

  @Prop({ type: Date })
  public lastRunAt: Date | undefined;

  @Prop({ type: Boolean, default: true })
  public isActive = true;

  @Prop({ type: Object })
  public parameters: Record<string, unknown> = {};
}

export const ReportScheduleSchema =
  SchemaFactory.createForClass(ReportSchedule);

/**
 * Represents a generated report.
 */
@Schema({
  timestamps: true,
  collection: 'generated_reports',
})
export class GeneratedReport {
  @Prop({ type: String, required: true, index: true })
  public reportId = '';

  @Prop({ type: String, required: true, index: true })
  public templateId = '';

  @Prop({ type: String, required: true })
  public name = '';

  @Prop({
    type: String,
    enum: ['candidate', 'job', 'analytics', 'custom'],
    default: 'custom',
  })
  public type = 'custom';

  @Prop({ type: String })
  public jobId: string | undefined;

  @Prop({ type: String })
  public resumeId: string | undefined;

  @Prop({ type: String })
  public analysisId: string | undefined;

  @Prop({ type: Object })
  public content: Record<string, unknown> = {};

  @Prop({ type: String })
  public format: 'pdf' | 'html' | 'json' | 'csv' | string = 'pdf';

  @Prop({ type: String })
  public fileUrl: string | undefined;

  @Prop({
    type: String,
    enum: ['draft', 'generated', 'archived'],
    default: 'draft',
  })
  public status = 'draft';

  @Prop({ type: [ReportShareSchema], default: [] })
  public shares: ReportShare[] = [];

  @Prop({ type: ReportScheduleSchema })
  public schedule: ReportSchedule | undefined;

  @Prop({ type: Date })
  public generatedAt: Date | undefined;

  @Prop({ type: Date })
  public expiresAt: Date | undefined;

  @Prop({ type: String })
  public generatedBy = '';

  @Prop({ type: Date, default: Date.now })
  public createdAt: Date = new Date();

  @Prop({ type: Date, default: Date.now })
  public updatedAt: Date = new Date();
}

export const GeneratedReportSchema =
  SchemaFactory.createForClass(GeneratedReport);

// Create indexes for better query performance
ReportTemplateSchema.index({ type: 1, isActive: 1 });
ReportTemplateSchema.index({ createdBy: 1 });
ReportTemplateSchema.index({ createdAt: -1 });

GeneratedReportSchema.index({ reportId: 1 });
GeneratedReportSchema.index({ templateId: 1 });
GeneratedReportSchema.index({ jobId: 1 });
GeneratedReportSchema.index({ resumeId: 1 });
GeneratedReportSchema.index({ analysisId: 1 });
GeneratedReportSchema.index({ type: 1, status: 1 });
GeneratedReportSchema.index({ generatedBy: 1 });
GeneratedReportSchema.index({ status: 1 });
GeneratedReportSchema.index({ createdAt: -1 });
GeneratedReportSchema.index({ expiresAt: 1 });
GeneratedReportSchema.index({ 'shares.sharedWith': 1 });
GeneratedReportSchema.index({
  'schedule.isActive': 1,
  'schedule.nextRunAt': 1,
});
