import { User, UserDocument } from "@/models/User";

export class UserRepository {
  async findByEmail(email: string) {
    return User.findOne({ email }).lean<UserDocument | null>();
  }

  async findByUsername(username: string) {
    return User.findOne({ username }).lean<UserDocument | null>();
  }

  async create(data: {
    username: string;
    email: string;
    passwordHash: string;
  }) {
    return User.create(data);
  }
}

export const userRepository = new UserRepository();