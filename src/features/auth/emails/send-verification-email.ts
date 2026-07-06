import { render } from "@react-email/render";

import { resend } from "@/lib/resend";

import { VerifyEmail } from "../templates/verify-email";

import { APP_CONFIG } from "@/config/app";

interface SendVerificationEmailParams {
  email: string;
  username: string;
  verificationToken: string;
}

export async function sendVerificationEmail({
  email,
  username,
  verificationToken,
}: SendVerificationEmailParams) {
  const verificationUrl =
  `${APP_CONFIG.URL}/api/auth/verify-email?token=${verificationToken}`;

  const html = await render(
    VerifyEmail({
      username,
      verificationUrl,
    })
  );

  await resend.emails.send({
    from: process.env.RESEND_FROM!,
    to: email,
    subject: "Verify your NexDocsHub account",
    html,
  });
}