import { Schema, model, models, InferSchemaType } from "mongoose";

const IpBanSchema = new Schema(
  {
    ipAddress: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      default: "Suspicious activity / repeated authentication lockouts",
    },
    bannedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: null, // null means permanent ban
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

IpBanSchema.index({ ipAddress: 1 });

// TTL index to automatically clean up expired temporary bans
IpBanSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
  }
);

export type IpBanDocument = InferSchemaType<typeof IpBanSchema>;

export const IpBan = models.IpBan || model("IpBan", IpBanSchema);
