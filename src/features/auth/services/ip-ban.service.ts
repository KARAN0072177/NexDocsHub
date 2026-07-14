import { IpBan } from "@/models/IpBan";

class IpBanService {
  /**
   * Checks if an IP is currently banned.
   */
  async isBanned(ip: string): Promise<boolean> {
    if (!ip) return false;
    const now = new Date();
    const record = await IpBan.findOne({ ipAddress: ip });

    if (!record) {
      return false;
    }

    // Programmatically check if temporary ban expired to prevent DB TTL sync delay issues
    if (record.expiresAt && record.expiresAt < now) {
      return false;
    }

    return true;
  }

  /**
   * Bans an IP address (optionally for a temporary duration in days, otherwise permanently).
   */
  async banIp(
    ip: string,
    reason: string,
    durationDays?: number
  ): Promise<void> {
    if (!ip) return;

    const expiresAt = durationDays
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : null;

    await IpBan.findOneAndUpdate(
      { ipAddress: ip },
      {
        ipAddress: ip,
        reason,
        expiresAt,
        bannedAt: new Date(),
      },
      { upsert: true, new: true }
    );
  }

  /**
   * Lifts a ban for an IP address.
   */
  async liftBan(ip: string): Promise<void> {
    if (!ip) return;
    await IpBan.deleteOne({ ipAddress: ip });
  }
}

export const ipBanService = new IpBanService();
