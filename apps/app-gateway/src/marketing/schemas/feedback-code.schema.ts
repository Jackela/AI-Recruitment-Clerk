import { Schema } from 'mongoose';

export const FeedbackCodeSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true,
    },
    usedAt: {
      type: Date,
      index: true,
    },
    alipayAccount: {
      type: String,
      trim: true,
    },
    questionnaireData: {
      type: Schema.Types.Mixed,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'rejected'],
      default: 'pending',
      index: true,
    },
    qualityScore: {
      type: Number,
      min: 1,
      max: 5,
    },
    paymentAmount: {
      type: Number,
      default: 3.0,
    },
    createdBy: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    sessionId: {
      type: String,
      index: true,
    },
    paymentProcessedAt: {
      type: Date,
    },
    paymentNote: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'feedback_codes',
  },
);

// 复合索引用于查询优化
FeedbackCodeSchema.index({ isUsed: 1, paymentStatus: 1 });
FeedbackCodeSchema.index({ generatedAt: -1 });
FeedbackCodeSchema.index({ usedAt: -1 });

// 自动清理索引：30天后删除未使用的反馈码
FeedbackCodeSchema.index(
  { generatedAt: 1 },
  {
    expireAfterSeconds: 30 * 24 * 60 * 60, // 30天
    partialFilterExpression: { isUsed: false },
  },
);
