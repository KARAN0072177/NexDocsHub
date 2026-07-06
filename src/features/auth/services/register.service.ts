import crypto from "node:crypto";

import bcrypt from "bcryptjs";

import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { registerSchema } from "@/features/auth/schemas/register.schema";
import { sendVerificationEmail } from "@/features/auth/services/sendVerificationEmail";

interface RegisterUserInput {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface RegisterResult {
  success: boolean;
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

export async function registerUser(
  input: RegisterUserInput
): Promise<RegisterResult> {
  const validation = registerSchema.safeParse(input);

  if (!validation.success) {
    return {
      success: false,
      status: 400,
      message: "Validation failed.",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  await connectToDatabase();

  const { username, email, password } = validation.data;

  // Prevent duplicate username
  const existingUsername = await User.findOne({ username });

  if (existingUsername) {
    return {
      success: false,
      status: 409,
      message: "Username already exists.",
    };
  }

  // Prevent duplicate email
  const existingEmail = await User.findOne({ email });

  if (existingEmail) {
    return {
      success: false,
      status: 409,
      message: "Email already exists.",
    };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  // Generate secure verification token
  const verificationToken = crypto.randomBytes(32).toString("hex");

  // Store only the hash
  const hashedVerificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

  await User.create({
    username,
    email,
    password: hashedPassword,
    verified: false,
    verificationToken: hashedVerificationToken,
    verificationTokenExpiresAt: expiresAt,
  });

  await sendVerificationEmail({
    username,
    email,
    token: verificationToken,
  });

  return {
    success: true,
    status: 201,
    message:
      "Registration successful. Please check your email to verify your account.",
  };
}