import { z } from "zod";

import { AUTH_CONFIG } from "@/config/auth";

export const forgotPasswordRequestSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Please enter your email or username."),
});

export const forgotPasswordVerifySchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .toLowerCase(),
  otp: z
    .string()
    .trim()
    .length(6, "OTP must be exactly 6 digits.")
    .regex(/^\d+$/, "OTP must only contain numbers."),
});

export const forgotPasswordResetSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email("Please enter a valid email address.")
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
        "Password must contain at least one uppercase letter, one lowercase letter, and one number."
      ),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type ForgotPasswordRequestSchema = z.infer<
  typeof forgotPasswordRequestSchema
>;
export type ForgotPasswordVerifySchema = z.infer<
  typeof forgotPasswordVerifySchema
>;
export type ForgotPasswordResetSchema = z.infer<
  typeof forgotPasswordResetSchema
>;
