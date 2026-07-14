import { RateLimit } from "@/models/RateLimit";
import { ipBanService } from "./ip-ban.service";

export interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
  blockMinutes: number;
}

async function checkAndTriggerIpBan(key: string) {
  // Extract IP if key contains :ip:
  const parts = key.split(":");
  const ipIndex = parts.indexOf("ip");
  if (ipIndex !== -1 && parts[ipIndex + 1]) {
    const ip = parts[ipIndex + 1];
    await ipBanService.banIp(
      ip,
      "Automated ban: 3 consecutive rate limit lockouts reached.",
      7 // 7 days ban
    );
  }
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
    const record = await RateLimit.findOne({ key });
    
    // Check if already blocked in current active window
    const wasBlocked = record ? (record.blockedUntil && record.blockedUntil > now) : false;

    if (!record) {
      const expiresAt = new Date(
        now.getTime() + config.windowMinutes * 60 * 1000
      );
      const isBlocked = 1 >= config.maxAttempts;
      const blockedUntil = isBlocked
        ? new Date(now.getTime() + config.blockMinutes * 60 * 1000)
        : null;
      const blockCount = isBlocked ? 1 : 0;

      await RateLimit.create({
        key,
        attempts: 1,
        blockedUntil,
        blockCount,
        expiresAt: blockedUntil ? new Date(blockedUntil.getTime() + 60 * 1000) : expiresAt,
      });

      if (isBlocked && blockCount >= 3) {
        await checkAndTriggerIpBan(key);
      }
      return;
    }

    // If the previous window had expired, reset attempts and block status
    if (record.expiresAt < now) {
      record.attempts = 1;
      record.blockedUntil = null;
      (record as any).blockCount = 0;
      record.expiresAt = new Date(
        now.getTime() + config.windowMinutes * 60 * 1000
      );
    } else {
      record.attempts += 1;
    }

    const isNowBlocked = record.attempts >= config.maxAttempts;

    if (isNowBlocked) {
      const blockedUntil = new Date(
        now.getTime() + config.blockMinutes * 60 * 1000
      );
      record.blockedUntil = blockedUntil;
      record.expiresAt = new Date(blockedUntil.getTime() + 60 * 1000);

      // Increment blockCount if transitioning to a blocked state for the first time in this window
      if (!wasBlocked) {
        const currentBlockCount = (record as any).blockCount || 0;
        (record as any).blockCount = currentBlockCount + 1;
      }
    }

    await record.save();

    // Check if we need to escalate to IP ban
    if (isNowBlocked && (record as any).blockCount >= 3) {
      await checkAndTriggerIpBan(key);
    }
  }

  /**
   * Resets the rate limit for a key (typically upon successful login).
   */
  async reset(key: string): Promise<void> {
    await RateLimit.deleteOne({ key });
  }
}

export const rateLimitService = new RateLimitService();
