import { User, UserDocument } from "@/models/User";
import { CreateUserDTO } from "../types";

export class UserRepository {
    async findByEmail(email: string) {
        return User.findOne({ email }).lean<UserDocument | null>();
    }

    async findByUsername(username: string) {
        return User.findOne({ username }).lean<UserDocument | null>();
    }

    async create(data: CreateUserDTO) {
        const user = await User.create(data);

        return user.toObject();
    }

    async updatePassword(email: string, passwordHash: string) {
        return User.updateOne({ email }, { passwordHash });
    }
}

export const userRepository = new UserRepository();