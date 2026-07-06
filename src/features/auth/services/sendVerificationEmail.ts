import resend from "@/lib/resend";

interface SendVerificationEmailParams {
  email: string;
  username: string;
  token: string;
}

export async function sendVerificationEmail({
  email,
  username,
  token,
}: SendVerificationEmailParams) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify?token=${token}`;

  await resend.emails.send({
    from: "NexDocsHub <onboarding@resend.dev>",
    to: email,
    subject: "Verify your NexDocsHub account",
    html: `
      <h2>Welcome, ${username}!</h2>

      <p>Click the button below to verify your account.</p>

      <p>
        <a href="${verificationUrl}">
          Verify Email
        </a>
      </p>

      <p>This link expires in 24 hours.</p>
    `,
  });
}