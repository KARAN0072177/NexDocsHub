import argon2 from "argon2";
import crypto from "crypto";

import { PasswordResetOTP } from "@/models/PasswordResetOTP";
import { userRepository } from "../repositories/user.repository";
import { sendResetOTPEmail } from "../emails/send-reset-otp-email";
import { hashToken } from "../utils/hash-token";
import type { ServiceResult } from "../types/service-result";

const RESET_LIMIT_CONFIG = {
  maxAttempts: 3,
  windowMinutes: 10,
  blockMinutes: 15,
};

export function censorEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${
    local[0]
  }${"*".repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

class ForgotPasswordService {
  /**
   * Starts forgot password flow.
   * Resolves email from username/email, generates 6-digit OTP, delivers code via Resend.
   * Handles user enumeration by displaying mock successful states for non-existent users.
   */
  async requestReset(
    identifier: string
  ): Promise<ServiceResult<{ email: string; censoredEmail: string }>> {
    const trimmed = identifier.trim();
    let user = null;

    if (trimmed.includes("@")) {
      user = await userRepository.findByEmail(trimmed);
    } else {
      user = await userRepository.findByUsername(trimmed);
    }

    // Anti-Enumeration: If user is not found, mock a successful dispatch to prevent timing leak
    if (!user) {
      // Simulate random latency & hashing cost
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockEmail = trimmed.includes("@")
        ? trimmed.toLowerCase()
        : `${trimmed.toLowerCase()}@example.com`;

      return {
        success: true,
        data: {
          email: mockEmail,
          censoredEmail: censorEmail(mockEmail),
        },
      };
    }

    const email = user.email;

    // Check cooldown to prevent email flooding
    const existing = await PasswordResetOTP.findOne({ email });
    const now = new Date();
    if (existing && existing.cooldownUntil && existing.cooldownUntil > now) {
      return {
        success: false,
        error: {
          code: "COOLDOWN_ACTIVE",
          message: "Please wait 60 seconds before requesting another code.",
        },
      };
    }

    // Generate secure 6-digit verification code
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = hashToken(otp);
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes
    const cooldownUntil = new Date(now.getTime() + 60 * 1000); // 60s cooldown

    if (existing) {
      existing.otpHash = otpHash;
      existing.attempts = 0;
      existing.expiresAt = expiresAt;
      existing.cooldownUntil = cooldownUntil;
      existing.verified = false;
      await existing.save();
    } else {
      await PasswordResetOTP.create({
        email,
        otpHash,
        attempts: 0,
        expiresAt,
        cooldownUntil,
        verified: false,
      });
    }

    // Send reset OTP email via Resend
    await sendResetOTPEmail({
      email,
      username: user.username,
      otpCode: otp,
    });

    return {
      success: true,
      data: {
        email,
        censoredEmail: censorEmail(email),
      },
    };
  }

  /**
   * Resends OTP to the email.
   * If there is no active session, it returns a mock success response to avoid leakage.
   */
  async resendOTP(email: string): Promise<ServiceResult<null>> {
    const session = await PasswordResetOTP.findOne({ email });
    const now = new Date();

    if (!session) {
      // Mock success for non-existent session to hide details
      return {
        success: true,
        data: null,
      };
    }

    if (session.cooldownUntil && session.cooldownUntil > now) {
      return {
        success: false,
        error: {
          code: "COOLDOWN_ACTIVE",
          message: "Please wait 60 seconds before requesting another code.",
        },
      };
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = hashToken(otp);

    session.otpHash = otpHash;
    session.attempts = 0;
    session.expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    session.cooldownUntil = new Date(now.getTime() + 60 * 1000);
    session.verified = false;
    await session.save();

    const user = await userRepository.findByEmail(email);
    const username = user?.username ?? "User";

    await sendResetOTPEmail({
      email,
      username,
      otpCode: otp,
    });

    return {
      success: true,
      data: null,
    };
  }

  /**
   * Verifies the OTP entered by the user.
   * Tracks wrong guesses (maximum 3, lock out / delete session if exceeded).
   */
  async verifyOTP(email: string, otp: string): Promise<ServiceResult<null>> {
    const session = await PasswordResetOTP.findOne({ email });
    const now = new Date();

    if (!session || session.expiresAt < now) {
      return {
        success: false,
        error: {
          code: "SESSION_EXPIRED",
          message: "Verification session expired. Please start over.",
        },
      };
    }

    if (session.attempts >= RESET_LIMIT_CONFIG.maxAttempts) {
      await PasswordResetOTP.deleteOne({ email });
      return {
        success: false,
        error: {
          code: "TOO_MANY_ATTEMPTS",
          message:
            "Too many incorrect attempts. Reset session has been closed. Please start over.",
        },
      };
    }

    const inputHash = hashToken(otp);

    if (session.otpHash !== inputHash) {
      session.attempts += 1;

      if (session.attempts >= RESET_LIMIT_CONFIG.maxAttempts) {
        await PasswordResetOTP.deleteOne({ email });
        return {
          success: false,
          error: {
            code: "TOO_MANY_ATTEMPTS",
            message:
              "Too many incorrect attempts. Reset session has been closed. Please start over.",
          },
        };
      }

      await session.save();

      const remaining = RESET_LIMIT_CONFIG.maxAttempts - session.attempts;
      return {
        success: false,
        error: {
          code: "INVALID_OTP",
          message: `Invalid verification code. You have ${remaining} ${
            remaining === 1 ? "attempt" : "attempts"
          } remaining.`,
        },
      };
    }

    // Success: Mark verified and extend validity for 5 minutes to submit new password
    session.verified = true;
    session.expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
    await session.save();

    return {
      success: true,
      data: null,
    };
  }

  /**
   * Finalizes the password reset.
   * Validates verification state and checks password history (cannot reuse current password).
   */
  async resetPassword(
    email: string,
    newPassword: string
  ): Promise<ServiceResult<null>> {
    const session = await PasswordResetOTP.findOne({ email });
    const now = new Date();

    if (!session || !session.verified || session.expiresAt < now) {
      return {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Session is invalid or expired. Please start over.",
        },
      };
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      return {
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User account could not be found.",
        },
      };
    }

    // History Validation: Ensure it does not match current password
    const isSamePassword = await argon2
      .verify(user.passwordHash, newPassword)
      .catch(() => false);

    if (isSamePassword) {
      return {
        success: false,
        error: {
          code: "PASSWORD_REUSE",
          message: "Your new password must be different from your current password.",
        },
      };
    }

    // Hash and update the password
    const passwordHash = await argon2.hash(newPassword);
    await userRepository.updatePassword(email, passwordHash);

    // Delete reset session
    await PasswordResetOTP.deleteOne({ email });

    return {
      success: true,
      data: null,
    };
  }
}

export const forgotPasswordService = new ForgotPasswordService();
