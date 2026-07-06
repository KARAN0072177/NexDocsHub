import {
    PendingUser,
    PendingUserDocument,
} from "@/models/PendingUser";

import { CreatePendingUserDTO } from "../types";

export class PendingUserRepository {
    async findByEmail(email: string) {
        return PendingUser.findOne({ email }).lean<PendingUserDocument | null>();
    }

    async findByTokenHash(tokenHash: string) {
        return PendingUser.findOne({
            verificationTokenHash: tokenHash,
        }).lean();
    }

    async create(data: CreatePendingUserDTO) {
        const pendingUser = await PendingUser.create(data);

        return pendingUser.toObject();
    }

    async replaceVerificationToken(
        email: string,
        verificationTokenHash: string,
        expiresAt: Date
    ) {
        const pendingUser = await PendingUser.findOneAndUpdate(
            { email },
            {
                verificationTokenHash,
                expiresAt,
            },
            {
                new: true,
            }
        );

        return pendingUser?.toObject() ?? null;
    }

    async deleteByEmail(email: string) {
        return PendingUser.deleteOne({ email });
    }
}

export const pendingUserRepository =
    new PendingUserRepository();