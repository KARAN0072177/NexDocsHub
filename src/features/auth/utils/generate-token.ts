import crypto from "crypto";

export function generateVerificationToken(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}