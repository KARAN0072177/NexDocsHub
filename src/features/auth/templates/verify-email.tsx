import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface VerifyEmailProps {
  username: string;
  verificationUrl: string;
}

export function VerifyEmail({
  username,
  verificationUrl,
}: VerifyEmailProps) {
  return (
    <Html>
      <Head />

      <Preview>Verify your NexDocsHub account</Preview>

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
          <Heading>Welcome to NexDocsHub 👋</Heading>

          <Text>Hello {username},</Text>

          <Text>
            Thanks for creating your NexDocsHub account.
            Please verify your email address to continue.
          </Text>

          <Section
            style={{
              textAlign: "center",
              margin: "32px 0",
            }}
          >
            <Button
              href={verificationUrl}
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                padding: "14px 24px",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              Verify Email
            </Button>
          </Section>

          <Text>
            This verification link expires in <strong>10 minutes</strong>.
          </Text>

          <Text>
            If you didn&lsquo;t create this account, you can safely ignore this email.
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