import { Schema, model, models, InferSchemaType } from "mongoose";

const SessionSchema = new Schema(
  {
    sessionToken: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

SessionSchema.index({ sessionToken: 1 });

// TTL index to automatically clean up expired sessions
SessionSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
  }
);

export type SessionDocument = InferSchemaType<typeof SessionSchema>;

export const Session =
  models.Session || model("Session", SessionSchema);
