import { Schema, model, models, InferSchemaType, Types } from "mongoose";

const CategorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

CategorySchema.index({ userId: 1 });
CategorySchema.index({ workspaceId: 1 });

export type CategoryDocument = InferSchemaType<typeof CategorySchema> & {
  _id: Types.ObjectId;
};

export const Category =
  models.Category || model("Category", CategorySchema);
