import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Please enter a valid email address.")
    .toLowerCase(),
  password: z
    .string()
    .min(1, "Password is required."),
});

export type LoginSchema = z.infer<typeof loginSchema>;
