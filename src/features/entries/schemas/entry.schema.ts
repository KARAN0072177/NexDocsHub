import { z } from "zod";

export const entrySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(100, "Title cannot exceed 100 characters."),
  content: z.string().default(""),
  type: z.enum(
    [
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
    {
      message: "Please select a valid entry type.",
    }
  ),
  tags: z
    .array(z.string().trim().toLowerCase())
    .default([]),
  attachments: z
    .array(
      z.object({
        name: z.string().min(1),
        url: z.string().url("Invalid attachment URL."),
        mimeType: z.string().min(1),
        size: z.number().nonnegative(),
      })
    )
    .default([]),
  categoryId: z.string().min(1, "Category is required."),
  customType: z
    .string()
    .trim()
    .max(30, "Custom type name cannot exceed 30 characters.")
    .optional(),
  format: z.enum(["note", "files"]).default("note"),
}).refine(
  (data) => {
    if (data.type === "custom" && (!data.customType || data.customType.trim() === "")) {
      return false;
    }
    return true;
  },
  {
    message: "Please specify your custom type name.",
    path: ["customType"],
  }
);

export type EntrySchema = z.infer<typeof entrySchema>;
