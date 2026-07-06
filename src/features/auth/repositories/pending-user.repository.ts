import {
  PendingUser,
  PendingUserDocument,
} from "@/models/PendingUser";

export class PendingUserRepository {
  async findByEmail(email: string) {
    return PendingUser.findOne({ email }).lean<PendingUserDocument | null>();
  }

  async findByTokenHash(tokenHash: string) {
    return PendingUser.findOne({
      verificationTokenHash: tokenHash,
    }).lean<PendingUserDocument | null>();
  }

  async create(data: {
    username: string;
    email: string;
    passwordHash: string;
    verificationTokenHash: string;
    expiresAt: Date;
  }) {
    return PendingUser.create(data);
  }

  async updateVerification(data: {
    email: string;
    verificationTokenHash: string;
    expiresAt: Date;
  }) {
    return PendingUser.findOneAndUpdate(
      { email: data.email },
      {
        verificationTokenHash: data.verificationTokenHash,
        expiresAt: data.expiresAt,
      },
      {
        new: true,
      }
    );
  }

  async deleteByEmail(email: string) {
    return PendingUser.deleteOne({ email });
  }
}

export const pendingUserRepository =
  new PendingUserRepository();