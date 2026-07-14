import argon2 from "argon2";
import crypto from "crypto";

import { loginSchema, type LoginSchema } from "../schemas/login.schema";
import { userRepository } from "../repositories/user.repository";
import { rateLimitService } from "./rate-limit.service";
import { Session } from "@/models/Session";
import type { ServiceResult } from "@/features/auth/types/service-result";

// 10 attempts per 10 minutes, block for 15 minutes
const IP_LIMIT_CONFIG = {
  maxAttempts: 10,
  windowMinutes: 10,
  blockMinutes: 15,
};

// 5 attempts per 10 minutes, block for 15 minutes
const EMAIL_LIMIT_CONFIG = {
  maxAttempts: 5,
  windowMinutes: 10,
  blockMinutes: 15,
};

// Formatted placeholder hash to prevent timing attacks.
// Must be a valid Argon2 formatting signature so argon2.verify does not crash,
// but it is cryptographically impossible to match.
const DUMMY_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$vT1FmZE5nQ3d4SjhkYWlh$Kmx3NDVnMzQ5N2RmZ2g1NDk=";

class LoginService {
  async login(
    input: LoginSchema,
    ip: string,
    userAgent?: string
  ): Promise<ServiceResult<{ sessionToken: string }>> {
    const validation = loginSchema.safeParse(input);

    if (!validation.success) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please correct the highlighted fields.",
          fieldErrors: validation.error.flatten().fieldErrors,
        },
      };
    }

    const { email, password } = validation.data;

    const ipKey = `rate-limit:login:ip:${ip}`;
    const emailKey = `rate-limit:login:email:${email}`;

    // 1. Evaluate rate limits
    const ipLimit = await rateLimitService.evaluate(
      ipKey,
      IP_LIMIT_CONFIG
    );
    const emailLimit = await rateLimitService.evaluate(
      emailKey,
      EMAIL_LIMIT_CONFIG
    );

    if (!ipLimit.allowed || !emailLimit.allowed) {
      return {
        success: false,
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Too many login attempts. Please try again later.",
        },
      };
    }

    // 2. Look up the user
    const user = await userRepository.findByEmail(email);

    // 3. Handle non-existent user (Timing Attack Mitigation)
    if (!user) {
      // Run dummy argon2 verify to keep response times identical
      await argon2.verify(DUMMY_HASH, password).catch(() => false);

      // Record failures
      await rateLimitService.recordFailure(ipKey, IP_LIMIT_CONFIG);
      await rateLimitService.recordFailure(
        emailKey,
        EMAIL_LIMIT_CONFIG
      );

      return {
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        },
      };
    }

    // 4. Check if email is verified
    if (user.emailVerified === false) {
      return {
        success: false,
        error: {
          code: "EMAIL_NOT_VERIFIED",
          message: "Please verify your email.",
        },
      };
    }

    // 5. Verify password
    const isPasswordValid = await argon2
      .verify(user.passwordHash, password)
      .catch(() => false);

    if (!isPasswordValid) {
      // Record failures
      await rateLimitService.recordFailure(ipKey, IP_LIMIT_CONFIG);
      await rateLimitService.recordFailure(
        emailKey,
        EMAIL_LIMIT_CONFIG
      );

      return {
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        },
      };
    }

    // 6. Success: Reset rate limits for this specific request
    await rateLimitService.reset(ipKey);
    await rateLimitService.reset(emailKey);

    // 7. Create Session
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await Session.create({
      sessionToken,
      userId: user._id,
      expiresAt,
      ipAddress: ip,
      userAgent,
    });

    return {
      success: true,
      data: {
        sessionToken,
      },
    };
  }
}

export const loginService = new LoginService();
