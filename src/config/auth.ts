export const AUTH_CONFIG = {
  VERIFICATION: {
    EXPIRY_MINUTES: 10,
    TOKEN_BYTES: 32,
  },

  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    REGEX: /^[a-zA-Z0-9_]+$/,
  },

  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
  },
} as const;