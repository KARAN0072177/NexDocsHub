export interface RegisterDTO {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface CreatePendingUserDTO {
  username: string;
  email: string;
  passwordHash: string;
  verificationTokenHash: string;
  expiresAt: Date;
}

export interface CreateUserDTO {
  username: string;
  email: string;
  passwordHash: string;
}