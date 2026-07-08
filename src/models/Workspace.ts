import { Schema, model, models, InferSchemaType, Types } from "mongoose";

const WorkspaceSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

WorkspaceSchema.index({ userId: 1 });

export type WorkspaceDocument = InferSchemaType<typeof WorkspaceSchema> & {
  _id: Types.ObjectId;
};

export const Workspace =
  models.Workspace || model("Workspace", WorkspaceSchema);
