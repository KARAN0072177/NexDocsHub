import type { ServiceResult } from "@/types/service-result";

import { pendingUserRepository } from "../repositories/pending-user.repository";
import { userRepository } from "../repositories/user.repository";
import { hashToken } from "../utils/hash-token";

class VerifyEmailService {
  async verify(
    token: string
  ): Promise<ServiceResult<null>> {
    const tokenHash = hashToken(token);

    const pendingUser =
      await pendingUserRepository.findByTokenHash(tokenHash);

    if (!pendingUser) {
      return {
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Verification link is invalid.",
        },
      };
    }

    if (pendingUser.expiresAt < new Date()) {
      await pendingUserRepository.deleteByEmail(
        pendingUser.email
      );

      return {
        success: false,
        error: {
          code: "TOKEN_EXPIRED",
          message: "Verification link has expired.",
        },
      };
    }

    await userRepository.create({
      username: pendingUser.username,
      email: pendingUser.email,
      passwordHash: pendingUser.passwordHash,
    });

    await pendingUserRepository.deleteByEmail(
      pendingUser.email
    );

    return {
      success: true,
      data: null,
    };
  }
}

export const verifyEmailService =
  new VerifyEmailService();