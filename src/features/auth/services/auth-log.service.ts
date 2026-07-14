import { AuthLog } from "@/models/AuthLog";

class AuthLogService {
  async logAction(params: {
    action: "login" | "logout" | "register" | "login_failed" | "register_failed";
    email?: string;
    ipAddress: string;
    status: "success" | "failed";
    reason?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await AuthLog.create({
        action: params.action,
        email: params.email ? params.email.toLowerCase().trim() : "",
        ipAddress: params.ipAddress || "127.0.0.1",
        userAgent: params.userAgent || "",
        status: params.status,
        reason: params.reason || "",
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Failed to write auth log:", error);
    }
  }
}

export const authLogService = new AuthLogService();
