import { Schema, model, models, InferSchemaType, Types } from "mongoose";

const EntrySchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      required: true,
      enum: [
        "learning_day",
        "architecture_decision",
        "project_progress",
        "debugging_log",
        "research_note",
        "reference",
        "meeting_note",
        "documentation",
        "journal",
        "custom",
      ],
    },
    customType: {
      type: String,
      trim: true,
    },
    format: {
      type: String,
      enum: ["note", "files"],
      default: "note",
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
      },
    ],
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
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

EntrySchema.index({ userId: 1 });
EntrySchema.index({ categoryId: 1 });
EntrySchema.index({ workspaceId: 1 });
EntrySchema.index({ type: 1 });

EntrySchema.index(
  {
    title: "text",
    tags: "text",
    content: "text",
    "attachments.name": "text",
  },
  {
    weights: {
      title: 10,
      tags: 5,
      content: 2,
      "attachments.name": 1,
    },
    name: "EntryTextIndex",
  }
);

export type EntryDocument = InferSchemaType<typeof EntrySchema> & {
  _id: Types.ObjectId;
};

export const Entry = models.Entry || model("Entry", EntrySchema);
