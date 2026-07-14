import { Schema, model, models, InferSchemaType } from "mongoose";

const AuthLogSchema = new Schema(
  {
    action: {
      type: String,
      required: true,
      enum: ["login", "logout", "register", "login_failed", "register_failed"],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },
    ipAddress: {
      type: String,
      required: true,
      trim: true,
    },
    userAgent: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      required: true,
      enum: ["success", "failed"],
    },
    reason: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

AuthLogSchema.index({ timestamp: -1 });
AuthLogSchema.index({ action: 1 });
AuthLogSchema.index({ ipAddress: 1 });

export type AuthLogDocument = InferSchemaType<typeof AuthLogSchema>;

export const AuthLog = models.AuthLog || model("AuthLog", AuthLogSchema);
