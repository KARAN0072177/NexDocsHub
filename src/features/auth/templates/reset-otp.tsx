import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface ResetOTPProps {
  username: string;
  otpCode: string;
}

export function ResetOTP({ username, otpCode }: ResetOTPProps) {
  return (
    <Html>
      <Head />

      <Preview>Reset your NexDocsHub password</Preview>

      <Body
        style={{
          backgroundColor: "#f5f5f5",
          fontFamily: "Arial, sans-serif",
          padding: "32px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "40px",
            maxWidth: "600px",
          }}
        >
          <Heading>Password Reset Request 🔑</Heading>

          <Text>Hello {username},</Text>

          <Text>
            We received a request to reset the password for your NexDocsHub
            account. Use the verification code below to proceed with
            changing your password:
          </Text>

          <Section
            style={{
              textAlign: "center",
              margin: "32px 0",
              backgroundColor: "#f9f9f9",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #eee",
            }}
          >
            <Text
              style={{
                fontSize: "36px",
                fontWeight: "bold",
                letterSpacing: "4px",
                margin: "0",
                color: "#2563eb",
              }}
            >
              {otpCode}
            </Text>
          </Section>

          <Text>
            This verification code is valid for <strong>10 minutes</strong>.
          </Text>

          <Text>
            If you did not request a password reset, you can safely ignore
            this email.
          </Text>

          <Text
            style={{
              color: "#888",
              fontSize: "12px",
              marginTop: "40px",
            }}
          >
            NexDocsHub • Your private knowledge workspace
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
