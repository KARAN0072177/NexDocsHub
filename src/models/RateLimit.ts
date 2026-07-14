import { Schema, model, models, InferSchemaType } from "mongoose";

const RateLimitSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
    },
    blockedUntil: {
      type: Date,
      default: null,
    },
    blockCount: {
      type: Number,
      default: 0,
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

RateLimitSchema.index({ key: 1 });

// TTL index to automatically clean up expired rate limits or block lists
RateLimitSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
  }
);

export type RateLimitDocument = InferSchemaType<typeof RateLimitSchema>;

export const RateLimit =
  models.RateLimit || model("RateLimit", RateLimitSchema);
