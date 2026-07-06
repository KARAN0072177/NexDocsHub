import { z } from "zod";

import { AUTH_CONFIG } from "@/config/auth";

export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(
        AUTH_CONFIG.USERNAME.MIN_LENGTH,
        `Username must be at least ${AUTH_CONFIG.USERNAME.MIN_LENGTH} characters.`
      )
      .max(
        AUTH_CONFIG.USERNAME.MAX_LENGTH,
        `Username cannot exceed ${AUTH_CONFIG.USERNAME.MAX_LENGTH} characters.`
      )
      .regex(
        AUTH_CONFIG.USERNAME.REGEX,
        "Username can only contain letters, numbers and underscores."
      ),

    email: z
      .email("Please enter a valid email address.")
      .trim()
      .toLowerCase(),

    password: z
      .string()
      .min(
        AUTH_CONFIG.PASSWORD.MIN_LENGTH,
        `Password must be at least ${AUTH_CONFIG.PASSWORD.MIN_LENGTH} characters.`
      )
      .max(
        AUTH_CONFIG.PASSWORD.MAX_LENGTH,
        `Password cannot exceed ${AUTH_CONFIG.PASSWORD.MAX_LENGTH} characters.`
      )
      .regex(
        AUTH_CONFIG.PASSWORD.REGEX,
        "Password must contain at least one uppercase letter, one lowercase letter and one number."
      ),

    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterSchema = z.infer<typeof registerSchema>;