import { RateLimit } from "@/models/RateLimit";

export interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
  blockMinutes: number;
}

class RateLimitService {
  /**
   * Checks if a key is currently blocked.
   * Does NOT modify any state in the database.
   */
  async evaluate(
    key: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; blockedUntil: Date | null }> {
    const now = new Date();
    const record = await RateLimit.findOne({ key });

    if (!record) {
      return { allowed: true, blockedUntil: null };
    }

    // Check if currently blocked
    if (record.blockedUntil && record.blockedUntil > now) {
      return { allowed: false, blockedUntil: record.blockedUntil };
    }

    // If the window has expired, they are allowed
    if (record.expiresAt < now) {
      return { allowed: true, blockedUntil: null };
    }

    // Check if they reached max attempts but somehow blockedUntil wasn't set or checked
    if (record.attempts >= config.maxAttempts) {
      return {
        allowed: false,
        blockedUntil:
          record.blockedUntil ??
          new Date(now.getTime() + config.blockMinutes * 60 * 1000),
      };
    }

    return { allowed: true, blockedUntil: null };
  }

  /**
   * Records a failure attempt for a key.
   * Increments attempts, sets block date if limit is reached, and updates window expiry.
   */
  async recordFailure(
    key: string,
    config: RateLimitConfig
  ): Promise<void> {
    const now = new Date();
    let record = await RateLimit.findOne({ key });

    if (!record) {
      const expiresAt = new Date(
        now.getTime() + config.windowMinutes * 60 * 1000
      );
      await RateLimit.create({
        key,
        attempts: 1,
        blockedUntil: null,
        expiresAt,
      });
      return;
    }

    // If the previous window had expired, reset attempts
    if (record.expiresAt < now) {
      record.attempts = 1;
      record.blockedUntil = null;
      record.expiresAt = new Date(
        now.getTime() + config.windowMinutes * 60 * 1000
      );
    } else {
      record.attempts += 1;
    }

    // If attempts exceed max attempts, block them
    if (record.attempts >= config.maxAttempts) {
      const blockedUntil = new Date(
        now.getTime() + config.blockMinutes * 60 * 1000
      );
      record.blockedUntil = blockedUntil;
      // Ensure the record isn't deleted by TTL index while blocked.
      // We extend the TTL index field (expiresAt) to 1 minute past block expiration.
      record.expiresAt = new Date(blockedUntil.getTime() + 60 * 1000);
    }

    await record.save();
  }

  /**
   * Resets the rate limit for a key (typically upon successful login).
   */
  async reset(key: string): Promise<void> {
    await RateLimit.deleteOne({ key });
  }
}

export const rateLimitService = new RateLimitService();
