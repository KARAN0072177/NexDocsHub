import { Schema, model, models, InferSchemaType } from "mongoose";

const PasswordResetOTPSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true, // Only one active reset process per email at any time
      trim: true,
      lowercase: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    cooldownUntil: {
      type: Date,
      default: null,
    },
    verified: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

PasswordResetOTPSchema.index({ email: 1 });

// TTL index to automatically clear expired sessions
PasswordResetOTPSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
  }
);

export type PasswordResetOTPDocument = InferSchemaType<
  typeof PasswordResetOTPSchema
>;

export const PasswordResetOTP =
  models.PasswordResetOTP ||
  model("PasswordResetOTP", PasswordResetOTPSchema);
