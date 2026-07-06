import { z } from "zod";

export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters.")
      .max(30, "Username cannot exceed 30 characters."),

    email: z
      .string()
      .trim()
      .email("Please enter a valid email address.")
      .toLowerCase(),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(100, "Password is too long."),

    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterSchema = z.infer<typeof registerSchema>;