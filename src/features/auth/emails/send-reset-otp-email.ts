import { render } from "@react-email/render";

import { resend } from "@/lib/resend";
import { ResetOTP } from "../templates/reset-otp";

interface SendResetOTPEmailParams {
  email: string;
  username: string;
  otpCode: string;
}

export async function sendResetOTPEmail({
  email,
  username,
  otpCode,
}: SendResetOTPEmailParams) {
  const html = await render(
    ResetOTP({
      username,
      otpCode,
    })
  );

  await resend.emails.send({
    from: process.env.RESEND_FROM!,
    to: email,
    subject: "Reset your NexDocsHub password",
    html,
  });
}
