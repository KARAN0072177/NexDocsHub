export const APP_CONFIG = {
  NAME: "NexDocsHub",

  URL:
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000",
} as const;