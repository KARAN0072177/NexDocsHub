import argon2 from "argon2";

import { AUTH_CONFIG } from "@/config/auth";
import { registerSchema } from "@/features/auth/schemas";
import type { RegisterDTO } from "@/features/auth/types";
import type { ServiceResult } from "@/types/service-result";

import { userRepository } from "../repositories/user.repository";
import { pendingUserRepository } from "../repositories/pending-user.repository";
import { generateVerificationToken } from "../utils/generate-token";
import { hashToken } from "../utils/hash-token";
import { sendVerificationEmail } from "../emails/send-verification-email";

class RegisterService {
  async register(
    input: RegisterDTO
  ): Promise<ServiceResult<{ email: string }>> {
    const validation = registerSchema.safeParse(input);

if (!validation.success) {
  return {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Please correct the highlighted fields.",
      fieldErrors: validation.error.flatten().fieldErrors,
    },
  } as ServiceResult<{ email: string }>;
}

    const { username, email, password } = validation.data;

    const existingUserByEmail = await userRepository.findByEmail(email);

    if (existingUserByEmail) {
      return {
        success: false,
        error: {
          code: "EMAIL_ALREADY_EXISTS",
          message: "An account with this email already exists.",
        },
      };
    }

    const existingUserByUsername =
      await userRepository.findByUsername(username);

    if (existingUserByUsername) {
      return {
        success: false,
        error: {
          code: "USERNAME_ALREADY_EXISTS",
          message: "Username is already taken.",
        },
      };
    }

    const passwordHash = await argon2.hash(password);

    const verificationToken = generateVerificationToken();

    const verificationTokenHash =
      hashToken(verificationToken);

    const expiresAt = new Date(
      Date.now() +
        AUTH_CONFIG.VERIFICATION.EXPIRY_MINUTES *
          60 *
          1000
    );

    const existingPendingUser =
      await pendingUserRepository.findByEmail(email);

    if (existingPendingUser) {
      await pendingUserRepository.replaceVerificationToken(
        email,
        verificationTokenHash,
        expiresAt
      );
    } else {
      await pendingUserRepository.create({
        username,
        email,
        passwordHash,
        verificationTokenHash,
        expiresAt,
      });
    }

    await sendVerificationEmail({
      email,
      username,
      verificationToken,
    });

    return {
      success: true,
      data: {
        email,
      },
    };
  }
}

export const registerService = new RegisterService();