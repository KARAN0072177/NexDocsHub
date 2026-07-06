import { Schema, model, models, InferSchemaType } from "mongoose";

const PendingUserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    verificationTokenHash: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

PendingUserSchema.index({ email: 1 });
PendingUserSchema.index({ verificationTokenHash: 1 });

PendingUserSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
  }
);

export type PendingUserDocument = InferSchemaType<typeof PendingUserSchema>;

export const PendingUser =
  models.PendingUser ||
  model("PendingUser", PendingUserSchema);