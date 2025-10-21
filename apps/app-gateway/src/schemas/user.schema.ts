import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  UserRole,
  UserStatus,
} from '@ai-recruitment-clerk/user-management-domain';

export type UserDocument = User & Document;

/**
 * Represents the user.
 */
@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true })
  id: string = '';

  @Prop({ required: true, unique: true, lowercase: true })
  email: string = '';

  @Prop({ required: true })
  password: string = '';

  @Prop({ required: false, default: '' })
  firstName: string = '';

  @Prop({ required: false, default: '' })
  lastName: string = '';

  @Prop({
    type: String,
    required: true,
    enum: Object.values(UserRole),
    default: UserRole.USER,
  })
  role: UserRole = UserRole.USER;

  @Prop()
  organizationId?: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(UserStatus),
    default: UserStatus.ACTIVE,
  })
  status: UserStatus = UserStatus.ACTIVE;

  @Prop()
  lastActivity?: Date;

  @Prop({
    type: {
      tokens_revoked: { type: Boolean },
      account_locked: { type: Boolean },
      password_reset_required: { type: Boolean },
      two_factor_enabled: { type: Boolean },
    },
    default: {},
    _id: false,
  })
  securityFlags: {
    tokens_revoked?: boolean;
    account_locked?: boolean;
    password_reset_required?: boolean;
    two_factor_enabled?: boolean;
  } = {};

  @Prop({
    type: {
      language: { type: String, default: 'en' },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: false },
        sms: { type: Boolean, default: false },
      },
    },
    default: {
      language: 'en',
      notifications: {
        email: true,
        push: false,
        sms: false,
      },
    },
    _id: false,
  })
  preferences: {
    language?: string;
    notifications?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
    };
  } = {
    language: 'en',
    notifications: {
      email: true,
      push: false,
      sms: false,
    },
  };

  @Prop({ type: Date })
  createdAt: Date = new Date();

  @Prop({ type: Date })
  updatedAt: Date = new Date();
}

export const UserSchema = SchemaFactory.createForClass(User);

// Create indexes for better performance
UserSchema.index({ id: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ organizationId: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ createdAt: -1 });
