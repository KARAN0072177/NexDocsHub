import { Schema, model, models, InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: 3,
      maxlength: 30,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    emailVerified: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });

export type UserDocument = InferSchemaType<typeof UserSchema>;

export const User =
  models.User || model("User", UserSchema);